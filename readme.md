# 🌐 OAP Global Reach Resource Hub

**Owner:** Nick Gagliardi | **Pillar:** Global Reach | **Lead:** Marco Becerra | **Status:** Draft | **Last Updated:** July 28, 2026

> A hosted internal site that consolidates all Global Reach strategy outputs into a single, searchable resource for Sales and CS reps — with an AI-assisted conversation prep tool for global customer Oktane conversations.

---

## ⚠️ Problem

The Global Reach pillar has 8 active strategies, each producing outputs (ICPs, blueprints, success stories, regional insights) with no unified home. Sales/CS reps who need to recruit global customers to Oktane have no single place to find localized talking points, success proof, or partner context. Outputs end up in scattered docs, Slack threads, and email chains — and aren't reusable.

**The core gap:** Every strategy produces an output. Nobody owns where those outputs live or how they're made usable by the people who need them most.

---

## 🎯 Goal

Build a hosted internal site that:

1. Serves as the single source of truth for all Global Reach strategy outputs
2. Helps any Sales/CS rep prep for a global customer Oktane conversation in under 2 minutes
3. Can absorb teammates' outputs as they're produced — without requiring them upfront

**Approach:** Content-first. Nick writes the information architecture and placeholder copy first, then wraps the UI around it. The site ships with real value from day one, not empty shells.

---

## 👥 Users

| User | Primary Need | How They Use It |
|------|-------------|-----------------|
| Sales/CS rep (primary) | Regional talking points, objection responses, success stories before a customer call | Visit before a customer conversation; filter by region |
| OAP Global Reach teammates | A home for their strategy outputs | Submit content via contribution form; reference during bi-weekly syncs |
| Marco (team lead) | Visibility into progress; something to point to stakeholders | Review progress tracker; share link with leadership |

---

## 📈 Success Metrics

- Site is live and shareable by **Aug 8, 2026**
- All 8 strategy sections have at least placeholder content at launch
- AI conversation prep tool returns useful output for all 4 regions (LATAM, APJ, EMEA, PubSec)
- At least 3 teammates have contributed real content before Oktane (**Sept 22, 2026**)

---

## ✨ Features

### ⭐ P0 — Must have at launch

#### 1. Strategy Sections (8 total)

One dedicated page per Global Reach strategy. Each section includes:

- **Purpose summary** — what this strategy is trying to accomplish and why it matters for global attendance
- **Key outputs** — populated initially by Nick with placeholder content, filled in by teammates over time
- **Regional callouts** — LATAM / APJ / EMEA / PubSec tags on all content
- **Resources** — links to any supporting materials or teammate deliverables

**Sections:**

1. Ideal Customer Profile
2. White Glove Target Accounts
3. Vertical Value Blueprints
4. Channel Partner Distribution
5. Demo Confidence Resources
6. Previous Attendance Successes
7. Regional Pricing & Packaging
8. Attendance Value Insights

**Acceptance Criteria:**
- Each section is accessible via its own URL path (e.g. `/strategies/success-stories`)
- Each section renders correctly on mobile and desktop
- Regional tags are present and filterable
- Placeholder content exists for all 8 sections at launch

---

#### 2. AI-Assisted Conversation Prep

A rep selects a **region + customer vertical + scenario** (e.g. "customer says it's too expensive to travel") and receives:

- Localized talking points (3–5 bullets)
- Objection response (1–2 paragraphs)
- Draft outreach message (copy-paste ready)

Nick writes the content library that feeds this tool. The AI synthesizes and formats — it does not generate beyond what's in the library. No external data required to launch.

**Acceptance Criteria:**
- Tool returns output in under 5 seconds
- All 4 regions return results for at least 3 common objection scenarios at launch
- Output is cleanly formatted and copyable with one click
- A fallback message is shown if no matching content is found

---

#### 3. Regional Filter

All content filterable by: **LATAM / APJ / EMEA / PubSec**

**Acceptance Criteria:**
- Filter applies across all 8 strategy sections simultaneously
- Filtered state is reflected in the URL (shareable link)
- "All regions" is the default state

---

### ⚡ P1 — High value, build after P0

#### 4. Contribution Form

A simple form teammates fill out to submit their strategy output. Submissions are stored in iddb Postgres and Nick is notified to review and incorporate them. Keeps the contribution barrier low for non-technical teammates — no GitHub, no CMS.

**Fields:** Name, strategy section, region(s), content or summary, links to supporting materials

**Acceptance Criteria:**
- Submission is written to the `contributions` table in iddb Postgres
- Nick receives a notification on submission
- Submitter sees a confirmation message
- Form is accessible to any authenticated Okta employee

---

#### 5. Search

Full-text search across all strategy sections and content entries.

**Acceptance Criteria:**
- Results returned within 2 seconds
- Results surface the section name and region tags
- Search input is present on every page

---

### ⏳ P2 — Nice to have

#### 6. Progress Tracker

A lightweight status board showing which strategy sections are populated vs. pending, with last-updated timestamps. Reads from iddb Postgres.

**Acceptance Criteria:**
- Status visible without scrolling on a standard laptop screen
- Updates automatically when content is added or modified

---

## 🏗️ Content Architecture

```
global-reach-hub/
├── /                       # Home — what this is, how to use it, quick links
├── /prep                   # AI Conversation Prep tool
├── /strategies/
│   ├── /icp
│   ├── /target-accounts
│   ├── /value-blueprints
│   ├── /channel-partners
│   ├── /demo-resources
│   ├── /success-stories
│   ├── /regional-pricing
│   └── /attendance-value
├── /contribute             # Submission form for teammates
└── /tracker                # Progress tracker (P2)
```

**Content library structure (feeds the AI layer):**

```
/content/
├── regions/
│   ├── latam.md            # LATAM priorities, market context, tone guidance
│   ├── apj.md              # APJ priorities, market context, tone guidance
│   ├── emea.md             # EMEA priorities, market context, tone guidance
│   └── pubsec.md           # PubSec priorities, compliance context, tone guidance
├── objections/
│   ├── travel-cost.md
│   ├── digital-attendance.md
│   ├── attended-last-year.md
│   ├── timing-conflict.md
│   └── no-budget.md
└── verticals/
    ├── financial-services.md
    ├── healthcare.md
    ├── technology.md
    └── public-sector.md
```

---

## ⚙️ Technical Architecture

### Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 14 (App Router, `output: standalone`) | SSR for fast loads; standalone output required for iddb container deployment |
| Hosting | iddb | Internal Okta hosting platform; built-in employee auth; no external hosting dependency |
| Database | iddb Postgres | Stores contribution form submissions; managed, zero ops overhead |
| AI Layer | Claude API (`claude-sonnet-4-5`) | Strong instruction following; fast responses; structured output support |
| Content | Markdown files in `/content` | No CMS dependency; version-controlled in git; Nick formats teammate submissions into markdown |
| Styling | Tailwind CSS | Fast iteration; no design system dependency |

### Database Schema

**`contributions`** — stores teammate form submissions

```sql
CREATE TABLE contributions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by text       NOT NULL,
  strategy_section text   NOT NULL,
  regions     text[]      NOT NULL,
  content     text        NOT NULL,
  resource_links text,
  status      text        DEFAULT 'pending',  -- pending | incorporated | declined
  created_at  timestamptz DEFAULT now()
);
```

**`content_sections`** — tracks populate/pending status per strategy section (feeds P2 progress tracker)

```sql
CREATE TABLE content_sections (
  id           uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text  UNIQUE NOT NULL,
  title        text  NOT NULL,
  status       text  DEFAULT 'placeholder',  -- placeholder | in-progress | complete
  last_updated timestamptz DEFAULT now()
);
```

### AI Layer Design

The conversation prep tool uses a structured prompt that combines:

1. **Region context** — loaded from `/content/regions/{region}.md`
2. **Vertical context** — loaded from `/content/verticals/{vertical}.md`
3. **Objection/scenario** — matched to `/content/objections/{scenario}.md` or handled as free-text input
4. **System prompt** — instructs the model to return structured output: talking points array, objection response string, draft outreach string

The model synthesizes and formats Nick's written content — it does not generate new factual claims. The content library is the ground truth.

### Content Model

Every strategy section is a markdown file with required frontmatter:

```yaml
---
title: "Previous Attendance Successes"
strategy_number: 6
owner: "Alina Bergelson"
regions: [LATAM, APJ, EMEA, PubSec]
status: placeholder   # placeholder | in-progress | complete
last_updated: "2026-07-28"
---
```

---

## 📐 Technical Guidelines

### Development Standards

- TypeScript throughout — no plain JavaScript files
- Components in `/components`, pages in `/app` (Next.js App Router)
- No heavy UI component libraries — keep the dependency footprint minimal
- All API keys and secrets via `apps_set_env` on iddb; never committed to the repo
- Lint and type-check must pass before merge to `main`

### Content Authoring Standards

- All content written in Markdown with required frontmatter (see Content Model above)
- Regional content must be tagged with at least one of: `LATAM`, `APJ`, `EMEA`, `PubSec`
- Tone: direct, practical, sales-ready — not marketing copy
- Placeholder content marked `[PLACEHOLDER]` so it's easy to find and replace
- Objection responses should start with an acknowledgment, not a rebuttal

### Contribution Workflow (for non-technical teammates)

1. Teammate fills out the contribution form on the site
2. Submission is written to `contributions` table in iddb Postgres
3. Nick receives a notification and reviews the submission
4. Nick formats it into the appropriate markdown content file
5. Commit to `main` triggers iddb auto-redeploy — content is live within minutes

### Deployment Process

- Initial deploy via `apps_provision_web` or `apps_create` (source_kind: git) targeting iddb
- `main` branch → production (iddb auto-deploy on push)
- Feature/content branches → iddb preview deployments (shareable URLs for review)
- Secrets and env vars managed via `apps_set_env` — never in the repo
- Claude API key stored as a secret via iddb env management

---

## 🔒 Non-Functional Requirements

| Requirement | Target |
|------------|--------|
| Page load time | < 2 seconds on broadband |
| Mobile responsiveness | Fully usable on a phone (critical for reps on the go) |
| Accessibility | WCAG 2.1 AA minimum |
| Browser support | Chrome, Firefox, Safari, Edge — latest 2 major versions |
| Uptime | iddb platform SLA |
| Security | Access restricted to authenticated Okta employees via iddb auth; no PII stored beyond form submissions |
| AI response time | < 5 seconds for conversation prep output |

---

## 📅 Build Phases

### Phase 1: Foundation (July 28 – Aug 8) — No external dependencies

- Finalize information architecture and navigation structure
- Write placeholder content for all 8 strategy sections (markdown files with frontmatter)
- Build site shell: home page, all 8 strategy section pages, regional filter
- Provision iddb app + Postgres tables; deploy — shareable URL ready for Marco at next sync

### Phase 2: AI Layer (Aug 9 – Aug 22) — No external dependencies

- Write full content library: 4 regions × 5 objections × 4 verticals
- Build conversation prep UI (region selector, vertical selector, scenario input)
- Integrate Claude API via Next.js API route; implement structured prompt template
- Test all region/scenario/vertical combinations; tune as needed

### Phase 3: Open to Team (Aug 23 – Sept 5) — Soft dependency on teammates

- Build and deploy contribution form → writes to iddb Postgres
- Demo at bi-weekly team sync; share URL with Marco and Global Reach team
- Invite teammates to submit their strategy outputs
- Incorporate any existing outputs teammates have already produced

### Phase 4: Final Polish (Sept 6 – Sept 19)

- Final content pass across all 8 sections
- Incorporate remaining teammate contributions
- Accessibility and performance audit
- Prepare a 3-minute demo walkthrough for potential Oktane onsite use

---

## 🚫 Out of Scope (v1)

- Real-time Salesforce/CRM data integration
- Syncing with Highspot, Matik, or other internal Okta systems
- Multi-language support (English only for v1)
- Automated content ingestion from teammate documents

---

## 📊 Timeline

| Milestone | Date |
|-----------|------|
| Project kicked off | July 27, 2026 |
| Phase 1 complete — site live with placeholder content | Aug 8, 2026 |
| Phase 2 complete — AI conversation prep live | Aug 22, 2026 |
| Team onboarded — contribution form open | ~Aug 25, 2026 |
| Content mature — all available outputs incorporated | Sept 5, 2026 |
| Final polish complete | Sept 19, 2026 |
| **Oktane** | **Sept 22–24, 2026** |

---

## ⚠️ Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Content is thin at launch | Medium | Medium | Nick writes placeholder content himself — site ships with real value regardless of teammate contributions |
| Low teammate adoption | Medium | Low | Demo early at Phase 3 sync; keep contribution barrier minimal (form, not a PR or CMS login) |
| AI responses are off-brand or unhelpful | Medium | High | All AI output grounded in Nick's written content library — no open-ended generation |
| Timeline is tight alongside full-time role | High | High | Phase 1 is writing-heavy (Nick's fastest mode); AI layer can ship as a simplified v1 if needed |
| A similar resource already exists internally | Low | High | Verified gap during brainstorm — no such resource currently exists for Global Reach |

---

## ❓ Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | What is Nick's confirmed preferred stack? | Nick | ✅ Resolved — Next.js + iddb |
| 2 | Should the site live on a Vercel subdomain or an Okta-internal URL? | Nick + Marco | ✅ Resolved — iddb internal hosting |
| 3 | Does Okta have an internal tool hosting standard this should follow? | Nick | Open |
| 4 | Should content be accessible to all Okta employees or restricted to OAP members? | Marco | ✅ Resolved — iddb auth restricts to authenticated Okta employees |
| 5 | Will teammate contributions go through Nick as a gatekeeper, or eventually contribute directly? | Nick | Open |
