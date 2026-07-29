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
3. **Before contribution features work:** run [`db/schema.sql`](db/schema.sql) against the
   app's iddb Postgres via platform tooling. Until then the app degrades gracefully.
4. Post-deploy checks:
   - `GET /api/health` — env booleans + `db: ok|unprovisioned|error`.
   - `GET /api/whoami` — inspect in an authenticated browser to confirm which header carries
     the employee identity, then update `src/lib/identity.ts` accordingly (Discovery A).

| Env var (optional) | Purpose |
|---|---|
| `ANTHROPIC_MODEL` | Model default (code default `claude-sonnet-4-6`; drop to `claude-haiku-4-5` if assistant p50 > 5s) |
| `PREP_TIMEOUT_MS` | LLM abort timeout, default 25000 — never higher (30s gateway cap) |
| `ADMIN_EMAILS` | Comma-separated reviewer allowlist for contribution status changes (needs confirmed identity header) |
| `ANTHROPIC_BASE_URL` / `ANTHROPIC_API_KEY` | Local-dev LLM fallback only |

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
