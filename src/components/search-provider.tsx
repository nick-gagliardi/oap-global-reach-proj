"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SearchEntry } from "@/lib/search-index";

const SearchIndexContext = createContext<SearchEntry[]>([]);

/** Receives the server-built index via props (RSC payload) and shares it. */
export function SearchProvider({
  index,
  children,
}: {
  index: SearchEntry[];
  children: ReactNode;
}) {
  return <SearchIndexContext.Provider value={index}>{children}</SearchIndexContext.Provider>;
}

export function useSearchIndex(): SearchEntry[] {
  return useContext(SearchIndexContext);
}
