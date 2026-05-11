"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, TrendingUp } from "lucide-react";
import { isApiFailure } from "@/lib/api/apiResult";
import { readApiJson } from "@/lib/api/readJson";
import type { SearchEntitlementsDTO } from "@/lib/subscription/entitlements";
import type { QuantPlanTier } from "@/lib/subscription/plans";

type Payload = {
  tier?: string;
  entitlements?: SearchEntitlementsDTO;
  usage?: { searchesToday: number | null; searchesLimit: number };
  stripe?: { connected: boolean };
};

export default function EntitlementBanner() {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/billing/subscription", { credentials: "same-origin" });
        const parsed = await readApiJson<Payload>(res);
        if (!cancelled && !isApiFailure(parsed) && parsed.data) setData(parsed.data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data?.tier) return null;

  const tier = data.tier as QuantPlanTier;
  const ent = data.entitlements;
  const usage = data.usage;

  return (
    <div className="cockpit-glass-panel mb-8 flex flex-col gap-4 border-cyan-400/12 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-500/10">
          <Sparkles className="size-5 text-cyan-200" aria-hidden />
        </span>
        <div>
          <p className="cockpit-overline text-slate-500">Subscription field</p>
          <p className="mt-1 text-sm font-semibold capitalize text-white">
            {tier} plan
            {ent?.intelligenceLevel && (
              <span className="ml-2 text-xs font-normal text-slate-500">
                · Global intel: {ent.intelligenceLevel}
              </span>
            )}
          </p>
          {usage?.searchesToday != null && usage.searchesLimit != null && (
            <p className="cockpit-body mt-1 flex items-center gap-1.5 text-xs text-slate-400">
              <TrendingUp className="size-3.5 text-slate-500" aria-hidden />
              Searches today ·{" "}
              <span className="tabular-nums text-slate-300">
                {usage.searchesToday}/{usage.searchesLimit}
              </span>
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/pricing"
          className="rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:brightness-105"
        >
          Upgrade
        </Link>
        <Link
          href="/billing"
          className="rounded-full border border-white/12 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06]"
        >
          Manage billing
        </Link>
      </div>
    </div>
  );
}
