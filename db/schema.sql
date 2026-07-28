-- DDL source of truth for the OAP Global Reach Hub.
-- Run via iddb platform tooling before first use of the contribution features
-- (Phase 1, Discovery B — see IMPLEMENTATION_GUIDE.md §6.2). The app degrades
-- gracefully (503 + notices) until this table exists.

create table if not exists contributions (
  id uuid primary key default gen_random_uuid(),
  submitted_by text not null,
  submitted_email text,
  strategy_slug text not null,
  regions jsonb not null default '[]',
  content text not null,
  resource_links jsonb not null default '[]',
  status text not null default 'pending'
    check (status in ('pending','incorporated','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contributions_status_idx on contributions (status);
