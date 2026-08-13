-- Migration 003: instant publishing — synthesized chapters live in the DB and
-- are merged into strategy pages at render time (no PR / redeploy).
-- Run via iddb platform tooling.

alter table contributions add column if not exists chapter_markdown text;
alter table contributions add column if not exists replace_title text;
alter table contributions add column if not exists mode text; -- 'append' | 'replace'

notify pgrst, 'reload schema';
