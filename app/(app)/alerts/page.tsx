"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Loader2, TrendingDown } from "lucide-react";
import TrustRibbon from "@/components/trust/TrustRibbon";
import { readApiJson } from "@/lib/api/readJson";
import { isApiFailure } from "@/lib/api/apiResult";

type WatchItem = {
  id: string;
  product?: {
    title?: string;
    store?: string;
    price?: number;
    link?: string;
  };
  target_price?: number | null;
  alert_state?: {
    signal?: string;
    dropPct?: number;
    currentPrice?: number;
    targetPrice?: number | null;
  };
  created_at?: string;
};

export default function AlertsPage() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/intelligence/watchlist", { credentials: "same-origin" });
        const parsed = await readApiJson<{ items?: WatchItem[] }>(res);
        if (!cancelled && !isApiFailure(parsed)) setItems(parsed.data?.items ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeAlerts = useMemo(() => items.filter((item) => item.target_price != null), [items]);
  const reached = useMemo(
    () => items.filter((item) => item.alert_state?.signal === "target_reached"),
    [items]
  );

  return (
    <div className="cockpit-glass-panel qa-premium-surface p-6 sm:p-8">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/10 shadow-[0_0_32px_-16px_rgba(34,211,238,0.65)]">
        <Bell className="size-6 text-cyan-200" aria-hidden />
      </div>
      <h1 className="cockpit-display mt-6 text-2xl text-white sm:text-3xl">Price intelligence alerts</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
        Track saved market opportunities with quiet price targets, discount-watch context, and seller-aware timing.
        Alerts stay minimal: one watchlist, one target, one clear buying signal.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Tracked listings</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{items.length}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Active targets</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-cyan-100">{activeAlerts.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-200/70">Ready signals</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-100">{reached.length}</p>
        </div>
      </div>

      <section className="mt-8 rounded-[1.35rem] border border-white/[0.07] bg-black/25 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/75">Watchlist signal feed</p>
            <h2 className="mt-1 text-base font-semibold text-white">Quiet market monitoring</h2>
          </div>
          {loading ? <Loader2 className="size-4 animate-spin text-cyan-200" aria-hidden /> : null}
        </div>
        {items.length === 0 && !loading ? (
          <p className="text-sm leading-relaxed text-slate-400">
            No tracked products yet. Add a product to Track from search results to start a price-intelligence loop.
          </p>
        ) : (
          <div className="grid gap-3">
            {items.slice(0, 12).map((item) => (
              <a
                key={item.id}
                href={item.product?.link || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border border-white/[0.065] bg-white/[0.035] p-4 transition hover:border-cyan-400/20 hover:bg-white/[0.055]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-white/92">{item.product?.title ?? "Tracked listing"}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.product?.store ?? "Merchant pending"}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/[0.1] bg-black/30 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-slate-200">
                    €{item.alert_state?.currentPrice ?? item.product?.price ?? "—"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/16 bg-cyan-500/[0.08] px-2.5 py-1 text-cyan-100/90">
                    <TrendingDown className="size-3" aria-hidden />
                    {item.target_price ? `Target €${item.target_price}` : "Tracking market"}
                  </span>
                  <span className="rounded-full border border-white/[0.08] bg-black/25 px-2.5 py-1 text-slate-400">
                    {item.alert_state?.signal === "target_reached" ? "Target reached" : "Watching quietly"}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <div className="mt-10">
        <TrustRibbon />
      </div>
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
