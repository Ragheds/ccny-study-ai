alter table public.study_packs add column if not exists source_chunks jsonb not null default '[]'::jsonb;
alter table public.study_packs add column if not exists source_kind text not null default 'course';
-- Source material inherits the pack's existing owner-only RLS. Original PDFs are not retained.
