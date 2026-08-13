-- Migration 005: contributor updates to incorporated chapters. Tracks when the
-- chapter CONTENT was last revised (updated_at bumps on any status flip, so it
-- can't serve as the attribution timestamp). Run via iddb platform tooling.

alter table contributions add column if not exists content_updated_at timestamptz;

notify pgrst, 'reload schema';
