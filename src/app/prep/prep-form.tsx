"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FIRST_INVITE,
  OBJECTIONS,
  OBJECTION_LABELS,
  REGIONS,
  REGION_LABELS,
  VERTICALS,
  VERTICAL_LABELS,
  isRegion,
} from "@/lib/regions";
import { Chip, FieldLabel } from "@/components/chip";
import { CopyButton } from "@/components/copy-button";
import { Spinner } from "@/components/spinner";

interface PrepResult {
  talkingPoints: string[];
  objectionResponse: string;
  outreachDraft: string;
  sources: string[];
}

type ViewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "result"; result: PrepResult; mode: "first-invite" | "objection" }
  | { kind: "fallback"; message: string }
  | { kind: "error"; message: string; timeout?: boolean };

const OTHER = "__other__";

export function PrepForm() {
  const searchParams = useSearchParams();
  const initialObjection = searchParams.get("objection");
  const initialVertical = searchParams.get("vertical");
  const initialRegion = searchParams.get("region");

  const [region, setRegion] = useState<string>(isRegion(initialRegion) ? initialRegion : "");
  const [vertical, setVertical] = useState<string>(
    (VERTICALS as readonly string[]).includes(initialVertical ?? "") ? initialVertical! : "",
  );
  const [scenario, setScenario] = useState<string>(
    (OBJECTIONS as readonly string[]).includes(initialObjection ?? "")
      ? initialObjection!
      : FIRST_INVITE,
  );
  const [freeText, setFreeText] = useState("");
  const [state, setState] = useState<ViewState>({ kind: "idle" });

  const canSubmit =
    region !== "" && (scenario === OTHER ? freeText.trim().length > 0 : scenario !== "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || state.kind === "loading") return;
    const submittedMode = scenario === FIRST_INVITE ? "first-invite" : "objection";
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region,
          ...(vertical ? { vertical } : {}),
          ...(scenario === OTHER ? { freeText: freeText.trim() } : { scenario }),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && data.result) {
        setState({ kind: "result", result: data.result, mode: data.mode ?? submittedMode });
      } else if (res.ok && data?.reason === "insufficient_context") {
        setState({ kind: "fallback", message: data.message });
      } else {
        setState({
          kind: "error",
          timeout: res.status === 504,
          message:
            res.status === 504
              ? "That took too long — try again."
              : data?.error || `Request failed (${res.status}).`,
        });
      }
    } catch {
      setState({ kind: "error", message: "Network error — try again." });
    }
  }

  const secondCardTitle =
    state.kind === "result" && state.mode === "first-invite"
      ? "The case for attending"
      : "Objection response";

  const allText =
    state.kind === "result"
      ? [
          "Talking points:",
          ...state.result.talkingPoints.map((t) => `- ${t}`),
          "",
          `${secondCardTitle}:`,
          state.result.objectionResponse,
          "",
          "Outreach draft:",
          state.result.outreachDraft,
        ].join("\n")
      : "";

  const radioCls =
    "h-4 w-4 shrink-0 accent-[#4054d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500";

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="rise rise-d2 space-y-7">
        {/* 01 — Region */}
        <fieldset className="space-y-3">
          <legend>
            <FieldLabel step="01">
              Where is the customer? <span className="font-normal text-red-700">*</span>
            </FieldLabel>
          </legend>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((r) => (
              <Chip key={r} selected={region === r} onClick={() => setRegion(r)}>
                {REGION_LABELS[r]}
              </Chip>
            ))}
          </div>
        </fieldset>

        {/* 02 — Vertical */}
        <fieldset className="space-y-3">
          <legend>
            <FieldLabel step="02">What industry are they in?</FieldLabel>
          </legend>
          <div className="flex flex-wrap gap-2">
            <Chip selected={vertical === ""} onClick={() => setVertical("")}>
              Any / not sure
            </Chip>
            {VERTICALS.map((v) => (
              <Chip key={v} selected={vertical === v} onClick={() => setVertical(v)}>
                {VERTICAL_LABELS[v]}
              </Chip>
            ))}
          </div>
        </fieldset>

        {/* 03 — Situation */}
        <fieldset className="space-y-3">
          <legend>
            <FieldLabel step="03">
              What&apos;s the situation? <span className="font-normal text-red-700">*</span>
            </FieldLabel>
          </legend>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
              scenario === FIRST_INVITE
                ? "border-okta-500 bg-okta-50"
                : "border-neutral-200 bg-white hover:border-okta-200"
            }`}
          >
            <input
              type="radio"
              name="scenario"
              value={FIRST_INVITE}
              checked={scenario === FIRST_INVITE}
              onChange={() => setScenario(FIRST_INVITE)}
              className={`mt-0.5 ${radioCls}`}
            />
            <span>
              <span className="block text-sm font-semibold text-neutral-900">
                Making the first invite
              </span>
              <span className="mt-0.5 block text-sm text-neutral-600">
                No pushback yet — build the proactive case for attending.
              </span>
            </span>
          </label>

          <div className="rounded-xl border border-neutral-200 bg-white">
            <p className="border-b border-neutral-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Handling pushback
            </p>
            <div className="divide-y divide-neutral-100">
              {OBJECTIONS.map((o) => (
                <label
                  key={o}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    scenario === o ? "bg-okta-50 font-medium text-neutral-900" : "text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="scenario"
                    value={o}
                    checked={scenario === o}
                    onChange={() => setScenario(o)}
                    className={radioCls}
                  />
                  &ldquo;{OBJECTION_LABELS[o]}&rdquo;
                </label>
              ))}
              <label
                className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  scenario === OTHER ? "bg-okta-50 font-medium text-neutral-900" : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <input
                  type="radio"
                  name="scenario"
                  value={OTHER}
                  checked={scenario === OTHER}
                  onChange={() => setScenario(OTHER)}
                  className={radioCls}
                />
                Something else…
              </label>
            </div>
            {scenario === OTHER && (
              <div className="space-y-1 border-t border-neutral-100 p-4">
                <label htmlFor="prep-freetext" className="sr-only">
                  Describe the scenario
                </label>
                <textarea
                  id="prep-freetext"
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder='e.g. "Customer says their team is too small to justify sending anyone"'
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500"
                />
                <p className="text-xs text-neutral-500">{freeText.length}/500</p>
              </div>
            )}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={!canSubmit || state.kind === "loading"}
            className="rounded-md bg-okta-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-okta-700 disabled:cursor-not-allowed disabled:bg-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500"
          >
            {state.kind === "loading" ? "Preparing…" : "Prep my conversation"}
          </button>
          {region === "" && (
            <p className="text-xs text-neutral-500">Pick a region to get started.</p>
          )}
        </div>
      </form>

      <div aria-live="polite" className="space-y-4">
        {state.kind === "loading" && (
          <div className="flex justify-center py-6">
            <Spinner label="Synthesizing from the library…" />
          </div>
        )}

        {state.kind === "fallback" && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">No matching content yet</p>
            <p className="mt-1">{state.message}</p>
            <Link href="/contribute" className="mt-2 inline-block font-medium underline">
              Contribute content →
            </Link>
          </div>
        )}

        {state.kind === "error" && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
            <p className="font-semibold">{state.timeout ? "Timed out" : "Something went wrong"}</p>
            <p className="mt-1">{state.message}</p>
            <button
              type="button"
              onClick={(e) => submit(e as unknown as React.FormEvent)}
              className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1 text-sm font-medium hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}

        {state.kind === "result" && (
          <div className="space-y-4">
            {(
              [
                {
                  n: "01",
                  title: "Talking points",
                  copy: state.result.talkingPoints.map((t) => `- ${t}`).join("\n"),
                  body: (
                    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-neutral-800">
                      {state.result.talkingPoints.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  ),
                },
                {
                  n: "02",
                  title: secondCardTitle,
                  copy: state.result.objectionResponse,
                  body: (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
                      {state.result.objectionResponse}
                    </p>
                  ),
                },
                {
                  n: "03",
                  title: "Outreach draft",
                  copy: state.result.outreachDraft,
                  body: (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
                      {state.result.outreachDraft}
                    </p>
                  ),
                },
              ] as const
            ).map((card) => (
              <section
                key={card.n}
                className="rounded-xl border border-neutral-200 border-l-4 border-l-okta-500 bg-white p-5"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="flex items-baseline gap-2 font-semibold text-neutral-900">
                    <span
                      aria-hidden="true"
                      className="text-xs font-bold tabular-nums tracking-widest text-okta-500"
                    >
                      {card.n}
                    </span>
                    {card.title}
                  </h2>
                  <CopyButton text={card.copy} />
                </div>
                {card.body}
              </section>
            ))}

            <div className="flex items-center justify-between gap-2">
              {state.result.sources.length > 0 ? (
                <p className="text-xs text-neutral-500">
                  Sources: {state.result.sources.join(" · ")}
                </p>
              ) : (
                <span />
              )}
              <CopyButton text={allText} label="Copy all" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
