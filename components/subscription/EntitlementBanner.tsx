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
    <div className="qa-ref-ws-panel qa-ref-ws-panel--compact flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="qa-ref-ws-empty__icon !mb-0 !size-10 shrink-0">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div>
          <p className="qa-ref-ws-kicker">Access clearance</p>
          <p className="qa-ref-ws-tier mt-1">
            {tier} clearance
            {ent?.intelligenceLevel && (
              <span className="ml-2 text-xs font-medium normal-case text-[rgba(71,85,105,0.68)]">
                · Intelligence depth: {ent.intelligenceLevel}
              </span>
            )}
          </p>
          {usage?.searchesToday != null && usage.searchesLimit != null && (
            <p className="qa-ref-ws-meta mt-1 flex items-center gap-1.5">
              <TrendingUp className="size-3.5 opacity-70" aria-hidden />
              Search throughput today ·{" "}
              <span className="tabular-nums font-semibold text-[#334155]">
                {usage.searchesToday}/{usage.searchesLimit}
              </span>
            </p>
          )}
        </div>
      </div>
      <div className="qa-ref-ws-actions">
        <Link href="/pricing" className="qi-access-cta inline-flex items-center px-4">
          Elevate clearance
        </Link>
        <Link href="/billing" className="qi-access-cta qi-access-cta--ghost inline-flex items-center px-4">
          Clearance billing
        </Link>
      </div>
    </div>
  );
}
