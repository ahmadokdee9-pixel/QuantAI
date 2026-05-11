"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  Brain,
  Loader2,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { SearchEntitlementsDTO } from "@/lib/subscription/entitlements";
import type { QuantPlanTier } from "@/lib/subscription/plans";
import TrustRibbon from "@/components/trust/TrustRibbon";
import EntitlementBanner from "@/components/subscription/EntitlementBanner";

type HistoryRow = { id?: string; query: string; result_count?: number; created_at?: string };
type WatchRow = { id?: string; product?: Record<string, unknown>; created_at?: string };
type SavedRow = {
  id?: string;
  title: string | null;
  price: number | null;
  image: string | null;
  link: string;
  ai_score?: number | null;
  created_at?: string;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<QuantPlanTier>("free");
  const [entitlements, setEntitlements] = useState<SearchEntitlementsDTO | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [watchlist, setWatchlist] = useState<WatchRow[]>([]);
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [memoryLine, setMemoryLine] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [subRes, hRes, wRes, sRes, mRes] = await Promise.all([
          fetch("/api/billing/subscription", { credentials: "same-origin" }),
          fetch("/api/intelligence/search-history", { credentials: "same-origin" }),
          fetch("/api/intelligence/watchlist", { credentials: "same-origin" }),
          fetch("/api/intelligence/saved-products", { credentials: "same-origin" }),
          fetch("/api/intelligence/user-memory", { credentials: "same-origin" }),
        ]);

        if (!cancelled && subRes.ok) {
          const s = (await subRes.json()) as {
            tier?: string;
            entitlements?: SearchEntitlementsDTO;
          };
          if (typeof s.tier === "string") setTier(s.tier as QuantPlanTier);
          if (s.entitlements) setEntitlements(s.entitlements);
        }

        if (!cancelled && hRes.ok) {
          const h = (await hRes.json()) as { items?: HistoryRow[] };
          setHistory(Array.isArray(h.items) ? h.items : []);
        }

        if (!cancelled && wRes.ok) {
          const w = (await wRes.json()) as { items?: WatchRow[] };
          setWatchlist(Array.isArray(w.items) ? w.items : []);
        }

        if (!cancelled && sRes.ok) {
          const sv = (await sRes.json()) as { items?: SavedRow[] };
          setSaved(Array.isArray(sv.items) ? sv.items : []);
        }

        if (!cancelled && mRes.ok) {
          const m = (await mRes.json()) as { memory?: Record<string, unknown> };
          const mem = m.memory ?? {};
          const last =
            typeof mem.lastQuery === "string"
              ? mem.lastQuery
              : typeof mem.lastCategory === "string"
                ? `Recent category signal: ${String(mem.lastCategory)}`
                : null;
          setMemoryLine(last);
        }
      } catch {
        if (!cancelled) setErr("Some dashboard data could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activitySummary = useMemo(() => {
    return [
      { label: "Saved products", value: saved.length, href: "/saved" },
      { label: "Watchlist", value: watchlist.length, href: "/" },
      { label: "Recent searches", value: history.length, href: "/" },
    ] as const;
  }, [saved.length, watchlist.length, history.length]);

  return (
    <div className="space-y-8">
      <EntitlementBanner />

      <section className="cockpit-glass-panel p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-medium uppercase tracking-wider text-cyan-200">
              <Brain className="size-4" aria-hidden />
              Your cockpit
            </div>
            <h1 className="cockpit-display max-w-3xl text-3xl text-white md:text-4xl">
              Your orbital view of saves, signals, and subscription.
            </h1>
            <p className="cockpit-body mt-4 max-w-2xl text-sm text-slate-400">
              The cockpit on the home page runs live intelligence—this hub mirrors what your account already knows.
            </p>
            {memoryLine && (
              <p className="mt-3 max-w-xl text-xs text-slate-500">
                <span className="font-semibold text-slate-400">Signal: </span>
                {memoryLine}
              </p>
            )}
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_32px_-6px_rgba(34,211,238,0.45)] transition hover:brightness-105"
          >
            Run intelligence
            <Search className="size-4" aria-hidden />
          </Link>
        </div>
      </section>

      <section className="cockpit-glass-panel p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Subscription</p>
            <p className="mt-1 text-xl font-semibold capitalize text-white">{tier}</p>
            {entitlements && (
              <p className="mt-2 text-xs text-slate-500">
                Searches/day cap · <span className="tabular-nums text-slate-300">{entitlements.searchesPerDay}</span>
                {" · "}
                Global intelligence ·{" "}
                <span className="capitalize text-slate-300">{entitlements.intelligenceLevel}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/pricing"
              className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/[0.1]"
            >
              Compare plans
            </Link>
            <Link
              href="/billing"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Billing
            </Link>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] py-16 text-slate-400">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          Loading your activity…
        </div>
      ) : err ? (
        <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{err}</p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        {activitySummary.map((row) => (
          <Link
            key={row.label}
            href={row.href}
            className="cockpit-glass-panel flex flex-col p-5 transition hover:border-cyan-400/20"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{row.label}</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-white">{row.value}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-cyan-300">
              Open <ArrowRight className="size-3" aria-hidden />
            </span>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 cockpit-glass-panel p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white/95">Recent searches</h2>
              <p className="text-xs text-slate-500">Tap a query on the home page to re-run it.</p>
            </div>
            <Link href="/" className="text-xs font-medium text-cyan-300 hover:underline">
              Go search
            </Link>
          </div>
          {history.length === 0 ? (
            <p className="rounded-xl border border-white/[0.06] bg-black/30 px-4 py-8 text-center text-sm text-slate-500">
              No searches yet. Open the home cockpit and run your first live query.
            </p>
          ) : (
            <ul className="space-y-2">
              {history.slice(0, 12).map((h) => (
                <li key={h.id ?? h.query}>
                  <Link
                    href={`/?q=${encodeURIComponent(h.query)}`}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3 text-sm transition hover:border-cyan-400/20"
                  >
                    <span className="truncate font-medium text-white/90">{h.query}</span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">
                      {h.result_count != null ? `${h.result_count} results` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="cockpit-glass-panel p-6">
          <h2 className="text-lg font-semibold text-white/95">Shortcuts</h2>
          <p className="mt-1 text-xs text-slate-500">Every link is wired to a working surface.</p>
          <div className="mt-6 space-y-2">
            <Link
              href="/saved"
              className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3 text-sm transition hover:bg-white/[0.04]"
            >
              <span className="flex items-center gap-2">
                <Bookmark className="size-4 text-cyan-300" aria-hidden />
                Saved products
              </span>
              <ArrowRight className="size-4 text-slate-500" aria-hidden />
            </Link>
            <Link
              href="/alerts"
              className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3 text-sm transition hover:bg-white/[0.04]"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="size-4 text-violet-300" aria-hidden />
                Alerts roadmap
              </span>
              <ArrowRight className="size-4 text-slate-500" aria-hidden />
            </Link>
            <Link
              href="/analytics"
              className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3 text-sm transition hover:bg-white/[0.04]"
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-300" aria-hidden />
                Analytics roadmap
              </span>
              <ArrowRight className="size-4 text-slate-500" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section className="cockpit-glass-panel p-6">
        <h2 className="text-lg font-semibold text-white/95">Next intelligent move</h2>
        <p className="cockpit-body mt-3 text-sm text-slate-400">
          {saved.length >= 3
            ? "Strong shortlist—return to search, open Compare lab, and let the verdict layer stress-test finalists before checkout."
            : saved.length > 0
              ? "Add one or two more anchors from search, then compare on price, trust, and delivery language in one pass."
              : "Run a live query, save what resonates, and the assistant will stay grounded in your tray—not generic advice."}
        </p>
      </section>

      <TrustRibbon />
    </div>
  );
}
