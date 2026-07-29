"use client";

import { useEffect, useRef, useState } from "react";
import { OBJECTION_LABELS, REGION_LABELS, VERTICAL_LABELS, isRegion } from "@/lib/regions";
import type { Objection, Vertical } from "@/lib/regions";
import { Prose } from "@/components/markdown";
import { CopyButton } from "@/components/copy-button";
import { Spinner } from "@/components/spinner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type Pending = "idle" | "sending";

const STORAGE_KEY = "grh-assistant-thread";
const MAX_HISTORY = 24;

const INVITE_STARTERS = [
  "Help me prep a first invite for a LATAM financial-services customer.",
  `A customer says "${OBJECTION_LABELS["travel-cost"]}" — help me respond.`,
  `An EMEA customer says "${OBJECTION_LABELS["digital-attendance"]}" — what's the counter?`,
];

const HUB_STARTERS = [
  "What's our pricing story for EMEA vs the US?",
  "What success stories do we have from APJ customers?",
  "Which partners can carry the invite in LATAM?",
  "Who fits our ideal customer profile for Oktane travel?",
  "What are the demo attendance options at Oktane?",
];

/** Old search deep-links (?objection= / ?vertical= / ?region=) become a seeded starter. */
function seedFromParams(params: URLSearchParams): string | null {
  const objection = params.get("objection");
  const vertical = params.get("vertical");
  const region = params.get("region");
  if (objection && objection in OBJECTION_LABELS) {
    return `A customer says "${OBJECTION_LABELS[objection as Objection]}" — help me respond.`;
  }
  if (vertical && vertical in VERTICAL_LABELS) {
    return `Help me prep an Oktane invite for a ${VERTICAL_LABELS[vertical as Vertical]} customer.`;
  }
  if (isRegion(region)) {
    return `Help me prep an Oktane invite for a customer in ${REGION_LABELS[region]}.`;
  }
  return null;
}

export function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Pending>("idle");
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // One-time mount sync with sessionStorage (and deep-link seed when the
  // thread is empty). Restoring persisted client state IS the external-system
  // sync effects exist for; the synchronous setState here runs exactly once.
  useEffect(() => {
    let restored: Message[] = [];
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Message[]) : null;
      if (Array.isArray(parsed)) restored = parsed;
    } catch {
      // corrupted storage — start fresh
    }
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from sessionStorage/URL */
    if (restored.length > 0) {
      setMessages(restored);
    } else {
      const seed = seedFromParams(new URLSearchParams(window.location.search));
      if (seed) setDraft(seed);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // storage full/blocked — thread just won't survive reload
    }
  }, [messages, hydrated]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, pending]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || pending === "sending") return;
    setError(null);
    setDraft("");
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setPending("sending");
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-MAX_HISTORY) }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && typeof data.reply === "string") {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setError(
          res.status === 504
            ? "That took too long — ask again, maybe more narrowly."
            : data?.error || `Request failed (${res.status}).`,
        );
      }
    } catch {
      setError("Network error — try again.");
    } finally {
      setPending("idle");
      textareaRef.current?.focus();
    }
  }

  function retry() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    // Drop the failed user turn, resend it.
    setMessages((prev) => {
      const i = prev.lastIndexOf(lastUser);
      return prev.slice(0, i);
    });
    void send(lastUser.content);
  }

  const empty = hydrated && messages.length === 0;

  return (
    <div className="space-y-6">
      {empty && (
        <div className="rise rise-d2 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Prep an invite
            </p>
            <div className="flex flex-wrap gap-2">
              {INVITE_STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-left text-sm text-neutral-700 transition-colors hover:border-okta-200 hover:bg-okta-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Ask the hub
            </p>
            <div className="flex flex-wrap gap-2">
              {HUB_STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-left text-sm text-neutral-700 transition-colors hover:border-okta-200 hover:bg-okta-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div aria-live="polite" className="space-y-4">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-okta-600 px-4 py-2.5 text-sm leading-relaxed text-white">
                {m.content}
              </p>
            </div>
          ) : (
            <div
              key={i}
              className="rounded-xl border border-neutral-200 border-l-4 border-l-okta-500 bg-white p-5"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-widest text-okta-500">Hub</p>
                <CopyButton text={m.content} />
              </div>
              <div className="text-sm">
                <Prose markdown={m.content} />
              </div>
            </div>
          ),
        )}

        {pending === "sending" && (
          <div className="flex justify-center py-4">
            <Spinner label="Consulting the library…" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
            <p className="font-semibold">Something went wrong</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1 text-sm font-medium hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
        className="rise rise-d3 sticky bottom-4"
      >
        <div className="flex items-end gap-2 rounded-xl border border-neutral-300 bg-white p-2 shadow-sm focus-within:border-okta-500">
          <label htmlFor="assistant-input" className="sr-only">
            Ask the assistant
          </label>
          <textarea
            id="assistant-input"
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
            rows={draft.includes("\n") ? 3 : 1}
            maxLength={4000}
            placeholder={empty ? "Ask anything the hub knows…" : "Ask a follow-up…"}
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-neutral-400"
          />
          <button
            type="submit"
            disabled={!draft.trim() || pending === "sending"}
            className="rounded-lg bg-okta-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-okta-700 disabled:cursor-not-allowed disabled:bg-neutral-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500"
          >
            Send
          </button>
        </div>
        {messages.length > 0 && (
          <div className="mt-2 flex justify-between px-1">
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setError(null);
                try {
                  sessionStorage.removeItem(STORAGE_KEY);
                } catch {}
              }}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500"
            >
              ↺ New conversation
            </button>
            <p className="text-xs text-neutral-400">
              Grounded in the hub&apos;s library — gaps point to Contribute.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
