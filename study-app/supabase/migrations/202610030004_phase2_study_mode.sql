-- Phase 2: the study_mode column already exists from Phase 1.
alter table public.profiles
  add column if not exists study_mode_prompt_dismissed boolean not null default false;
