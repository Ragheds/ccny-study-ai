-- Apply in the Supabase SQL editor before deploying the Phase 0 tutor route.
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  reserved_tokens integer not null,
  cost_estimate_usd numeric(12, 6) not null default 0,
  status text not null default 'reserved' check (status in ('reserved', 'completed', 'failed')),
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_created_idx on public.ai_usage (user_id, created_at desc);
alter table public.ai_usage enable row level security;
create policy "Users read their AI usage" on public.ai_usage for select to authenticated
  using ((select auth.uid()) = user_id);

-- Only the server's service-role client can reserve or finish usage rows.
revoke insert, update, delete on public.ai_usage from anon, authenticated;

create or replace function public.reserve_tutor_usage(
  p_user_id uuid, p_feature text, p_model text, p_reserved_tokens integer,
  p_daily_token_cap integer, p_daily_request_cap integer, p_minute_request_cap integer
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_daily_count integer;
  v_daily_tokens bigint;
  v_minute_count integer;
begin
  if p_user_id is null or p_reserved_tokens < 1 or p_reserved_tokens > 8192
    or p_daily_token_cap < 1 or p_daily_request_cap < 1 or p_minute_request_cap < 1 then
    raise exception 'invalid quota request';
  end if;

  -- Serialize reservations for this user across server instances.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select count(*), coalesce(sum(reserved_tokens), 0)
    into v_daily_count, v_daily_tokens
    from public.ai_usage
    where user_id = p_user_id and created_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  select count(*) into v_minute_count from public.ai_usage
    where user_id = p_user_id and created_at >= now() - interval '1 minute';
  if v_daily_count >= p_daily_request_cap or v_daily_tokens + p_reserved_tokens > p_daily_token_cap
    or v_minute_count >= p_minute_request_cap then
    return null;
  end if;
  insert into public.ai_usage (user_id, feature, model, reserved_tokens)
    values (p_user_id, p_feature, p_model, p_reserved_tokens) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.reserve_tutor_usage(uuid, text, text, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_tutor_usage(uuid, text, text, integer, integer, integer, integer) to service_role;
