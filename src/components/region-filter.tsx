"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { REGIONS, REGION_LABELS, isRegion } from "@/lib/regions";

/**
 * Region filter as URL state (?region=). Must be rendered inside <Suspense>
 * (useSearchParams requirement for static builds).
 */
export function RegionFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get("region");
  const active = isRegion(raw) ? raw : null;

  const setRegion = (region: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (region) params.set("region", region);
    else params.delete("region");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const base =
    "rounded-full border px-3 py-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500";

  return (
    <div role="group" aria-label="Filter by region" className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-pressed={active === null}
        onClick={() => setRegion(null)}
        className={`${base} ${
          active === null
            ? "border-okta-600 bg-okta-600 text-white"
            : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
        }`}
      >
        All regions
      </button>
      {REGIONS.map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={active === r}
          onClick={() => setRegion(r)}
          className={`${base} ${
            active === r
              ? "border-okta-600 bg-okta-600 text-white"
              : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          {REGION_LABELS[r]}
        </button>
      ))}
    </div>
  );
}
