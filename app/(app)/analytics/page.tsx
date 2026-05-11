import Link from "next/link";
import { BarChart3 } from "lucide-react";
import TrustRibbon from "@/components/trust/TrustRibbon";

export default function AnalyticsPage() {
  return (
    <div className="cockpit-glass-panel p-6 sm:p-8">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-500/10">
        <BarChart3 className="size-6 text-violet-200" aria-hidden />
      </div>
      <h1 className="cockpit-display mt-6 text-2xl text-white sm:text-3xl">Savings analytics</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
        Portfolio-level analytics will aggregate your searches, saves, and watchlist movement. For now, use the
        dashboard for recent activity and the cockpit on the home page for live intelligence.
      </p>
      <div className="mt-10">
        <TrustRibbon />
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/dashboard"
          className="rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-105"
        >
          View dashboard
        </Link>
        <Link href="/" className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-medium text-white/85">
          New analysis
        </Link>
      </div>
    </div>
  );
}
