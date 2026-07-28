export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2" role="status">
      <span
        aria-hidden="true"
        className="h-4 w-4 rounded-full border-2 border-neutral-300 border-t-neutral-700 motion-safe:animate-spin"
      />
      <span className="text-sm text-neutral-600">{label ?? "Loading…"}</span>
    </span>
  );
}
