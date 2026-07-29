import type { Metadata } from "next";
import { Suspense } from "react";
import { AssistantChat } from "./assistant-chat";

export const metadata: Metadata = { title: "Assistant" };

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="rise space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-okta-600">
          AI · grounded in the library
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          Ask the hub
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-600">
          Invite prep, objection handling, pricing stories, success proof, partner coverage —
          one assistant across all eight workstreams. Answers come only from this hub&apos;s
          content; when something&apos;s missing, it tells you who owns it.
        </p>
      </header>
      <Suspense fallback={null}>
        <AssistantChat />
      </Suspense>
    </div>
  );
}
