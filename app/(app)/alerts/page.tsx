import Link from "next/link";
import { Bell } from "lucide-react";

export default function AlertsPage() {
  return (
    <div className="cockpit-glass-panel p-6 sm:p-8">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/10">
        <Bell className="size-6 text-cyan-200" aria-hidden />
      </div>
      <h1 className="cockpit-display mt-6 text-2xl text-white sm:text-3xl">Premium alerts</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
        Threshold alerts and quiet monitoring are on the roadmap. Today you can use the watchlist from live search
        results—items sync to your account when Supabase is configured.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-105"
        >
          Run a search
        </Link>
        <Link
          href="/pricing"
          className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/[0.06]"
        >
          View plans with alerts
        </Link>
        <Link href="/dashboard" className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-400 hover:text-white">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
