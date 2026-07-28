import type { Metadata } from "next";
import { Suspense } from "react";
import { PrepForm } from "./prep-form";

export const metadata: Metadata = { title: "Conversation Prep" };

export default function PrepPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="rise space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-okta-600">
          AI · grounded in the library
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          Prep a customer conversation
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-600">
          Three picks, one click: localized talking points, the case (or the counter), and a
          ready-to-send outreach draft — synthesized only from this hub&apos;s content, never
          invented.
        </p>
      </header>
      <Suspense fallback={null}>
        <PrepForm />
      </Suspense>
    </div>
  );
}
