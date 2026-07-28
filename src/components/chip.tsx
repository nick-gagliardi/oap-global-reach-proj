"use client";

/** Tactile toggle chip — used for single- and multi-select option rows. */
export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500 ${
        selected
          ? "border-okta-600 bg-okta-600 text-white"
          : "border-neutral-300 bg-white text-neutral-700 hover:border-okta-200 hover:bg-okta-50"
      }`}
    >
      {children}
    </button>
  );
}

/** Numbered field label — the "01 · question" editorial pattern. */
export function FieldLabel({ step, children }: { step: string; children: React.ReactNode }) {
  return (
    <p className="flex items-baseline gap-2 text-sm font-semibold text-neutral-900">
      <span
        aria-hidden="true"
        className="text-xs font-bold tabular-nums tracking-widest text-okta-500"
      >
        {step}
      </span>
      {children}
    </p>
  );
}
