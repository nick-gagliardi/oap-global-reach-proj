/**
 * Helper for the iddb Postgres REST API (PostgREST), server-side only.
 * IDDB_URL and the key are auto-injected by the platform.
 * The key is SERVICE-LEVEL (no RLS): never expose it or this module client-side.
 */
function iddbFetch(path: string, options: RequestInit = {}) {
  const base = (
    process.env.IDDB_URL ||
    process.env.IDDB_REST_URL ||
    process.env.IDDB_API_URL ||
    process.env.IDDB_API_BASE
  )?.replace(/\/$/, "");
  const key =
    process.env.IDDB_APP_KEY ||
    process.env.IDDB_SERVICE_KEY ||
    process.env.IDDB_ANON_KEY ||
    process.env.IDDB_RESOURCE_KEY;
  // Missing env = store not available yet (e.g. local dev) — same graceful
  // degradation path as an unprovisioned table.
  if (!base || !key) throw new UnprovisionedError();
  return fetch(`${base}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers ?? {}),
    },
  });
}

export type ContributionStatus = "pending" | "incorporated" | "declined" | "failed";

export interface Contribution {
  id: string;
  submitted_by: string;
  submitted_email: string | null;
  strategy_slug: string;
  regions: string[]; // jsonb
  content: string;
  resource_links: string[]; // jsonb
  status: ContributionStatus;
  /** Pipeline failure detail (status 'failed'). Migration 002. */
  error?: string | null;
  /** PR opened by the incorporation pipeline (status 'incorporated'). Migration 002. */
  pr_url?: string | null;
  /** Chapter the pipeline added/updated. Migration 002. */
  chapter_title?: string | null;
  /** Synthesized chapter body (live-published at render time). Migration 003. */
  chapter_markdown?: string | null;
  /** For mode 'replace': the chapter title being replaced. Migration 003. */
  replace_title?: string | null;
  /** 'append' | 'replace'. Migration 003. */
  mode?: string | null;
  /** Submitter-attached file text (org-restricted Google files). Migration 004. */
  attachments?: Array<{ name: string; text: string }>;
  created_at: string;
  updated_at: string;
}

export class UnprovisionedError extends Error {
  constructor() {
    super("contributions store not provisioned yet");
    this.name = "UnprovisionedError";
  }
}

/** Detect "table doesn't exist yet" so callers can degrade to a 503 notice. */
function isUnprovisioned(status: number, bodyText: string): boolean {
  return (
    status === 404 || bodyText.includes("42P01") || /relation .* does not exist/.test(bodyText)
  );
}

async function readOrThrow(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!res.ok) {
    if (isUnprovisioned(res.status, text)) throw new UnprovisionedError();
    throw new Error(`iddb ${res.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

export async function insertContribution(
  row: Omit<Contribution, "id" | "status" | "created_at" | "updated_at">,
): Promise<Contribution> {
  const res = await iddbFetch("/rest/v1/contributions", {
    method: "POST",
    body: JSON.stringify(row),
  });
  const rows = (await readOrThrow(res)) as Contribution[];
  return rows[0];
}

export async function listContributions(status?: ContributionStatus): Promise<Contribution[]> {
  const filter = status ? `&status=eq.${encodeURIComponent(status)}` : "";
  const res = await iddbFetch(`/rest/v1/contributions?select=*&order=created_at.desc${filter}`);
  return (await readOrThrow(res)) as Contribution[];
}

export async function updateContributionStatus(
  id: string,
  status: ContributionStatus,
): Promise<Contribution | null> {
  return patchContribution(id, { status });
}

/** Fetch a single contribution by id. */
export async function getContribution(id: string): Promise<Contribution | null> {
  const res = await iddbFetch(`/rest/v1/contributions?id=eq.${encodeURIComponent(id)}&select=*`);
  const rows = (await readOrThrow(res)) as Contribution[];
  return rows?.[0] ?? null;
}

/** Patch arbitrary pipeline fields (status, error, chapter data). */
export async function patchContribution(
  id: string,
  fields: Partial<
    Pick<
      Contribution,
      "status" | "error" | "pr_url" | "chapter_title" | "chapter_markdown" | "replace_title" | "mode"
    >
  >,
): Promise<Contribution | null> {
  const res = await iddbFetch(`/rest/v1/contributions?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
  });
  const rows = (await readOrThrow(res)) as Contribution[];
  // PostgREST returns 200 + [] when no row matched — treat as not found.
  return rows?.[0] ?? null;
}

/**
 * All live (incorporated) addendum chapters, grouped by strategy slug in
 * created_at order. ONE query per request; returns an empty map on ANY
 * failure — a DB hiccup must degrade pages to file-only content, never break
 * them.
 */
export async function listIncorporatedBySlug(): Promise<Map<string, Contribution[]>> {
  const map = new Map<string, Contribution[]>();
  try {
    const res = await iddbFetch(
      "/rest/v1/contributions?status=eq.incorporated&chapter_markdown=not.is.null&select=*&order=created_at.asc",
    );
    if (!res.ok) return map;
    const rows = (await res.json()) as Contribution[];
    for (const row of rows) {
      if (!row.chapter_title || !row.chapter_markdown) continue;
      const list = map.get(row.strategy_slug) ?? [];
      list.push(row);
      map.set(row.strategy_slug, list);
    }
  } catch {
    // Unprovisioned / network / anything: file-only content.
  }
  return map;
}

export async function countPending(): Promise<number> {
  // "Needs attention" count: pending (pipeline never completed) + failed.
  const res = await iddbFetch("/rest/v1/contributions?status=in.(pending,failed)&select=id", {
    headers: { Prefer: "count=exact", Range: "0-0" },
  });
  if (!res.ok) {
    const text = await res.text();
    if (isUnprovisioned(res.status, text)) throw new UnprovisionedError();
    throw new Error(`iddb ${res.status}`);
  }
  // Content-Range: 0-0/N
  const range = res.headers.get("content-range") ?? "";
  const total = Number(range.split("/")[1]);
  return Number.isFinite(total) ? total : 0;
}
