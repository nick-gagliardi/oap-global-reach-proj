-- Migration 002: AI incorporation pipeline.
-- Adds the 'failed' status plus columns recording the pipeline result.
-- Run via iddb platform tooling, then: NOTIFY pgrst, 'reload schema';
-- (Postgres auto-names the inline column check "contributions_status_check";
-- if the drop errors, find the real name with:
--   select conname from pg_constraint where conrelid = 'contributions'::regclass;)

alter table contributions drop constraint if exists contributions_status_check;
alter table contributions add constraint contributions_status_check
  check (status in ('pending','incorporated','declined','failed'));

alter table contributions add column if not exists error text;
alter table contributions add column if not exists pr_url text;
alter table contributions add column if not exists chapter_title text;

notify pgrst, 'reload schema';
