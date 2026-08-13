# 🌐 OAP Global Reach Resource Hub

Internal Okta site consolidating all Global Reach strategy outputs into a single, searchable
resource for Sales/CS reps — with a grounded AI assistant covering all eight workstreams,
from invite prep to pricing stories and success proof.

- **Product spec:** [`readme.md` in oap-global-reach-proj](https://github.com/nick-gagliardi/oap-global-reach-proj)
- **Build manual:** [`IMPLEMENTATION_GUIDE.md`](https://github.com/nickgag626/auth0-ia/blob/main/IMPLEMENTATION_GUIDE.md)

## Stack

Next.js (App Router, standalone output) · TypeScript · Tailwind CSS · markdown content in-repo ·
iddb hosting + iddb Postgres (PostgREST) · internal LiteLLM gateway (server-side only).

## Local development

```bash
npm install
npm run dev            # content/pages/search/filter work fully offline
npm run validate:content
npm run typecheck && npm run lint
npm run build          # runs the content validator first (prebuild)
```

Optional `.env.local` (see `.env.local.example`) enables the AI assistant and contribution
store locally. Without it, the assistant returns an error (no key) and contribution features show
"not provisioned" notices — by design, nothing crashes.

## Content authoring

All content is markdown in `/content` with zod-validated frontmatter:

- `content/strategies/*.md` — the 8 strategy sections. Frontmatter: `title`,
  `strategy_number` (1–8, unique), `owner`, `regions` (lowercase: `latam|apj|emea|pubsec`),
  `status` (`placeholder|in-progress|complete` — feeds the tracker), `last_updated`, `summary`.
- `content/regions/*.md`, `content/objections/*.md`, `content/verticals/*.md` — the AI prep
  library. Frontmatter: `title`, `summary`, `last_updated` (+ `region` for region files).

Region-specific callouts inside strategy bodies:

```
:::region latam
LATAM-specific guidance…
:::
```

Draft copy is marked `[PLACEHOLDER]` — find/replace as real content lands. Run
`npm run validate:content` after editing; the build refuses invalid content.

## Deployment (iddb)

1. Provision via iddb MCP tooling (`apps_provision_web` / `apps_create`, `source_kind: git`).
   `main` → production auto-deploy; branches → preview URLs.
2. The platform injects `IDDB_URL`, `IDDB_APP_KEY`/`IDDB_SERVICE_KEY`/`IDDB_ANON_KEY`,
   `IDDB_LLM_BASE_URL`, `IDDB_LLM_KEY`. No manual LLM key.
3. **Before contribution features work:** run [`db/schema.sql`](db/schema.sql) plus the
   migrations in [`db/migrations/`](db/migrations) in order (002 → 003 → 004 → 005) against the
   app's iddb Postgres via platform tooling (each ends with `NOTIFY pgrst, 'reload schema';`).
   Until then the app degrades gracefully.
4. Post-deploy checks:
   - `GET /api/health` — env booleans (incl. `github`) + `db: ok|unprovisioned|error`.
   - `GET /api/whoami` — inspect in an authenticated browser to confirm which header carries
     the employee identity, then update `src/lib/identity.ts` accordingly (Discovery A).

| Env var (optional) | Purpose |
|---|---|
| `ANTHROPIC_MODEL` | Model default (code default `claude-sonnet-4-6`; drop to `claude-haiku-4-5` if assistant p50 > 5s) |
| `PREP_TIMEOUT_MS` | LLM abort timeout, default 25000 — never higher (30s gateway cap) |
| `ADMIN_EMAILS` | Comma-separated reviewer allowlist for contribution status changes (needs confirmed identity header) |
| `ANTHROPIC_BASE_URL` / `ANTHROPIC_API_KEY` | Local-dev LLM fallback only |
| `HUB_GITHUB_TOKEN` | PAT (repo scope) the incorporation pipeline uses to open content PRs |
| `HUB_GITHUB_REPO` | Content repo for PRs (default `nick-gagliardi/oap-global-reach-proj` — the deployed repo) |
| `HUB_GITHUB_BASE_BRANCH` | PR base branch (default `main`) |

## Contribution incorporation pipeline (instant publish)

Submissions are synthesized and published **live** — no review queue, no PR, no redeploy.
On submit, the browser drives a two-step pipeline (each request stays under the
platform's ~30s cap):

1. `POST /api/contributions/[id]/extract` — gathers source material:
   **submitter-attached file text first** (the contribute form accepts up to 3 `.txt`/`.md`/`.csv`
   files, read client-side — the path for org-restricted Google files), then text exports of
   linked **Google Docs, Slides, and Sheets** filling the remaining budget. Link fetching only
   works for *genuinely public* link-shared files: Google Workspace policy (Okta's included)
   typically scopes "Anyone with the link" to org members, which an external server can't be —
   those submitters export (**File → Download → Plain text**) and attach instead. A restricted
   link is fatal only when there's no other source material. Non-Google links are kept as
   reference-only sources. (Direct server reads of org-restricted files would require a Google
   service account + domain-wide delegation — a Workspace-admin project, deliberately out of
   scope.)
2. `POST /api/contributions/[id]/incorporate` — the LLM reviews the contribution + doc
   extracts and synthesizes ONE house-style `## ` chapter (grounding rules: attached
   extracts are primary source material; never invent; reject only spam/garbage). The
   chapter is validated with the renderer's own parsers and **stored in the contributions
   row** (`status: incorporated`).

**Rendering:** the live content layer (`src/lib/content-live.ts`) merges stored chapters
into the file content per request — strategy pages (`dynamic = "force-dynamic"`), the
search index, the assistant's grounding, and the tracker all see one coherent body.
File content in `content/` remains the git-versioned base; DB addenda layer on top.
Any DB failure degrades pages to file-only content.

**Controls (tracker → Contribution activity):** *Incorporated* rows link the live section
and offer **Unpublish** (instant removal, restorable); *Declined* rows offer **Republish**
(restores the stored chapter with no re-synthesis) and **Reopen & re-run**; stuck/failed
rows offer **Run incorporation** and **Dismiss**.

Requires migrations 003–005 in `db/migrations/`. Contributors can also **update** a live chapter from the tracker ("Add update"): the LLM revises the stored chapter with the new material (new facts supersede stale ones), re-validates, and patches it in place — the attribution line gains "· updated <date>". `HUB_GITHUB_TOKEN` is no longer
required (the git-PR publish path is retired; `src/lib/github.ts` remains for a future
"export addenda to repo" utility).

## Architecture notes

- **LLM is server-side only** (`/api/assistant`): the internal LiteLLM proxy is reachable from
  iddb egress but blocked for browsers; the key never leaves the server. Every call aborts
  at ≤25s. Output is grounded: the model may only use the content library passed in the
  prompt and falls back to `insufficient_context` rather than inventing material.
- **One DB table** (`contributions`, jsonb arrays). Section status intentionally lives in
  frontmatter, not the DB — in-repo content deploys atomically with the app.
- **Search** is client-side over a server-built index shipped via the root layout — no
  endpoints, no infra.
- The PostgREST service key has no RLS; all DB access happens in API routes, and the iddb
  employee-auth gate is the app's perimeter.
