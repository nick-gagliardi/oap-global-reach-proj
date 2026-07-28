import type { SectionStatus } from "@/lib/regions";

const STYLES: Record<SectionStatus, { label: string; className: string }> = {
  placeholder: { label: "Placeholder", className: "bg-neutral-200 text-neutral-800" },
  "in-progress": { label: "In progress", className: "bg-amber-100 text-amber-900" },
  complete: { label: "Complete", className: "bg-emerald-100 text-emerald-900" },
};

const DOT_COLORS: Record<SectionStatus, string> = {
  placeholder: "bg-neutral-300",
  "in-progress": "bg-amber-500",
  complete: "bg-emerald-500",
};

/** Quieter alternative to the pill badge — a dot + label, for dense lists. */
export function StatusDot({ status }: { status: SectionStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-neutral-500">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${DOT_COLORS[status]}`} />
      {STYLES[status].label}
    </span>
  );
}

export function StatusBadge({ status }: { status: SectionStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${s.className}`}
    >
      {s.label}
    </span>
  );
}
