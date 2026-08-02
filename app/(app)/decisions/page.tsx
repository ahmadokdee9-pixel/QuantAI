"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { History } from "lucide-react";
import DecisionTimelineList from "@/components/decisionMemory/DecisionTimelineList";
import DecisionUpdatesPanel from "@/components/decisionMemory/DecisionUpdatesPanel";

export default function DecisionsTimelinePage() {
  const { isSignedIn } = useAuth();

  return (
    <div className="cockpit-glass-panel qa-premium-surface p-6 sm:p-8">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-500/10">
        <History className="size-6 text-violet-200" aria-hidden />
      </div>
      <h1 className="cockpit-display mt-6 text-2xl text-white sm:text-3xl">Decision timeline</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
        Every Instant Decision you open is remembered — action, confidence, price, and reasons — so QuantAI
        becomes a daily decision companion, not a one-shot search box.
      </p>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <Link href="/feed" className="font-semibold text-cyan-200 hover:text-white">
          Decision Feed
        </Link>
        <Link href="/watchlist" className="font-semibold text-slate-300 hover:text-white">
          Watched decisions
        </Link>
        <Link href="/" className="font-semibold text-slate-300 hover:text-white">
          New search
        </Link>
      </div>

      <div className="mt-8">
        <DecisionUpdatesPanel signedIn={Boolean(isSignedIn)} />
      </div>

      <section className="mt-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-200/75">
          All decisions
        </p>
        <h2 className="mt-1 mb-4 text-base font-semibold text-white">Newest first</h2>
        <DecisionTimelineList mode="timeline" signedIn={Boolean(isSignedIn)} />
      </section>
    </div>
  );
}
