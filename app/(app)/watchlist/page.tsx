"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { BellRing } from "lucide-react";
import DecisionTimelineList from "@/components/decisionMemory/DecisionTimelineList";

export default function DecisionWatchlistPage() {
  const { isSignedIn } = useAuth();

  return (
    <div className="cockpit-glass-panel qa-premium-surface p-6 sm:p-8">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/10">
        <BellRing className="size-6 text-cyan-200" aria-hidden />
      </div>
      <h1 className="cockpit-display mt-6 text-2xl text-white sm:text-3xl">Watched decisions</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
        Decisions you chose to watch. Confidence history and change highlights update when the same product
        is decided again.
      </p>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <Link href="/decisions" className="font-semibold text-violet-200 hover:text-white">
          Full timeline
        </Link>
        <Link href="/alerts" className="font-semibold text-slate-300 hover:text-white">
          Price alerts
        </Link>
      </div>

      <section className="mt-8">
        <DecisionTimelineList mode="watchlist" signedIn={Boolean(isSignedIn)} />
      </section>
    </div>
  );
}
