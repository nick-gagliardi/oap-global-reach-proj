"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchEntry } from "@/lib/search-index";
import { useSearchIndex } from "./search-provider";
import { RegionBadgeList } from "./region-badge";

const TYPE_LABELS: Record<SearchEntry["type"], string> = {
  strategy: "Strategy",
  region: "Region",
  objection: "Objection",
  vertical: "Vertical",
};

function scoreEntry(entry: SearchEntry, tokens: string[]): number {
  let score = 0;
  const title = entry.title.toLowerCase();
  const summary = entry.summary.toLowerCase();
  for (const t of tokens) {
    if (title.includes(t)) score += 10;
    else if (summary.includes(t)) score += 4;
    else if (entry.body.includes(t)) score += 1;
    else return 0; // every token must match somewhere
  }
  return score;
}

export function Search() {
  const index = useSearchIndex();
  const router = useRouter();
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 100);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // "/" focuses search from anywhere (unless already typing somewhere).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) {
        return;
      }
      e.preventDefault();
      rootRef.current?.querySelector("input")?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const tokens = debounced.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    return index
      .map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((r) => r.entry);
  }, [index, debounced]);

  // Clamp instead of resetting via an effect (avoids a cascading render).
  const highlightIdx = Math.min(activeIdx, Math.max(0, results.length - 1));

  const go = (entry: SearchEntry) => {
    setOpen(false);
    setQuery("");
    router.push(entry.href);
  };

  return (
    <div ref={rootRef} className="relative w-full max-w-xs">
      <label htmlFor={`${listboxId}-input`} className="sr-only">
        Search the hub
      </label>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
      >
        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="m13.5 13.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <kbd
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-white/20 px-1.5 font-sans text-[10px] leading-4 text-neutral-400 sm:block"
      >
        /
      </kbd>
      <input
        id={`${listboxId}-input`}
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listboxId}
        aria-activedescendant={
          open && results.length > 0 ? `${listboxId}-opt-${highlightIdx}` : undefined
        }
        aria-autocomplete="list"
        placeholder="Search the hub…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || results.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIdx(Math.min(highlightIdx + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx(Math.max(highlightIdx - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            go(results[highlightIdx]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full rounded-md border border-white/15 bg-white/10 py-1.5 pl-8 pr-8 text-sm text-white placeholder:text-neutral-400 transition-colors hover:bg-white/15 focus:border-okta-200/60 focus:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-200 [&::-webkit-search-cancel-button]:hidden"
      />
      {open && debounced && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          className="absolute right-0 z-20 mt-1 max-h-96 w-80 max-w-[90vw] overflow-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-neutral-500">No results</li>
          ) : (
            results.map((entry, i) => (
              <li
                key={entry.href}
                id={`${listboxId}-opt-${i}`}
                role="option"
                aria-selected={i === highlightIdx}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(entry);
                }}
                className={`cursor-pointer px-3 py-2 ${i === highlightIdx ? "bg-neutral-100" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-neutral-900">{entry.title}</span>
                  <span className="shrink-0 text-xs text-neutral-500">
                    {TYPE_LABELS[entry.type]}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="line-clamp-1 text-xs text-neutral-600">{entry.summary}</span>
                  <RegionBadgeList regions={entry.regions} />
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
