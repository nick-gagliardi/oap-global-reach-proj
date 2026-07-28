"use client";

import { useState } from "react";
import Link from "next/link";
import { REGIONS, REGION_LABELS, type Region } from "@/lib/regions";
import { Chip, FieldLabel } from "@/components/chip";

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500";

type ViewState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "done" }
  | { kind: "error"; message: string; unprovisioned?: boolean };

export function ContributeForm({
  strategies,
  initialStrategySlug = "",
}: {
  strategies: { slug: string; title: string }[];
  initialStrategySlug?: string;
}) {
  const [name, setName] = useState("");
  const [strategySlug, setStrategySlug] = useState(initialStrategySlug);
  const [regions, setRegions] = useState<Region[]>([]);
  const [content, setContent] = useState("");
  const [links, setLinks] = useState<string[]>([""]);
  const [state, setState] = useState<ViewState>({ kind: "idle" });

  const toggleRegion = (r: Region) =>
    setRegions((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const validationError = (): string | null => {
    if (!name.trim()) return "Add your name.";
    if (!strategySlug) return "Pick the strategy section this belongs to.";
    if (regions.length === 0) return "Tag at least one region.";
    if (content.trim().length < 10) return "Describe the content (at least 10 characters).";
    for (const l of links) {
      const v = l.trim();
      if (v && !/^https?:\/\/.+/.test(v)) return `"${v}" is not a valid http(s) link.`;
    }
    return null;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validationError();
    if (problem) {
      setState({ kind: "error", message: problem });
      return;
    }
    setState({ kind: "submitting" });
    try {
      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submittedBy: name.trim(),
          strategySlug,
          regions,
          content: content.trim(),
          resourceLinks: links.map((l) => l.trim()).filter(Boolean),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 201 && data?.ok) {
        setState({ kind: "done" });
      } else if (res.status === 503) {
        setState({
          kind: "error",
          unprovisioned: true,
          message:
            "The contribution store isn't provisioned yet. Ping the hub owner — your content is safe to submit once it's set up.",
        });
      } else {
        setState({ kind: "error", message: data?.error || `Submission failed (${res.status}).` });
      }
    } catch {
      setState({ kind: "error", message: "Network error — try again." });
    }
  }

  if (state.kind === "done") {
    return (
      <div
        role="status"
        className="rounded-xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-900"
      >
        <p className="text-lg font-semibold">In the queue ✓</p>
        <p className="mt-1.5 text-sm leading-relaxed">
          Thanks — your contribution is in the review queue and will be formatted into the
          section soon.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
          <Link href="/tracker" className="underline underline-offset-2">
            View the tracker →
          </Link>
          <button
            type="button"
            onClick={() => {
              setContent("");
              setLinks([""]);
              setState({ kind: "idle" });
            }}
            className="underline underline-offset-2"
          >
            Submit another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      {/* 01 — Who */}
      <div className="space-y-3">
        <FieldLabel step="01">
          <label htmlFor="c-name">
            Who are you? <span className="font-normal text-red-700">*</span>
          </label>
        </FieldLabel>
        <input
          id="c-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          required
          placeholder="Your name"
          className={`${inputCls} max-w-sm`}
        />
      </div>

      {/* 02 — Where it belongs */}
      <div className="space-y-3">
        <FieldLabel step="02">
          <label htmlFor="c-strategy">
            Which strategy does it belong to? <span className="font-normal text-red-700">*</span>
          </label>
        </FieldLabel>
        <select
          id="c-strategy"
          value={strategySlug}
          onChange={(e) => setStrategySlug(e.target.value)}
          required
          className={`${inputCls} max-w-sm`}
        >
          <option value="">Select a section…</option>
          {strategies.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      {/* 03 — Regions */}
      <fieldset className="space-y-3">
        <legend>
          <FieldLabel step="03">
            Which regions does it cover? <span className="font-normal text-red-700">*</span>
          </FieldLabel>
        </legend>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <Chip key={r} selected={regions.includes(r)} onClick={() => toggleRegion(r)}>
              {REGION_LABELS[r]}
            </Chip>
          ))}
        </div>
        <p className="text-xs text-neutral-500">Pick every region it applies to.</p>
      </fieldset>

      {/* 04 — The content */}
      <div className="space-y-3">
        <FieldLabel step="04">
          <label htmlFor="c-content">
            The output itself <span className="font-normal text-red-700">*</span>
          </label>
        </FieldLabel>
        <textarea
          id="c-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={7}
          maxLength={5000}
          required
          placeholder="Paste the content, or a summary plus where to find it."
          className={inputCls}
        />
        <p className="text-xs text-neutral-500">{content.length}/5000</p>
      </div>

      {/* 05 — Links */}
      <div className="space-y-3">
        <FieldLabel step="05">Supporting links</FieldLabel>
        {links.map((l, i) => (
          <div key={i} className="flex max-w-lg gap-2">
            <input
              aria-label={`Supporting link ${i + 1}`}
              value={l}
              onChange={(e) =>
                setLinks((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
              }
              placeholder="https://…"
              className={inputCls}
            />
            {links.length > 1 && (
              <button
                type="button"
                aria-label={`Remove link ${i + 1}`}
                onClick={() => setLinks((prev) => prev.filter((_, j) => j !== i))}
                className="rounded-md border border-neutral-300 px-2.5 text-sm text-neutral-600 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {links.length < 10 && (
          <button
            type="button"
            onClick={() => setLinks((prev) => [...prev, ""])}
            className="text-sm font-medium text-okta-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500"
          >
            + Add another link
          </button>
        )}
      </div>

      <div aria-live="polite">
        {state.kind === "error" && (
          <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            {state.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={state.kind === "submitting"}
        className="rounded-md bg-okta-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-okta-700 disabled:cursor-not-allowed disabled:bg-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500"
      >
        {state.kind === "submitting" ? "Submitting…" : "Submit contribution"}
      </button>
    </form>
  );
}
