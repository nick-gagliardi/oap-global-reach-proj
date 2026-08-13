"use client";

import { useEffect, useState } from "react";
import { isRegion } from "@/lib/regions";
import { RegionBadge } from "@/components/region-badge";
import { Spinner } from "@/components/spinner";

/**
 * Contribution activity. The human review queue is gone — submissions run
 * through the AI incorporation pipeline (synthesize → validate → publish PR)
 * as they arrive. This view shows what happened: incorporated items link to
 * their publish PR; stuck or failed items ("needs attention") can be re-run
 * from here; declined covers editorial rejects and manual dismissals.
 */

interface Contribution {
  id: string;
  submitted_by: string;
  submitted_email: string | null;
  strategy_slug: string;
  regions: string[];
  content: string;
  resource_links: string[];
  status: "pending" | "incorporated" | "declined" | "failed";
  error?: string | null;
  pr_url?: string | null;
  chapter_title?: string | null;
  created_at: string;
}

type Tab = "attention" | "incorporated" | "declined";

const TAB_LABELS: Record<Tab, string> = {
  attention: "Needs attention",
  incorporated: "Incorporated",
  declined: "Declined",
};

type ViewState =
  | { kind: "loading" }
  | { kind: "ready"; items: Contribution[] }
  | { kind: "unprovisioned" }
  | { kind: "error"; message: string };

/** Pure fetch — returns the next view state, never touches React state itself. */
async function fetchTab(which: Tab): Promise<ViewState> {
  try {
    if (which === "attention") {
      // pending (pipeline never finished — tab closed mid-run) + failed.
      const [pending, failed] = await Promise.all([
        fetch("/api/contributions?status=pending"),
        fetch("/api/contributions?status=failed"),
      ]);
      const pData = await pending.json().catch(() => null);
      const fData = await failed.json().catch(() => null);
      if (pending.status === 503 || failed.status === 503) return { kind: "unprovisioned" };
      if (!pending.ok || !fData) {
        return { kind: "error", message: pData?.error || fData?.error || "Failed to load." };
      }
      const items = [...(pData?.contributions ?? []), ...(fData?.contributions ?? [])].sort(
        (a: Contribution, b: Contribution) => (a.created_at < b.created_at ? 1 : -1),
      );
      return { kind: "ready", items };
    }
    const res = await fetch(`/api/contributions?status=${which}`);
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) return { kind: "ready", items: data.contributions };
    if (res.status === 503) return { kind: "unprovisioned" };
    return { kind: "error", message: data?.error || `Failed to load (${res.status}).` };
  } catch {
    return { kind: "error", message: "Network error loading contributions." };
  }
}

export function ReviewQueue() {
  const [tab, setTab] = useState<Tab>("incorporated");
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [notice, setNotice] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchTab(tab).then((next) => {
      if (alive) setState(next);
    });
    return () => {
      alive = false;
    };
  }, [tab]);

  /** Re-drive the incorporation pipeline for a stuck/failed contribution. */
  async function retry(c: Contribution) {
    setRetryingId(c.id);
    setNotice(null);
    try {
      const exRes = await fetch(`/api/contributions/${c.id}/extract`, { method: "POST" });
      const exData = await exRes.json().catch(() => null);
      if (!exRes.ok) {
        setNotice(exData?.error || `Could not read attachments (${exRes.status}).`);
        return;
      }
      const sharing = (exData?.errors ?? []).filter((e: { sharing?: boolean }) => e.sharing);
      if (sharing.length > 0) {
        setNotice(sharing.map((e: { reason: string }) => e.reason).join(" "));
        return;
      }
      const incRes = await fetch(`/api/contributions/${c.id}/incorporate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extracts: exData?.extracts ?? [] }),
      });
      const incData = await incRes.json().catch(() => null);
      if (incRes.ok && incData?.ok) {
        setNotice(`Incorporated — PR opened for "${incData.chapterTitle ?? c.strategy_slug}".`);
        setState((prev) =>
          prev.kind === "ready"
            ? { kind: "ready", items: prev.items.filter((i) => i.id !== c.id) }
            : prev,
        );
      } else if (incRes.status === 422 && incData?.rejected) {
        setNotice(`Declined by the reviewer: ${incData.reason ?? "not usable as strategy content."}`);
        setState((prev) =>
          prev.kind === "ready"
            ? { kind: "ready", items: prev.items.filter((i) => i.id !== c.id) }
            : prev,
        );
      } else {
        setNotice(incData?.error || `Incorporation failed (${incRes.status}).`);
      }
    } catch {
      setNotice("Network error during retry.");
    } finally {
      setRetryingId(null);
    }
  }

  /** Manual dismiss for junk (kept from the old queue as an admin override). */
  async function dismiss(id: string) {
    if (state.kind !== "ready") return;
    const prevItems = state.items;
    setState({ kind: "ready", items: prevItems.filter((c) => c.id !== id) });
    try {
      const res = await fetch(`/api/contributions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "declined" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setNotice(data?.error || `Update failed (${res.status}) — restored the item.`);
        setState({ kind: "ready", items: prevItems });
        return;
      }
      setNotice("Dismissed.");
    } catch {
      setNotice("Network error — restored the item.");
      setState({ kind: "ready", items: prevItems });
    }
  }

  const tabCls = (t: Tab) =>
    `rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500 ${
      tab === t ? "bg-okta-600 text-white shadow-sm" : "text-neutral-600 hover:text-neutral-900"
    }`;

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Contribution activity"
        className="inline-flex gap-1 rounded-lg border border-neutral-200 bg-white p-1"
      >
        {(["incorporated", "attention", "declined"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => {
              setTab(t);
              setState({ kind: "loading" });
            }}
            className={tabCls(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {notice && <p className="text-sm text-neutral-600">{notice}</p>}
      </div>

      {state.kind === "loading" && (
        <div className="py-6">
          <Spinner label="Loading contributions…" />
        </div>
      )}

      {state.kind === "unprovisioned" && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          The contribution store isn&apos;t provisioned yet — run <code>db/schema.sql</code> via
          platform tooling (see the README) and this view will light up.
        </p>
      )}

      {state.kind === "error" && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          {state.message}
        </p>
      )}

      {state.kind === "ready" &&
        (state.items.length === 0 ? (
          <p className="text-sm text-neutral-600">
            {tab === "attention"
              ? "Nothing needs attention — every submission has been processed."
              : `Nothing ${tab === "incorporated" ? "incorporated" : "declined"} yet.`}
          </p>
        ) : (
          <ul className="space-y-3">
            {state.items.map((c) => (
              <li
                key={c.id}
                className={`rounded-xl border border-neutral-200 bg-white p-4 ${
                  c.status === "failed"
                    ? "border-l-4 border-l-red-400"
                    : c.status === "pending"
                      ? "border-l-4 border-l-amber-400"
                      : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-neutral-900">{c.submitted_by}</span>
                    <span className="text-neutral-500">→ {c.strategy_slug}</span>
                    {c.chapter_title ? (
                      <span className="text-neutral-500">· “{c.chapter_title}”</span>
                    ) : null}
                    {c.regions.filter(isRegion).map((r) => (
                      <RegionBadge key={r} region={r} />
                    ))}
                  </div>
                  <span className="text-xs text-neutral-500">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>

                {c.status === "failed" && c.error ? (
                  <p className="mt-2 rounded-md bg-red-50 p-2 text-xs leading-relaxed text-red-800">
                    {c.error}
                  </p>
                ) : null}
                {c.status === "pending" ? (
                  <p className="mt-2 text-xs text-amber-700">
                    Pipeline never completed (submitter may have closed the tab) — retry below.
                  </p>
                ) : null}

                <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">{c.content}</p>
                {c.resource_links.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {c.resource_links.map((l) => (
                      <li key={l}>
                        <a
                          href={l}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all font-medium text-okta-600 underline"
                        >
                          {l}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {c.status === "incorporated" && c.pr_url ? (
                    <a
                      href={c.pr_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
                    >
                      View publish PR →
                    </a>
                  ) : null}
                  {(c.status === "pending" || c.status === "failed") && (
                    <>
                      <button
                        type="button"
                        disabled={retryingId === c.id}
                        onClick={() => retry(c)}
                        className="rounded-md bg-okta-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-okta-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
                      >
                        {retryingId === c.id ? "Incorporating…" : "Run incorporation"}
                      </button>
                      <button
                        type="button"
                        onClick={() => dismiss(c.id)}
                        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
