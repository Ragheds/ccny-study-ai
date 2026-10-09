create table if not exists public.study_packs(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,course_code text not null,title text not null,content jsonb not null default '{}'::jsonb,status text not null default 'pending',is_deleted boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.study_edits(user_id uuid not null references auth.users(id) on delete cascade,id text not null,pack_id uuid not null references public.study_packs(id),kind text not null,data jsonb,updated_at timestamptz not null,primary key(user_id,id));
alter table public.study_packs enable row level security;
alter table public.study_edits enable row level security;
create policy "Read own packs" on public.study_packs for select to authenticated using(auth.uid()=user_id);
create policy "Delete own packs" on public.study_packs for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
revoke insert,delete,update on public.study_packs from authenticated,anon;
grant update(is_deleted,updated_at) on public.study_packs to authenticated;
create policy "Read own edits" on public.study_edits for select to authenticated using(auth.uid()=user_id);
revoke insert,update,delete on public.study_edits from authenticated,anon;
create or replace function public.reserve_study_pack(p_user uuid,p_course text,p_title text,p_cap integer) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 if not exists(select 1 from public.user_courses where user_id=p_user and course_code=p_course and not is_deleted) then return null; end if;
 if not exists(select 1 from public.study_packs where user_id=p_user and course_code=p_course and not is_deleted and status in ('ready','pending')) and (select count(distinct course_code) from public.study_packs where user_id=p_user and not is_deleted and status in ('ready','pending'))>=p_cap then return null; end if;
 insert into public.study_packs(user_id,course_code,title) values(p_user,p_course,p_title) returning id into v_id; return v_id;
end; $$;
revoke all on function public.reserve_study_pack(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.reserve_study_pack(uuid,text,text,integer) to service_role;
create or replace function public.sync_study_edit(p_id text,p_pack uuid,p_kind text,p_data jsonb,p_time timestamptz) returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_course text;
begin
 if v_user is null or p_kind not in ('notes','quiz','review') or pg_column_size(p_data)>50000 or p_time>now()+interval '5 minutes' then raise exception 'invalid edit'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
 select course_code into v_course from public.study_packs where id=p_pack and user_id=v_user and not is_deleted and status='ready';
 if v_course is null then raise exception 'pack unavailable'; end if;
 if exists(select 1 from public.study_edits where user_id=v_user and id=p_id and updated_at>=p_time) then return; end if;
 insert into public.study_edits(user_id,id,pack_id,kind,data,updated_at) values(v_user,p_id,p_pack,p_kind,p_data,p_time) on conflict(user_id,id) do update set data=excluded.data,updated_at=excluded.updated_at;
 if p_kind='notes' then
 if jsonb_typeof(p_data)<>'string' then raise exception 'invalid notes'; end if;
 update public.study_packs set content=jsonb_set(content,'{notes}',p_data),updated_at=p_time where id=p_pack and updated_at<=p_time;
 end if;
end; $$;
revoke all on function public.sync_study_edit(text,uuid,text,jsonb,timestamptz) from public,anon;
grant execute on function public.sync_study_edit(text,uuid,text,jsonb,timestamptz) to authenticated;
