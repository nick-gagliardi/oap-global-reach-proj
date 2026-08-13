"use client";

import { useState } from "react";
import Link from "next/link";
import { REGIONS, REGION_LABELS, type Region } from "@/lib/regions";
import { Chip, FieldLabel } from "@/components/chip";

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500";

type PipelineStep = "extract" | "synthesize";

type ViewState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "pipeline"; step: PipelineStep }
  | { kind: "done"; prUrl?: string; chapterTitle?: string }
  | { kind: "rejected"; reason: string }
  | {
      kind: "error";
      message: string;
      unprovisioned?: boolean;
      /** Set when the pipeline can be re-driven for an already-created contribution. */
      retryId?: string;
      sharingErrors?: string[];
    };

const STEP_LABELS: Array<{ key: PipelineStep; label: string }> = [
  { key: "extract", label: "Reading attachments" },
  { key: "synthesize", label: "Synthesizing & formatting" },
];

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

  /** Drive the two pipeline steps for an existing contribution row. */
  async function runPipeline(id: string) {
    // Step 1 — read Google Doc attachments.
    setState({ kind: "pipeline", step: "extract" });
    const exRes = await fetch(`/api/contributions/${id}/extract`, { method: "POST" });
    const exData = await exRes.json().catch(() => null);
    if (!exRes.ok) {
      setState({
        kind: "error",
        retryId: id,
        message: exData?.error || `Could not read attachments (${exRes.status}).`,
      });
      return;
    }
    const sharingErrors: string[] = (exData?.errors ?? [])
      .filter((e: { sharing?: boolean }) => e.sharing)
      .map((e: { reason: string }) => e.reason);
    if (sharingErrors.length > 0) {
      setState({
        kind: "error",
        retryId: id,
        sharingErrors,
        message:
          "One or more Google Docs aren't readable by the hub. Fix the sharing settings below, then retry — your submission is saved.",
      });
      return;
    }

    // Step 2 — synthesize, validate, open the publish PR.
    setState({ kind: "pipeline", step: "synthesize" });
    const incRes = await fetch(`/api/contributions/${id}/incorporate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extracts: exData?.extracts ?? [] }),
    });
    const incData = await incRes.json().catch(() => null);
    if (incRes.ok && incData?.ok) {
      setState({ kind: "done", prUrl: incData.prUrl, chapterTitle: incData.chapterTitle });
    } else if (incRes.status === 422 && incData?.rejected) {
      setState({
        kind: "rejected",
        reason:
          incData.reason ||
          "The reviewer judged this material not usable as strategy content.",
      });
    } else {
      setState({
        kind: "error",
        retryId: id,
        message: incData?.error || `Incorporation failed (${incRes.status}). Your submission is saved — you can retry.`,
      });
    }
  }

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
        const id: string | undefined = data?.contribution?.id;
        if (id) {
          await runPipeline(id);
        } else {
          // Store accepted it but returned no id — extremely unlikely; treat as queued.
          setState({ kind: "done" });
        }
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

  if (state.kind === "pipeline") {
    const activeIdx = STEP_LABELS.findIndex((s) => s.key === state.step);
    return (
      <div role="status" className="rounded-xl border border-okta-200 bg-okta-50/50 p-6">
        <p className="text-lg font-semibold text-neutral-900">Incorporating your contribution…</p>
        <ol className="mt-4 space-y-2.5">
          {STEP_LABELS.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2.5 text-sm">
              {i < activeIdx ? (
                <span aria-hidden className="text-emerald-600">✓</span>
              ) : i === activeIdx ? (
                <span
                  aria-hidden
                  className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-okta-600 border-t-transparent"
                />
              ) : (
                <span aria-hidden className="inline-block h-3.5 w-3.5 rounded-full border-2 border-neutral-300" />
              )}
              <span className={i <= activeIdx ? "text-neutral-900" : "text-neutral-400"}>
                {s.label}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs leading-relaxed text-neutral-500">
          Usually 15–40 seconds. The hub reads your attachments, formats everything to the house
          standard, and queues it for publish. Keep this tab open.
        </p>
      </div>
    );
  }

  if (state.kind === "done") {
    return (
      <div
        role="status"
        className="rounded-xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-900"
      >
        <p className="text-lg font-semibold">Contribution incorporated ✓</p>
        <p className="mt-1.5 text-sm leading-relaxed">
          Your contribution was formatted to the hub standard
          {state.chapterTitle ? (
            <>
              {" "}as <span className="font-medium">“{state.chapterTitle}”</span>
            </>
          ) : null}{" "}
          and is queued for publish. It will appear on the strategy page a few minutes after the
          team approves it — no further action needed from you.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
          <Link href="/tracker" className="underline underline-offset-2">
            View the tracker →
          </Link>
          {state.prUrl ? (
            <a
              href={state.prUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Follow the publish status →
            </a>
          ) : null}
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

  if (state.kind === "rejected") {
    return (
      <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
        <p className="text-lg font-semibold">Not incorporated</p>
        <p className="mt-1.5 text-sm leading-relaxed">
          The hub reviewed the submission and couldn&rsquo;t turn it into strategy content:{" "}
          <span className="font-medium">{state.reason}</span>
        </p>
        <p className="mt-2 text-sm leading-relaxed">
          If that seems wrong, add more substance (numbers, accounts, outcomes, links) and submit
          again — or ping the hub owner.
        </p>
        <button
          type="button"
          onClick={() => setState({ kind: "idle" })}
          className="mt-4 text-sm font-medium underline underline-offset-2"
        >
          Edit and resubmit
        </button>
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
        <p className="text-xs text-neutral-500">
          Google Docs are read and synthesized into the section automatically — set their sharing
          to <span className="font-medium">“Anyone with the link → Viewer”</span> first. Other
          links are kept as references.
        </p>
      </div>

      <div aria-live="polite">
        {state.kind === "error" && (
          <div className="space-y-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            <p>{state.message}</p>
            {state.sharingErrors?.map((msg, i) => (
              <p key={i} className="text-xs leading-relaxed">
                {msg}
              </p>
            ))}
            {state.retryId ? (
              <button
                type="button"
                onClick={() => runPipeline(state.retryId!)}
                className="font-medium underline underline-offset-2"
              >
                Retry incorporation
              </button>
            ) : null}
          </div>
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
