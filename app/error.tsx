"use client";

import Link from "next/link";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Minimal route error surface — existing QuantAI tokens only. */
export default function GlobalError({ error, reset }: Props) {
  return (
    <main className="qa-ref-workspace qa-ref-workspace-intel mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="qa-ref-ws-alert" role="alert">
        <p className="qa-ref-ws-title text-base">Intelligence module interrupted</p>
        <p className="qa-ref-ws-meta mt-2">
          {error.message?.trim() || "An unexpected error occurred. Your session data was not cleared."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="qa-ref-btn qa-ref-btn--ghost" onClick={() => reset()}>
            Retry module
          </button>
          <Link href="/" className="qa-ref-btn qa-ref-btn--ghost">
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
