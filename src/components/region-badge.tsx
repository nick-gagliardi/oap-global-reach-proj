import { REGION_COLORS, REGION_LABELS, type Region } from "@/lib/regions";

export function RegionBadge({ region }: { region: Region }) {
  const c = REGION_COLORS[region];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}
    >
      {REGION_LABELS[region]}
    </span>
  );
}

export function RegionBadgeList({ regions }: { regions: Region[] }) {
  if (regions.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {regions.map((r) => (
        <RegionBadge key={r} region={r} />
      ))}
    </span>
  );
}
