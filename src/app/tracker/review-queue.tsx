"use client";

import { useEffect, useState } from "react";
import { isRegion } from "@/lib/regions";
import { RegionBadge } from "@/components/region-badge";
import { Spinner } from "@/components/spinner";

interface Contribution {
  id: string;
  submitted_by: string;
  submitted_email: string | null;
  strategy_slug: string;
  regions: string[];
  content: string;
  resource_links: string[];
  status: "pending" | "incorporated" | "declined";
  created_at: string;
}

type Tab = "pending" | "incorporated" | "declined";

type ViewState =
  | { kind: "loading" }
  | { kind: "ready"; items: Contribution[] }
  | { kind: "unprovisioned" }
  | { kind: "error"; message: string };

/** Pure fetch — returns the next view state, never touches React state itself. */
async function fetchQueue(which: Tab): Promise<ViewState> {
  try {
    const res = await fetch(`/api/contributions?status=${which}`);
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) return { kind: "ready", items: data.contributions };
    if (res.status === 503) return { kind: "unprovisioned" };
    return { kind: "error", message: data?.error || `Failed to load (${res.status}).` };
  } catch {
    return { kind: "error", message: "Network error loading the queue." };
  }
}

export function ReviewQueue() {
  const [tab, setTab] = useState<Tab>("pending");
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [notice, setNotice] = useState<string | null>(null);

  // Loading state is set by the initializer / tab clicks, not here; setState
  // only runs in the promise callback (and never after unmount or a tab switch).
  useEffect(() => {
    let alive = true;
    fetchQueue(tab).then((next) => {
      if (alive) setState(next);
    });
    return () => {
      alive = false;
    };
  }, [tab]);

  async function setStatus(id: string, status: "incorporated" | "declined") {
    if (state.kind !== "ready") return;
    const prevItems = state.items;
    setState({ kind: "ready", items: prevItems.filter((c) => c.id !== id) });
    try {
      const res = await fetch(`/api/contributions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setNotice(data?.error || `Update failed (${res.status}) — restored the item.`);
        setState({ kind: "ready", items: prevItems });
        return;
      }
      setNotice(`Marked as ${status}.`);
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
        aria-label="Contribution status"
        className="inline-flex gap-1 rounded-lg border border-neutral-200 bg-white p-1"
      >
        {(["pending", "incorporated", "declined"] as const).map((t) => (
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
            {t[0].toUpperCase() + t.slice(1)}
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
          platform tooling (see the README) and this queue will light up.
        </p>
      )}

      {state.kind === "error" && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          {state.message}
        </p>
      )}

      {state.kind === "ready" &&
        (state.items.length === 0 ? (
          <p className="text-sm text-neutral-600">Nothing {tab} right now.</p>
        ) : (
          <ul className="space-y-3">
            {state.items.map((c) => (
              <li
                key={c.id}
                className={`rounded-xl border border-neutral-200 bg-white p-4 ${
                  tab === "pending" ? "border-l-4 border-l-okta-500" : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-neutral-900">{c.submitted_by}</span>
                    <span className="text-neutral-500">→ {c.strategy_slug}</span>
                    {c.regions.filter(isRegion).map((r) => (
                      <RegionBadge key={r} region={r} />
                    ))}
                  </div>
                  <span className="text-xs text-neutral-500">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
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
                {tab === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus(c.id, "incorporated")}
                      className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
                    >
                      Mark incorporated
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus(c.id, "declined")}
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
