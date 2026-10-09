alter table public.subscriptions add column if not exists beta_until timestamptz;
alter table public.subscriptions add column if not exists period_end timestamptz;
alter table public.subscriptions add column if not exists provider_subscription_id text;
alter table public.subscriptions add column if not exists provider_event_created bigint not null default 0;
alter table public.ai_usage add column if not exists estimated_cost_usd numeric;
create table if not exists public.billing_events (id text primary key, created_at timestamptz not null default now());
create table if not exists public.study_invites (code_hash text primary key, expires_at timestamptz not null, max_uses integer not null check(max_uses between 1 and 50), uses integer not null default 0, pro_days integer not null default 90 check(pro_days between 1 and 365));
create table if not exists public.invite_redemptions (user_id uuid primary key references auth.users(id) on delete cascade, code_hash text references public.study_invites(code_hash), created_at timestamptz not null default now());
alter table public.billing_events enable row level security;
alter table public.study_invites enable row level security;
alter table public.invite_redemptions enable row level security;
revoke all on public.billing_events, public.study_invites, public.invite_redemptions from anon, authenticated;
create or replace function public.apply_test_subscription(p_event text,p_created bigint,p_user uuid,p_status text,p_customer text,p_subscription text,p_period timestamptz) returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 if exists(select 1 from public.billing_events where id=p_event) then return; end if;
 insert into public.subscriptions(user_id,plan,status,provider_customer_id,provider_subscription_id,period_end,provider_event_created)
 values(p_user,'pro',p_status,p_customer,p_subscription,p_period,p_created)
 on conflict(user_id) do update set plan='pro',status=excluded.status,provider_customer_id=excluded.provider_customer_id,provider_subscription_id=excluded.provider_subscription_id,period_end=excluded.period_end,provider_event_created=excluded.provider_event_created,updated_at=now()
 where public.subscriptions.provider_event_created <= p_created;
 insert into public.billing_events(id) values(p_event);
end; $$;
create or replace function public.redeem_study_invite(p_user uuid,p_hash text) returns boolean language plpgsql security definer set search_path='' as $$
declare v_days integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 if exists(select 1 from public.invite_redemptions where user_id=p_user) then return false; end if;
 update public.study_invites set uses=uses+1 where code_hash=p_hash and expires_at>now() and uses<max_uses returning pro_days into v_days;
 if v_days is null then return false; end if;
 insert into public.invite_redemptions(user_id,code_hash) values(p_user,p_hash);
 insert into public.subscriptions(user_id,beta_until) values(p_user,now()+make_interval(days=>v_days)) on conflict(user_id) do update set beta_until=excluded.beta_until,updated_at=now();
 return true;
end; $$;
create or replace function public.reserve_plan_usage(p_user uuid,p_feature text,p_model text,p_tokens integer,p_daily_tokens integer,p_daily_requests integer,p_minute integer,p_feature_cap integer default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_day timestamptz:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 if p_tokens<1 or p_tokens>16000 then raise exception 'invalid reservation'; end if;
 if (select count(*) from public.ai_usage where user_id=p_user and created_at>=now()-interval '1 minute')>=p_minute then return null; end if;
 if (select count(*) from public.ai_usage where user_id=p_user and created_at>=v_day and status<>'failed')>=p_daily_requests then return null; end if;
 if (select coalesce(sum(reserved_tokens),0) from public.ai_usage where user_id=p_user and created_at>=v_day and status<>'failed')+p_tokens>p_daily_tokens then return null; end if;
 if p_feature_cap is not null and (select count(*) from public.ai_usage where user_id=p_user and feature=p_feature and created_at>=v_day and status<>'failed')>=p_feature_cap then return null; end if;
 insert into public.ai_usage(user_id,feature,model,reserved_tokens) values(p_user,p_feature,p_model,p_tokens) returning id into v_id;
 return v_id;
end; $$;
revoke all on function public.apply_test_subscription(text,bigint,uuid,text,text,text,timestamptz), public.redeem_study_invite(uuid,text), public.reserve_plan_usage(uuid,text,text,integer,integer,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.apply_test_subscription(text,bigint,uuid,text,text,text,timestamptz), public.redeem_study_invite(uuid,text), public.reserve_plan_usage(uuid,text,text,integer,integer,integer,integer,integer) to service_role;
