/**
 * Helper for the iddb Postgres REST API (PostgREST), server-side only.
 * IDDB_URL and the key are auto-injected by the platform.
 * The key is SERVICE-LEVEL (no RLS): never expose it or this module client-side.
 */
function iddbFetch(path: string, options: RequestInit = {}) {
  const base = process.env.IDDB_URL?.replace(/\/$/, "");
  const key =
    process.env.IDDB_APP_KEY || process.env.IDDB_SERVICE_KEY || process.env.IDDB_ANON_KEY;
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

export type ContributionStatus = "pending" | "incorporated" | "declined";

export interface Contribution {
  id: string;
  submitted_by: string;
  submitted_email: string | null;
  strategy_slug: string;
  regions: string[]; // jsonb
  content: string;
  resource_links: string[]; // jsonb
  status: ContributionStatus;
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
  const res = await iddbFetch(`/rest/v1/contributions?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
  });
  const rows = (await readOrThrow(res)) as Contribution[];
  // PostgREST returns 200 + [] when no row matched — treat as not found.
  return rows?.[0] ?? null;
}

export async function countPending(): Promise<number> {
  const res = await iddbFetch("/rest/v1/contributions?status=eq.pending&select=id", {
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
