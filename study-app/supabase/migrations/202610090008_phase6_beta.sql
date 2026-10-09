create table if not exists public.study_events(user_id uuid not null references auth.users(id) on delete cascade,event text not null,hour timestamptz not null,primary key(user_id,event,hour));
create table if not exists public.study_feedback(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,body text not null,created_at timestamptz not null default now());
alter table public.study_events enable row level security;
alter table public.study_feedback enable row level security;
revoke all on public.study_events,public.study_feedback from anon,authenticated;
create or replace function public.record_study_event(p_event text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or p_event not in ('session','pack_download','client_error') then raise exception 'invalid event'; end if;
 insert into public.study_events(user_id,event,hour) values(auth.uid(),p_event,date_trunc('hour',now())) on conflict do nothing;
end; $$;
create or replace function public.submit_study_feedback(p_text text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or length(p_text) not between 5 and 1000 then raise exception 'invalid feedback'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if (select count(*) from public.study_feedback where user_id=auth.uid() and created_at>=now()-interval '1 day')>=5 then raise exception 'feedback limit'; end if;
 insert into public.study_feedback(user_id,body) values(auth.uid(),p_text);
end; $$;
create or replace function public.study_beta_metrics() returns jsonb language sql security definer set search_path='' as $$
 with current_week as(select distinct user_id from public.study_events where event='session' and hour>=now()-interval '7 days'), previous_week as(select distinct user_id from public.study_events where event='session' and hour>=now()-interval '14 days' and hour<now()-interval '7 days')
 select jsonb_build_object('weekly_active_students',(select count(*) from current_week),'sessions_this_week',(select count(*) from public.study_events where event='session' and hour>=now()-interval '7 days'),'pack_download_hours',(select count(*) from public.study_events where event='pack_download' and hour>=now()-interval '7 days'),'returning_students',(select count(*) from current_week join previous_week using(user_id)),'previous_week_active',(select count(*) from previous_week),'errors_this_week',(select count(*) from public.study_events where event='client_error' and hour>=now()-interval '7 days'),'feedback_this_week',(select count(*) from public.study_feedback where created_at>=now()-interval '7 days'));
$$;
revoke all on function public.record_study_event(text),public.submit_study_feedback(text),public.study_beta_metrics() from public,anon;
grant execute on function public.record_study_event(text),public.submit_study_feedback(text) to authenticated;
revoke all on function public.study_beta_metrics() from authenticated;
grant execute on function public.study_beta_metrics() to service_role;
