-- Phase 1: additive user data tables. Apply after 202610030001 and 202610030002.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  major jsonb,
  study_mode text check (study_mode in ('visual', 'audio', 'active')),
  updated_at timestamptz not null default now()
);
create table if not exists public.user_courses (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_code text not null,
  data jsonb not null,
  is_deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, course_code)
);
create table if not exists public.notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_code text not null,
  data jsonb not null,
  is_deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, course_code)
);
create table if not exists public.flashcards (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  is_deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create table if not exists public.quiz_results (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  is_deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_code text not null,
  topic text not null,
  study_mode text not null,
  schema_version integer not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  unique (course_code, topic, study_mode, schema_version)
);
create table if not exists public.user_lessons (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  shared_lesson_id uuid references public.lessons(id) on delete set null,
  content jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'inactive',
  provider_customer_id text,
  updated_at timestamptz not null default now()
);
-- Compatibility cache for existing browser-state sync. The normalized tables above
-- are used for major, courses, notes, flashcards, and quiz reads.
create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_courses enable row level security;
alter table public.notes enable row level security;
alter table public.flashcards enable row level security;
alter table public.quiz_results enable row level security;
alter table public.lessons enable row level security;
alter table public.user_lessons enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_app_state enable row level security;

create policy "Own profiles" on public.profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own courses" on public.user_courses for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own notes" on public.notes for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own flashcards" on public.flashcards for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own quiz results" on public.quiz_results for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Read shared lessons" on public.lessons for select to authenticated using (true);
create policy "Own lessons" on public.user_lessons for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Read own subscription" on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own app cache" on public.user_app_state for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- The current storage swap point writes one snapshot. This trigger mirrors it
-- atomically into normalized rows, including deletions, until each UI uses rows directly.
create or replace function public.mirror_user_app_state() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  v_data jsonb := coalesce(new.state -> 'data', '{}'::jsonb);
begin
  if jsonb_typeof(v_data) <> 'object' then
    raise exception 'invalid app state';
  end if;
  insert into public.profiles (user_id, major, updated_at)
    values (new.user_id, v_data -> 'ccny_major', new.updated_at)
    on conflict (user_id) do update set major = excluded.major, updated_at = excluded.updated_at;

  update public.user_courses set is_deleted = true, updated_at = new.updated_at where user_id = new.user_id;
  insert into public.user_courses (user_id, course_code, data, updated_at, is_deleted)
    select new.user_id, course ->> 'code', course, new.updated_at, false
    from jsonb_array_elements(case when jsonb_typeof(v_data -> 'ccny_courses') = 'array'
      then v_data -> 'ccny_courses' else '[]'::jsonb end) course
    where nullif(course ->> 'code', '') is not null
    on conflict (user_id, course_code) do update set data = excluded.data, updated_at = excluded.updated_at, is_deleted = false;

  update public.notes set is_deleted = true, updated_at = new.updated_at where user_id = new.user_id;
  insert into public.notes (user_id, course_code, data, updated_at, is_deleted)
    select new.user_id, key, value, new.updated_at, false
    from jsonb_each(case when jsonb_typeof(v_data -> 'ccny_notes_v2') = 'object'
      then v_data -> 'ccny_notes_v2' else '{}'::jsonb end)
    on conflict (user_id, course_code) do update set data = excluded.data, updated_at = excluded.updated_at, is_deleted = false;

  update public.flashcards set is_deleted = true, updated_at = new.updated_at where user_id = new.user_id;
  insert into public.flashcards (user_id, id, data, updated_at, is_deleted)
    select new.user_id, key, value, new.updated_at, false
    from jsonb_each(case when jsonb_typeof(v_data #> '{ccny_flashcards,setsById}') = 'object'
      then v_data #> '{ccny_flashcards,setsById}' else '{}'::jsonb end)
    on conflict (user_id, id) do update set data = excluded.data, updated_at = excluded.updated_at, is_deleted = false;

  update public.quiz_results set is_deleted = true, updated_at = new.updated_at where user_id = new.user_id;
  insert into public.quiz_results (user_id, id, data, updated_at, is_deleted)
    select new.user_id, key, value, new.updated_at, false
    from jsonb_each(case when jsonb_typeof(v_data #> '{ccny_quiz_results,attemptsById}') = 'object'
      then v_data #> '{ccny_quiz_results,attemptsById}' else '{}'::jsonb end)
    on conflict (user_id, id) do update set data = excluded.data, updated_at = excluded.updated_at, is_deleted = false;
  return new;
end;
$$;
create trigger mirror_user_app_state_trigger after insert or update of state on public.user_app_state
  for each row execute function public.mirror_user_app_state();

-- Backfill any existing whole-state rows without discarding them.
update public.user_app_state set state = state where jsonb_typeof(state -> 'data') = 'object';
