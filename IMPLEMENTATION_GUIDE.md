# OAP Global Reach Resource Hub — Technical Implementation Guide

**Audience:** an autonomous coding agent building this app start-to-finish.
**Product spec:** see `readme.md` in this repo. This guide is the build manual: it encodes verified platform behavior (iddb hosting, iddb Postgres, the internal LiteLLM gateway) learned from a sibling production app, plus the complete architecture, code patterns, and phase-by-phase build order with verification gates.

**Execute the phases in order (§10). Do not proceed past a phase until its verification criteria pass.**

---

## 1. Architecture summary & non-negotiable constraints

| Decision | Rule |
|---|---|
| Language / stack | TypeScript everywhere. Next.js (App Router, `src/` dir), Tailwind CSS. No UI component libraries, no CMS, no auth libraries (NextAuth etc.). |
| Build output | `output: 'standalone'` in `next.config.js` — **required** for iddb container deployment. |
| Content | Markdown files in `/content`, version-controlled in-repo. Loaded server-side at runtime with `fs`. No codegen, no CMS. |
| LLM | **Server-side only.** The LLM key never reaches the browser. Every LLM fetch uses `AbortController` with timeout ≤ 25 s (the deployment gateway kills upstream requests at ~30 s). |
| Database | iddb Postgres accessed **via its PostgREST REST API only** (`${IDDB_URL}/rest/v1/...`). One table: `contributions`. No ORM, no direct SQL connection from app code. |
| Search | Client-side, over an in-memory index built server-side from the markdown content (~25 small docs). No search infrastructure. |
| Auth | The iddb platform gates the entire app to authenticated Okta employees. The app builds **no** login flow. User identity, if needed, is read from request headers (discovered in Phase 1). |
| Notifications | None. Contribution review happens via an in-app review queue on `/tracker` with a pending-count badge in the nav. |
| Spec simplification | The spec's `content_sections` DB table is **intentionally dropped**. Section status/owner/last-updated derive entirely from markdown frontmatter (§5). A DB copy of in-repo content would drift and require sync code for zero benefit. |
| Content authoring | The build agent authors realistic, sales-ready draft copy for **every** content file, marked `[PLACEHOLDER]` throughout, so the AI prep tool is fully testable end-to-end. Nick replaces it with real content later. |

---

## 2. Platform facts (verified — do not rediscover, do not deviate)

### 2.1 iddb hosting

- Provision via the iddb MCP tools: `apps_provision_web` or `apps_create` (`source_kind: git`).
- `main` branch → production, auto-deploy on push. Feature branches → preview deployments with shareable URLs.
- Env vars / secrets are set via `apps_set_env`. Never commit secrets.
- The platform **auto-injects** these env vars into the running app — do not set them manually:
  - `IDDB_URL` — PostgREST base URL for the app's Postgres
  - `IDDB_APP_KEY` / `IDDB_SERVICE_KEY` / `IDDB_ANON_KEY` — DB API key (use the first one present, in that order)
  - `IDDB_LLM_BASE_URL` — the internal LiteLLM gateway (`https://llm.atko.ai`)
  - `IDDB_LLM_KEY` — the LLM service key
- The deployment gateway cuts upstream requests at **~30 seconds**. Any server work that can block (LLM calls above all) must abort earlier and return a clean error.

### 2.2 The LLM gateway (LiteLLM)

- **Server-side calls from iddb containers work** — iddb egress is allowlisted at the proxy. **Browser calls are blocked** (CORS + IP allowlist). Never attempt a client-side call to the proxy; route everything through your own same-origin API routes.
- Wire format is the **Anthropic Messages API**: `POST ${IDDB_LLM_BASE_URL}/v1/messages` with `{ model, max_tokens, system?, messages }`; response body has `content[0].text`.
- Auth header **for the proxy** is `Authorization: Bearer <IDDB_LLM_KEY>`. The direct-Anthropic headers (`x-api-key`, `anthropic-version`) are only used when falling back to `api.anthropic.com` in local dev. The resolver in §4.1 handles both.
- Model names are plain, e.g. `claude-sonnet-4-6`, `claude-haiku-4-5`, `claude-opus-4-8`. Default to `claude-sonnet-4-6`, overridable via the `ANTHROPIC_MODEL` env var. Do not hardcode a model anywhere else.
- No Anthropic account or key is needed in production. Do not provision one.

### 2.3 iddb Postgres (PostgREST)

- REST interface, Supabase-style: `GET/POST/PATCH ${IDDB_URL}/rest/v1/<table>` with headers `apikey: <key>` and `Authorization: Bearer <key>`.
- Query syntax: `?col=eq.value&select=a,b&order=created_at.desc`. **Always `encodeURIComponent()` values interpolated into filters.**
- Upsert: `POST` with `Prefer: resolution=merge-duplicates` (not needed for this schema, noted for completeness).
- The key is **service-level. There is no row-level security.** Never let it reach the client; all DB access goes through API routes / server components. Authorization is the app's job — accepted model here: any authenticated Okta employee may submit and review contributions (the platform gate is the perimeter).
- **Unknown:** how DDL (table creation) is executed on iddb. Phase 1 includes a discovery step; the app must tolerate an unprovisioned table gracefully (§6.3).

### 2.4 Platform identity

The platform authenticates every visitor as an Okta employee, but **how the identity is exposed to the app (header? cookie? JWT?) is unknown**. Phase 1 deploys a `/api/whoami` probe that echoes (redacted) request headers; inspect it from an authenticated browser session, then implement `src/lib/identity.ts` around whatever you find (likely candidates: `x-forwarded-email`, `x-auth-request-email`, `x-okta-*`, or a JWT in a header/cookie). If no identity is programmatically available, the contribution form's name text field remains the source of truth — the app must work either way.

---

## 3. Repo structure, dependencies, env vars

### 3.1 Complete tree

```
oap-global-reach-hub/
├── next.config.js                  # standalone output + content file tracing (§3.4)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── .gitignore
├── .env.local.example              # documents all env vars; values never committed
├── README.md                       # ops notes: env table, schema.sql instructions, authoring guide
├── db/
│   └── schema.sql                  # CREATE TABLE contributions — DDL source of truth (§6.1)
├── content/
│   ├── strategies/                 # 8 files — the strategy section pages
│   │   ├── icp.md
│   │   ├── target-accounts.md
│   │   ├── value-blueprints.md
│   │   ├── channel-partners.md
│   │   ├── demo-resources.md
│   │   ├── success-stories.md
│   │   ├── regional-pricing.md
│   │   └── attendance-value.md
│   ├── regions/                    # 4 files — feed the AI prep tool
│   │   ├── latam.md
│   │   ├── apj.md
│   │   ├── emea.md
│   │   └── pubsec.md
│   ├── objections/                 # 5 files — feed the AI prep tool
│   │   ├── travel-cost.md
│   │   ├── digital-attendance.md
│   │   ├── attended-last-year.md
│   │   ├── timing-conflict.md
│   │   └── no-budget.md
│   └── verticals/                  # 4 files — feed the AI prep tool
│       ├── financial-services.md
│       ├── healthcare.md
│       ├── technology.md
│       └── public-sector.md
├── scripts/
│   └── validate-content.ts         # zod-validates all content; wired as prebuild
└── src/
    ├── app/
    │   ├── layout.tsx              # nav + SearchProvider (index built server-side here)
    │   ├── page.tsx                # home: overview, 8 section cards, quick links
    │   ├── globals.css
    │   ├── error.tsx
    │   ├── strategies/
    │   │   ├── page.tsx            # card grid + regional filter (?region=)
    │   │   └── [slug]/
    │   │       ├── page.tsx        # renders one strategy; generateStaticParams
    │   │       └── loading.tsx
    │   ├── prep/
    │   │   ├── page.tsx
    │   │   └── prep-form.tsx       # client: form, results, copy buttons
    │   ├── contribute/
    │   │   ├── page.tsx
    │   │   └── contribute-form.tsx # client
    │   ├── tracker/
    │   │   ├── page.tsx            # status board (frontmatter) + review queue (DB)
    │   │   ├── loading.tsx
    │   │   └── review-queue.tsx    # client: pending list + status PATCH actions
    │   └── api/
    │       ├── health/route.ts     # env presence + DB reachability (§7.4)
    │       ├── whoami/route.ts     # identity discovery probe (§7.4)
    │       ├── prep/route.ts       # POST — grounded LLM synthesis (§7.1)
    │       └── contributions/
    │           ├── route.ts        # POST create, GET list (?status=)
    │           └── [id]/route.ts   # PATCH status
    ├── components/
    │   ├── nav.tsx                 # top nav + search input + tracker badge
    │   ├── search.tsx              # client: debounced input, results listbox
    │   ├── search-provider.tsx     # client context holding the index
    │   ├── region-filter.tsx       # client: chips writing ?region= via router.replace
    │   ├── region-badge.tsx
    │   ├── status-badge.tsx        # placeholder | in-progress | complete
    │   ├── markdown.tsx            # react-markdown wrapper + region callout cards
    │   ├── copy-button.tsx
    │   └── spinner.tsx
    └── lib/
        ├── content.ts              # md loading, frontmatter validation, callout parsing, caching
        ├── content-schema.ts       # zod schemas + TS types for frontmatter
        ├── search-index.ts         # buildSearchIndex()
        ├── llm.ts                  # getLLMConfig() — §4.1
        ├── llm-server.ts           # callLLMServer(), parseJsonFromLLM() — §4.2
        ├── iddb.ts                 # PostgREST helper + contributions accessors — §4.3
        ├── identity.ts             # getRequestIdentity(headers) — Phase 1 discovery result
        └── regions.ts              # region/vertical/objection constants, labels, AA-checked colors
```

### 3.2 Dependencies (keep it to exactly this)

Runtime: `next`, `react`, `react-dom`, `gray-matter`, `react-markdown`, `remark-gfm`, `zod`.
Dev: `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `tailwindcss`, `postcss`, `autoprefixer`, `eslint`, `eslint-config-next`, `tsx`.

No fetch/SDK wrappers (raw `fetch` for both LLM and PostgREST), no fuse.js (simple token scoring is plenty for ~25 docs), no toast/drawer/component libraries.

### 3.3 Environment variables

| Var | Source | Purpose |
|---|---|---|
| `IDDB_URL` | auto-injected by iddb | PostgREST base URL |
| `IDDB_APP_KEY` / `IDDB_SERVICE_KEY` / `IDDB_ANON_KEY` | auto-injected | DB key; first present wins, in that order |
| `IDDB_LLM_BASE_URL` | auto-injected | LiteLLM gateway base URL |
| `IDDB_LLM_KEY` | auto-injected | LLM key (Bearer) |
| `ANTHROPIC_MODEL` | optional, via `apps_set_env` | model override; code default `claude-sonnet-4-6` |
| `PREP_TIMEOUT_MS` | optional | LLM abort timeout for /api/prep; default 25000; never raise above 25000 |
| `ADMIN_EMAILS` | optional | comma-separated allowlist gating contribution status changes, **only if** the Phase 1 identity probe yields a trustworthy email header |
| `ANTHROPIC_BASE_URL` / `ANTHROPIC_API_KEY` | local dev only | direct-Anthropic fallback when IDDB vars are absent |

### 3.4 `next.config.js` — get this exactly right

```js
/** @type {import('next').NextConfig} */
module.exports = {
  output: 'standalone',
  // Next 14: under `experimental`. Next 15+: `outputFileTracingIncludes` is top-level.
  experimental: {
    outputFileTracingIncludes: { '/**': ['./content/**/*'] },
  },
};
```

Without the tracing include, runtime `fs` reads of `/content` **work in dev and fail with 500s only in the deployed standalone container** — this is a top-3 pitfall. Verify against the built output (`node .next/standalone/server.js`) before the first content-dependent deploy (copy `.next/static` and `public` into the standalone dir per Next docs when testing locally).

---

## 4. Core libraries (proven patterns — implement as given)

These three files are ported from a production sibling app that runs on iddb against the same proxy and PostgREST. Implement them as written (adjusting only imports/types), then build everything else on top.

### 4.1 `src/lib/llm.ts`

```ts
/**
 * Central LLM config resolver for server-side API routes.
 * IDDB_LLM_* vars are platform-managed (auto-injected by iddb) and take precedence.
 */
export function getLLMConfig() {
  const baseUrl =
    process.env.IDDB_LLM_BASE_URL ||
    process.env.ANTHROPIC_BASE_URL ||
    'https://api.anthropic.com';

  const apiKey =
    process.env.IDDB_LLM_KEY ||
    process.env.ANTHROPIC_API_KEY;

  const isProxy = baseUrl.includes('llm.atko.ai');
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
  const endpoint = `${baseUrl.replace(/\/$/, '')}/v1/messages`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (isProxy) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else {
    if (apiKey) headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
  }

  return { baseUrl, apiKey, model, endpoint, headers, isProxy };
}
```

### 4.2 `src/lib/llm-server.ts`

```ts
import { getLLMConfig } from '@/lib/llm';

/**
 * Server-side LLM helper. Always runs with an AbortController so a hung
 * upstream can never pin an invocation past the gateway's ~30s cap.
 */
export interface CallLLMServerOptions {
  prompt: string;
  system?: string;
  maxTokens?: number;
  /** Abort timeout in ms. Keep well below the 30s gateway window. */
  timeoutMs?: number;
  /** Override the configured default model. */
  model?: string;
}

export async function callLLMServer(opts: CallLLMServerOptions): Promise<string> {
  const { endpoint, headers, model, apiKey } = getLLMConfig();
  if (!apiKey) throw new Error('LLM service key not configured on the server.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: opts.model ?? model,
        max_tokens: opts.maxTokens ?? 2048,
        ...(opts.system ? { system: opts.system } : {}),
        messages: [{ role: 'user', content: opts.prompt }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`LLM ${res.status}${errText ? `: ${errText.slice(0, 300)}` : ''}`);
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text;
    if (typeof text !== 'string' || !text) throw new Error('Empty response from the model.');
    return text;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(`LLM request timed out after ${Math.round((opts.timeoutMs ?? 15_000) / 1000)}s.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse a JSON value out of model text: strips ``` fences, and if the whole
 * string still isn't valid JSON, falls back to the first {...} / [...] span.
 * Throws when no JSON can be found.
 */
export function parseJsonFromLLM<T = unknown>(text: string): T {
  const stripped = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();
  try {
    return JSON.parse(stripped) as T;
  } catch {
    // fall through to the span match
  }
  const match = stripped.match(/[\[{][\s\S]*[\]}]/);
  if (!match) throw new Error('No JSON found in the model response.');
  return JSON.parse(match[0]) as T;
}
```

### 4.3 `src/lib/iddb.ts`

```ts
/**
 * Helper for the iddb Postgres REST API (PostgREST), server-side only.
 * IDDB_URL and the key are auto-injected by the platform.
 * The key is SERVICE-LEVEL (no RLS): never expose it or this module client-side.
 */
function iddbFetch(path: string, options: RequestInit = {}) {
  const base = process.env.IDDB_URL?.replace(/\/$/, '');
  const key =
    process.env.IDDB_APP_KEY || process.env.IDDB_SERVICE_KEY || process.env.IDDB_ANON_KEY;
  if (!base || !key) throw new Error('IDDB_URL or IDDB_APP_KEY not configured');
  return fetch(`${base}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers ?? {}),
    },
  });
}

export type ContributionStatus = 'pending' | 'incorporated' | 'declined';

export interface Contribution {
  id: string;
  submitted_by: string;
  submitted_email: string | null;
  strategy_slug: string;
  regions: string[];        // jsonb
  content: string;
  resource_links: string[]; // jsonb
  status: ContributionStatus;
  created_at: string;
  updated_at: string;
}

/** Detect "table doesn't exist yet" so callers can degrade to a 503 notice. */
function isUnprovisioned(status: number, bodyText: string): boolean {
  return status === 404 || bodyText.includes('42P01') || /relation .* does not exist/.test(bodyText);
}

export class UnprovisionedError extends Error {
  constructor() { super('contributions store not provisioned yet'); }
}

async function readOrThrow(res: Response): Promise<any> {
  const text = await res.text();
  if (!res.ok) {
    if (isUnprovisioned(res.status, text)) throw new UnprovisionedError();
    throw new Error(`iddb ${res.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

export async function insertContribution(
  row: Omit<Contribution, 'id' | 'status' | 'created_at' | 'updated_at'>,
): Promise<Contribution> {
  const res = await iddbFetch('/rest/v1/contributions', {
    method: 'POST',
    body: JSON.stringify(row),
  });
  const rows = await readOrThrow(res);
  return rows[0];
}

export async function listContributions(status?: ContributionStatus): Promise<Contribution[]> {
  const filter = status ? `&status=eq.${encodeURIComponent(status)}` : '';
  const res = await iddbFetch(
    `/rest/v1/contributions?select=*&order=created_at.desc${filter}`,
  );
  return readOrThrow(res);
}

export async function updateContributionStatus(
  id: string,
  status: ContributionStatus,
): Promise<Contribution | null> {
  const res = await iddbFetch(
    `/rest/v1/contributions?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
    },
  );
  const rows = await readOrThrow(res);
  // PostgREST returns 200 + [] when no row matched — treat as not found.
  return rows?.[0] ?? null;
}

export async function countPending(): Promise<number> {
  const res = await iddbFetch('/rest/v1/contributions?status=eq.pending&select=id', {
    headers: { Prefer: 'count=exact', Range: '0-0' },
  });
  if (!res.ok) {
    const text = await res.text();
    if (isUnprovisioned(res.status, text)) throw new UnprovisionedError();
    throw new Error(`iddb ${res.status}`);
  }
  // Content-Range: 0-0/N
  const range = res.headers.get('content-range') ?? '';
  const total = Number(range.split('/')[1]);
  return Number.isFinite(total) ? total : 0;
}
```

---

## 5. Content pipeline

### 5.1 Frontmatter contracts (`src/lib/content-schema.ts`, zod)

Strategy files (`content/strategies/*.md`):

```yaml
---
title: "Ideal Customer Profile"
strategy_number: 1              # 1..8, unique across the 8 files
owner: "[PLACEHOLDER] Owner Name"
regions: [latam, apj, emea, pubsec]   # regions this section covers
status: placeholder             # placeholder | in-progress | complete
last_updated: 2026-07-28        # ISO date
summary: "One-line description used on cards and in search results"
---
```

Region files add `region: latam` (must match the filename). Objection and vertical files: `title`, `summary`, `last_updated`. Region slugs everywhere are lowercase: `latam | apj | emea | pubsec` (display labels + AA-checked badge colors live in `src/lib/regions.ts`; display names LATAM / APJ / EMEA / PubSec).

### 5.2 Regional callouts inside strategy bodies

Convention — fenced container blocks:

```
:::region latam
LATAM-specific guidance goes here...
:::
```

`content.ts` pre-splits each body into segments `{ region: Region | null, markdown: string }` with a small line-based parser (~20 lines; do not add a remark plugin). `components/markdown.tsx` always renders `null`-region segments; region segments render as styled callout cards with a `RegionBadge`. When a region filter is active, non-matching region segments are **hidden**.

### 5.3 Loading (`src/lib/content.ts`)

- Read with `fs.readFileSync(path.join(process.cwd(), 'content', ...))`, parse with `gray-matter`, validate with zod — **throw with the filename** on any schema failure.
- Memoize per-process (module-level map) and wrap exported loaders in React `cache()`.
- Exports: `getAllStrategies()`, `getStrategy(slug)`, `getRegions()`, `getRegion(slug)`, `getObjections()`, `getObjection(slug)`, `getVerticals()`, `getVertical(slug)`, and:
  - `getSectionStatuses()` → `{ slug, title, strategy_number, owner, status, last_updated }[]` — the tracker's data source. **This replaces the spec's `content_sections` table.**
- `src/lib/search-index.ts` — `buildSearchIndex()` → `Array<{ href, title, type: 'strategy'|'region'|'objection'|'vertical', regions: Region[], summary, body }>` where `body` is plain-text, lowercased, markup stripped. Built server-side in `app/layout.tsx` and passed into the client `SearchProvider` (a few tens of KB in the RSC payload — acceptable, and search then works on every page with zero endpoints).

### 5.4 Validation script (`scripts/validate-content.ts`)

Loads everything through the same loaders; exits non-zero on: any schema violation, any missing file (all 8 strategies + 4 regions + 5 objections + 4 verticals must exist), duplicate `strategy_number`, or a `:::region` tag with an unknown region. Wire into `package.json`:

```json
"scripts": { "prebuild": "tsx scripts/validate-content.ts", ... }
```

### 5.5 Content authoring requirements (Phase 2)

Author all **21 files** with realistic, sales-ready draft copy — not lorem ipsum. Tone: direct, practical (see readme.md's authoring standards; objection responses start with an acknowledgment, not a rebuttal). Mark invented specifics `[PLACEHOLDER]` so Nick can find/replace them. Include at least two `:::region` callouts spread across different strategy files so the filter behavior is testable. Region files should carry genuinely region-flavored guidance (market context, priorities, tone); objection files should contain reusable response material the AI can ground on.

---

## 6. Database

### 6.1 Schema (`db/schema.sql` — the DDL source of truth)

```sql
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
```

Notes: `regions`/`resource_links` are **`jsonb`, not `text[]`** — PostgREST accepts plain JSON arrays for jsonb with zero quirks, while Postgres array literals (`{a,b}`) over REST are error-prone. `strategy_slug` is validated in app code against the 8 known slugs (no FK — the slugs live in the repo, not the DB).

### 6.2 DDL discovery (Phase 1)

How to run DDL on iddb is unknown. Procedure:

1. Enumerate the available iddb MCP tools. Look for anything resembling SQL execution / DB provisioning / migrations (`apps_sql`, `db_query`, `apps_provision_db`, or similar).
2. If found: execute `db/schema.sql` through it. Verify with `GET ${IDDB_URL}/rest/v1/contributions?select=id&limit=1` → expect `200 []`.
3. If not found: document in README ("run `db/schema.sql` via platform tooling before first use"), surface it to Nick, and continue building — the app degrades gracefully (§6.3). Do not block later phases on this except Phase 6's DB-dependent verifications.

### 6.3 Graceful degradation when unprovisioned

`lib/iddb.ts` throws `UnprovisionedError` when PostgREST reports a missing relation. Handling:
- `POST /api/contributions` → `503 { error: "contributions store not provisioned yet" }`; the contribute form shows an explicit notice.
- Tracker review queue + nav badge → render an inline "review queue not provisioned yet" notice / hide the badge. Always wrap `countPending()` in try/catch — a DB outage must never break the page shell.

---

## 7. API design

General rules: Node runtime (default). `export const dynamic = 'force-dynamic'` on every DB-touching route. All bodies zod-validated → `400` with field errors. Error shape: `{ error: string }`. Never echo secrets.

### 7.1 `POST /api/prep` — the AI conversation prep endpoint

Request (zod):

```ts
{
  region: 'latam' | 'apj' | 'emea' | 'pubsec',              // required
  vertical?: 'financial-services' | 'healthcare' | 'technology' | 'public-sector',
  objection?: 'travel-cost' | 'digital-attendance' | 'attended-last-year'
            | 'timing-conflict' | 'no-budget',
  freeText?: string    // ≤ 500 chars; required iff objection is absent
}
```

Success `200`:

```ts
{
  ok: true,
  result: {
    talkingPoints: string[];   // 3–5 bullets
    objectionResponse: string; // 1–2 paragraphs
    outreachDraft: string;     // copy-paste-ready email/Slack message
    sources: string[];         // titles of the content files used
  }
}
```

Fallback `200` (not an error): `{ ok: false, reason: 'insufficient_context', message: string }`.
Errors: `400` invalid input; `502` upstream LLM error (include upstream detail in `error`); `504` timeout.

**Prompt assembly (the grounding contract).** System prompt, in substance:

> You are a sales-conversation prep assistant for Okta's Global Reach team, helping a rep prepare to invite a customer to Oktane. You may use ONLY the reference documents provided between `<library>` tags. If they do not contain enough relevant material for this request, respond with exactly `{"insufficient_context": true}`. Never invent pricing, discounts, named customers, statistics, or commitments that are not present in the library. Respond with ONLY a JSON object of this exact shape: `{ "talkingPoints": string[3..5], "objectionResponse": string, "outreachDraft": string, "sources": string[] }`. talkingPoints are concise, localized bullets; objectionResponse is 1–2 paragraphs starting with an acknowledgment; outreachDraft is a short, copy-paste-ready message.

User message embeds, inside `<library>` tags with per-document `<doc title="...">` wrappers:
- the selected **region** file (always)
- the selected **vertical** file (if chosen)
- the selected **objection** file — or, for free text: **all five objection files** (they are small) plus the `regional-pricing` and `attendance-value` strategy files (the two most objection-relevant sections)
- then, outside the library block, the rep's request: region, vertical, and the objection name or free-text scenario.

**Call discipline:** `callLLMServer({ prompt, system, maxTokens: 1500, timeoutMs: Number(process.env.PREP_TIMEOUT_MS) || 25_000 })`. Parse with `parseJsonFromLLM`, then re-validate with zod (talkingPoints length 3–5 etc. — clamp rather than reject when the model returns 6 bullets). If the model returned `insufficient_context`, or parsing/validation fails, return the fallback shape — **not a 500**. Map timeout → `504`, other upstream failures → `502`.

**Latency:** target is <5s. If p50 exceeds ~5s with the default model, set `ANTHROPIC_MODEL=claude-haiku-4-5` via `apps_set_env` — a config change, not a code change.

### 7.2 `/api/contributions`

- `POST` — body (zod): `{ submittedBy: string (1–120), strategySlug: <one of the 8 slugs>, regions: Region[] (min 1), content: string (10–5000), resourceLinks: string[] (each valid http(s) URL, max 10) }`. Server merges platform identity from `getRequestIdentity(headers)` when available (fills `submitted_email`, overrides `submitted_by`). Maps to the snake_case row and calls `insertContribution`. → `201` + created row. `UnprovisionedError` → `503`.
- `GET ?status=pending|incorporated|declined` (optional) → `{ contributions: Contribution[], pendingCount: number }`.
- `PATCH /api/contributions/[id]` — body `{ status: 'incorporated' | 'declined' | 'pending' }` → `200` updated row; `null` from the accessor → `404`; invalid status → `400`. If `ADMIN_EMAILS` is set and identity is available, reject non-listed users with `403`.

### 7.3 `src/lib/identity.ts`

```ts
export interface RequestIdentity { name?: string; email?: string }
/** Parse the platform-provided identity from request headers.
 *  Implemented from the Phase 1 /api/whoami discovery. Returns null if absent. */
export function getRequestIdentity(headers: Headers): RequestIdentity | null { ... }
```

Until discovery, return `null` (everything must work without identity).

### 7.4 Probes

- `GET /api/health` → `{ ok: boolean, env: { iddbUrl: boolean, iddbKey: boolean, llmBase: boolean, llmKey: boolean }, db: 'ok' | 'unprovisioned' | 'error' }`. The db check is `GET /rest/v1/contributions?select=id&limit=1`. Booleans only — never values.
- `GET /api/whoami` → initially `{ headers: {...} }` with `authorization`/`cookie` values truncated to 12 chars (discovery). After discovery, reduce it to `{ identity: getRequestIdentity(headers) }` and keep it — harmless behind the platform gate, useful for debugging.

---

## 8. UI specification

### Pages

- **`/` (home):** hero explaining the hub, grid of 8 strategy cards (title, summary, `StatusBadge`, region badges, link), prominent links to `/prep`, `/contribute`, `/tracker`.
- **`/strategies`:** same card grid + `RegionFilter`; cards filtered by frontmatter `regions`.
- **`/strategies/[slug]`:** frontmatter header block (title, owner, status, last updated, region badges), rendered markdown with region callout cards; active filter hides non-matching callouts. `generateStaticParams` over the 8 slugs. Inter-strategy links preserve the `region` param.
- **`/prep`:** three inputs — region (required), vertical (optional), objection select including an "Other / describe it…" option that reveals a ≤500-char textarea. Submit → spinner + "Preparing…" (button disabled). Result: three cards (Talking Points / Objection Response / Outreach Draft) each with a `CopyButton`, a "Copy all" button, and a small Sources line. Fallback → amber notice with the message and a link to `/contribute`. Error → red notice with a Retry button; timeout gets its own message ("took too long — try again").
- **`/contribute`:** controlled form — name (prefilled/hidden when identity exists), strategy select, region checkboxes, content textarea, dynamic resource-link inputs. Client-side zod mirrors the server. Success → confirmation panel ("Thanks — your contribution is in the review queue") linking to `/tracker`. 503 → provisioning notice.
- **`/tracker`:** top — status board from `getSectionStatuses()` (8 rows: title, `StatusBadge`, owner, last-updated, link) + summary counts. Below — review queue (client component): pending contributions with submitter, section, regions, content, links, and **Mark incorporated / Decline** buttons → PATCH → optimistic removal + brief confirmation; tabs for incorporated/declined history.

### Cross-cutting

- **Regional filter = URL state.** `RegionFilter` renders "All regions" + 4 chips; selection does `router.replace(pathname + '?region=x', { scroll: false })`. Server components read and validate `searchParams.region` (invalid → all). No param = All. URLs shareable by construction. **Wrap any client component using `useSearchParams` in `<Suspense>`** or static builds fail.
- **Search everywhere:** input in `Nav`; debounced ~100ms; lowercase token match over title + summary + body with title hits scored higher; cap 10 results showing section name, type label, region badges; full keyboard support (arrows/Enter/Escape, `role="listbox"`, `aria-activedescendant`).
- **Nav badge:** pending-contribution count next to "Tracker", fetched server-side in the layout via `countPending()` in try/catch (failure → no badge, never a crash).
- **Copy:** `navigator.clipboard.writeText` with a `document.execCommand('copy')` fallback; 2s "Copied ✓" state; announce via `aria-live`.
- **Responsive:** mobile-first Tailwind — single column by default, `md:` grids; nav wraps (no JS drawer).
- **Accessibility (WCAG 2.1 AA):** semantic landmarks (`header`/`nav`/`main`), one `h1` per page, visible `focus-visible:` rings, 4.5:1 contrast on all badge/chip color pairs (define in `regions.ts`), labels on all controls, `aria-live="polite"` for prep results / copy / form status, respect `prefers-reduced-motion` on the spinner.

---

## 9. Local development

`.env.local` (see `.env.local.example`): for LLM work off the corporate network, set `ANTHROPIC_BASE_URL`/`ANTHROPIC_API_KEY` to a personal key, or skip LLM testing locally and run Phase 5 verification against a **preview deployment** (which has the injected IDDB vars and allowlisted egress). DB access locally requires `IDDB_URL` + key if obtainable; otherwise Phase 6 verification also runs against a preview deployment. Everything else (content, pages, search, filter) works fully offline.

---

## 10. Build phases — execute sequentially, verify each gate

### Phase 0 — Scaffold
`create-next-app` (TypeScript, Tailwind, ESLint, App Router, `src/` dir), add dependencies (§3.2), set `next.config.js` (§3.4), `.env.local.example`, commit to a new GitHub repo.
**Gate:** `npm run lint`, `npx tsc --noEmit`, `npm run build` pass; `npm run dev` serves.

### Phase 1 — Provision, deploy skeleton, run both discovery probes
Implement `/api/health` + `/api/whoami` (+ stub `lib/identity.ts` returning null). Provision the app via iddb MCP (`apps_provision_web` or `apps_create`, `source_kind: git`); push `main`; confirm production deploy.
**Gate:**
- Prod URL loads; `curl <prod>/api/health` → all four env booleans `true`.
- **Discovery A (identity):** open `<prod>/api/whoami` in an authenticated browser; record which header/cookie carries user identity; implement `lib/identity.ts`; then reduce whoami per §7.4. If nothing found: document "no programmatic identity" in README and keep the name field authoritative.
- **Discovery B (DDL):** per §6.2 — execute `db/schema.sql` if a mechanism exists; `/api/health` db → `"ok"`. Otherwise document + proceed.
- Push a feature branch; confirm a preview URL is produced.

### Phase 2 — Author the content library
All 21 content files (§5.5) + `content-schema.ts` + `scripts/validate-content.ts`.
**Gate:** `npx tsx scripts/validate-content.ts` exits 0. Corrupt one file's `status` value → validator fails naming the file → restore.

### Phase 3 — Core libraries
`lib/content.ts`, `search-index.ts`, `regions.ts`, `llm.ts`, `llm-server.ts`, `iddb.ts`.
**Gate:** `tsc --noEmit` clean; a scratch `tsx` run prints 8 section statuses from `getSectionStatuses()` and a 21-entry search index.

### Phase 4 — Pages, nav, filter, search
Home, `/strategies`, `/strategies/[slug]`, layout + nav, `SearchProvider`/`Search`, `RegionFilter`, markdown + callout rendering, badges.
**Gate (dev server):** all 8 slug pages return 200 with their titles; `/strategies?region=latam` filters cards and survives reload; a page with an APJ callout hides it under `?region=latam`; searching a known phrase from each content type surfaces the right result; keyboard-only pass over search + filter; `npm run build` passes. Then run the **standalone check**: `npm run build && node .next/standalone/server.js` (with `.next/static` + `public` copied in) and confirm a strategy page renders — this proves the content tracing config (§3.4).

### Phase 5 — AI prep
`/api/prep` + `/prep` UI per §7.1/§8. Run verification against a preview deployment if local LLM egress is unavailable.
**Gate:**
- curl matrix: **4 regions × 3 scenarios each** (canned objection + vertical; canned objection without vertical; free-text) = 12 calls; every response matches the contract with 3–5 talking points.
- Groundedness spot-check: talking points echo phrases that exist in the library files; no invented pricing/customers.
- Nonsense free text ("customer objects that Oktane is on the moon") → fallback shape; UI shows the amber fallback notice.
- `PREP_TIMEOUT_MS=1` → 504 (then remove).
- Record p50 latency; if >5s, switch `ANTHROPIC_MODEL=claude-haiku-4-5` via `apps_set_env` and re-verify.
- Copy buttons put the exact text on the clipboard.

### Phase 6 — Contributions + tracker
`/api/contributions` (+ `[id]`), `/contribute`, `/tracker`, nav badge. Requires Discovery B complete.
**Gate:** curl POST → 201 and the row is visible via a direct PostgREST GET; bad slug / empty regions → 400 with field errors; `GET ?status=pending` filters; PATCH persists and the badge count decrements; PATCH with a random UUID → 404; full UI flow: submit → confirmation → appears in tracker queue → "Mark incorporated" removes it; a multi-region, multi-link submission round-trips intact (jsonb arrays).

### Phase 7 — Polish, a11y, hardening
`loading.tsx` for `[slug]` and `/tracker`, root `error.tsx`, empty states, 375px mobile pass, focus-visible audit, contrast check on all badges, `aria-live` regions, README (env table, `schema.sql` instructions, content-authoring guide, discovery findings).
**Gate:** lint + tsc + build clean; keyboard-only walkthrough of all six pages; simulate DB down (bogus `IDDB_URL` locally) → tracker/nav/contribute degrade with notices, nothing crashes.

### Phase 8 — Final deploy + production smoke
Push `main`.
**Gate:** `/api/health` all green in prod; one full prep run per region (4 calls); one real contribution submitted and incorporated through the UI; a shareable filtered URL opens correctly in a fresh session; search works from `/tracker`. Record the prod URL in README.

---

## 11. Pitfalls (read before writing code; re-read when debugging)

1. **Gateway ~30s cap.** Every LLM fetch aborts at ≤25s and maps to 504. Never let a route wait past it — the user gets an opaque gateway error instead of yours.
2. **Standalone output + runtime fs.** Without `outputFileTracingIncludes` for `content/**`, pages 500 **only in production**. Always run the Phase 4 standalone check before deploying content-dependent code.
3. **Service-level DB key, no RLS.** Keep `lib/iddb.ts` server-only; all DB access via API routes / server components. Authorization is app code. Accepted model: any authenticated employee; `ADMIN_EMAILS` hook exists if a trustworthy identity header was found.
4. **PostgREST quirks.** Use `jsonb` for array-ish columns; `encodeURIComponent` every filter value; PATCH with no match returns `200 []` (check the array, map to 404); counts come from `Prefer: count=exact` + the `Content-Range` header; upserts need `Prefer: resolution=merge-duplicates`.
5. **LLM proxy headers.** Bearer auth **only** (the proxy rejects `x-api-key`/`anthropic-version` semantics); plain model names; browser → proxy is blocked — never attempt client-side LLM calls.
6. **LLM JSON drift.** All model output goes through `parseJsonFromLLM` + zod; failure is the *fallback path*, never a 500.
7. **Unprovisioned table.** Contribution features must degrade to friendly 503 notices — table creation may lag the first deploy.
8. **`useSearchParams` needs `<Suspense>`** in client components or the static build fails.
9. **No secrets in the repo.** Everything sensitive arrives via injected env or `apps_set_env`; `.env.local` is gitignored; probes return booleans, never values.
