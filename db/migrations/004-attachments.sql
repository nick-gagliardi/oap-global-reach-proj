-- Migration 004: submitter-attached file text (workaround for org-restricted
-- Google files that the server can't fetch). Persisted so tracker retries
-- re-use the content. Run via iddb platform tooling.

alter table contributions add column if not exists attachments jsonb not null default '[]';

notify pgrst, 'reload schema';
