"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Gauge,
  Layers,
  Radar,
  Shield,
  Sparkles,
  Target,
  Truck,
  Wallet,
} from "lucide-react";
import type { DealClusterDTO, ListingDealInsight, PrimaryDealAction } from "@/lib/deals/types";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";
import { scoreDeliverySpeed } from "@/lib/intelligence/deliveryScore";

type Props = {
  clusters: DealClusterDTO[];
  sortedProducts: QuantProduct[];
  compareBarActive: boolean;
};

function insightFor(cluster: DealClusterDTO, link: string): ListingDealInsight | undefined {
  return cluster.listingInsights.find((i) => i.link === link);
}

function productByLink(cluster: DealClusterDTO, link: string): QuantProduct | undefined {
  return cluster.listings.find((p) => p.link === link);
}

function verdictTone(v: ListingDealInsight["dealVerdict"]): string {
  switch (v) {
    case "Real deal":
      return "border-emerald-400/35 bg-emerald-500/[0.12] text-emerald-100";
    case "Strong value":
      return "border-cyan-400/35 bg-cyan-500/[0.12] text-cyan-100";
    case "Suspicious discount":
      return "border-amber-400/40 bg-amber-500/[0.14] text-amber-100";
    case "Overpriced":
    case "Wait for lower pricing":
      return "border-rose-400/35 bg-rose-500/[0.12] text-rose-100";
    default:
      return "border-violet-400/30 bg-violet-500/[0.1] text-violet-100";
  }
}

function buyWaitLabel(b: ListingDealInsight["buyVsWait"]): string {
  if (b === "buy_now") return "Buy now";
  if (b === "wait") return "Wait";
  return "Compare";
}

function fakeRiskLabel(r: ListingDealInsight["fakeDiscountRisk"]): string {
  if (r === "high") return "High fake-risk";
  if (r === "medium") return "Elevated fake-risk";
  return "Low fake-risk";
}

function primaryActionLabel(a: PrimaryDealAction): string {
  if (a === "buy_now") return "Buy now";
  if (a === "wait") return "Wait for better pricing";
  return "Compare carefully";
}

function primaryActionStyle(a: PrimaryDealAction): string {
  if (a === "buy_now") return "border-emerald-400/35 bg-emerald-500/15 text-emerald-100";
  if (a === "wait") return "border-rose-400/35 bg-rose-500/12 text-rose-100";
  return "border-amber-400/35 bg-amber-500/12 text-amber-100";
}

function completenessStyle(c: DealClusterDTO["dataCompleteness"]): string {
  if (c === "high") return "text-emerald-200/90 border-emerald-400/25";
  if (c === "medium") return "text-amber-200/90 border-amber-400/25";
  return "text-rose-200/85 border-rose-400/25";
}

const pickDefs: { key: keyof DealClusterDTO["picks"]; label: string }[] = [
  { key: "bestOverall", label: "Best overall" },
  { key: "bestBudget", label: "Cheapest deal" },
  { key: "mostTrusted", label: "Most trusted" },
  { key: "fastestDelivery", label: "Fastest delivery" },
  { key: "bestWarrantySupport", label: "Warranty / support" },
  { key: "bestLongTermValue", label: "Best long-term value" },
  { key: "premiumChoice", label: "Premium choice" },
  { key: "premiumOverpriced", label: "Premium · weak value" },
  { key: "riskyButCheap", label: "Risky but cheap" },
  { key: "waitForBetterPricing", label: "Wait — poor value row" },
];

function pickBadgesForLink(cluster: DealClusterDTO, link: string): string[] {
  return pickDefs.filter(({ key }) => cluster.picks[key] === link).map(({ label }) => label);
}

export default function MultiStoreDealAdvisor({
  clusters,
  sortedProducts,
  compareBarActive,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(true);
  const [activeId, setActiveId] = useState(clusters[0]?.id ?? "");

  const cluster = useMemo(() => {
    if (!clusters.length) return undefined;
    const match = clusters.find((c) => c.id === activeId);
    return match ?? clusters[0];
  }, [clusters, activeId]);

  const transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 34 };

  if (!cluster || clusters.length === 0) return null;

  const listingsSorted = [...cluster.listings].sort((a, b) => a.price - b.price);

  const bottomOffset = compareBarActive ? "bottom-[5.5rem] md:bottom-24" : "bottom-0";

  return (
    <motion.div
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
      className={`fixed left-0 right-0 z-[36] ${bottomOffset} pointer-events-none`}
      aria-label="Multi-store deal intelligence"
    >
      <div className="pointer-events-auto mx-auto max-w-7xl px-3 sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="rounded-t-[1.45rem] border border-white/[0.11] border-b-0 bg-gradient-to-b from-[#0a1428]/96 via-[#060b18]/94 to-[#03060f]/96 shadow-[0_-32px_90px_-28px_rgba(34,211,238,0.22),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-[32px]">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex w-full items-center justify-between gap-3 rounded-t-[1.45rem] px-4 py-3.5 text-left transition hover:bg-white/[0.04]"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/20 to-violet-500/15 shadow-[0_0_24px_-6px_rgba(34,211,238,0.45)]">
                <span className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_90deg,transparent,rgba(34,211,238,0.15),transparent)] motion-safe:animate-spin opacity-70" style={{ animationDuration: "6s" }} aria-hidden />
                <Layers className="relative size-4 text-cyan-100" strokeWidth={1.5} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/90">
                  Live AI reasoning console
                </p>
                <p className="truncate text-sm font-semibold tracking-tight text-white/95">
                  {clusters.length} cross-retailer {clusters.length === 1 ? "cluster" : "clusters"} · unified
                  deal graph
                </p>
              </div>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] font-medium text-slate-400">
              {expanded ? (
                <>
                  Collapse
                  <ChevronDown className="size-3.5" aria-hidden />
                </>
              ) : (
                <>
                  Expand
                  <ChevronUp className="size-3.5" aria-hidden />
                </>
              )}
            </span>
          </button>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="body"
                initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden border-t border-white/[0.06]"
              >
                <div className="max-h-[min(60vh,640px)] overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
                  <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {clusters.map((c) => {
                      const pr = c.listings.map((x) => x.price);
                      const lo = Math.min(...pr);
                      const hi = Math.max(...pr);
                      const active = c.id === cluster.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setActiveId(c.id)}
                          className={`rounded-2xl border px-3 py-3 text-left transition ${
                            active
                              ? "border-cyan-400/45 bg-gradient-to-br from-cyan-500/15 to-white/[0.04] shadow-[0_12px_40px_-16px_rgba(34,211,238,0.25)]"
                              : "border-white/[0.08] bg-white/[0.03] hover:border-white/15"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-[12px] font-medium leading-snug text-white/95">
                              {c.canonicalTitle}
                            </p>
                            {c.suspiciousDiscountCluster && (
                              <AlertTriangle
                                className="size-4 shrink-0 text-amber-300/90"
                                aria-label="Suspicious discounts in cluster"
                              />
                            )}
                          </div>
                          <p className="mt-1 text-[10px] text-slate-500">{c.inferredCategoryLabel}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/40">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 transition-all"
                                style={{ width: `${c.clusterDealConfidence}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-semibold tabular-nums text-cyan-200/90">
                              {c.clusterDealConfidence}
                            </span>
                          </div>
                          <p className="mt-2 text-[11px] text-slate-400">
                            <span className="tabular-nums text-white/90">{c.listings.length}</span> stores ·{" "}
                            <span className="tabular-nums">€{lo.toFixed(0)}–€{hi.toFixed(0)}</span>
                            <span className="text-slate-600"> · </span>
                            avg <span className="tabular-nums text-slate-300">€{c.avgPrice.toFixed(0)}</span>
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {cluster.suspiciousDiscountCluster && (
                    <div className="mb-4 flex gap-2 rounded-xl border border-amber-400/35 bg-amber-500/[0.1] px-3 py-2.5 text-[11px] leading-snug text-amber-100/95">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden />
                      <p>
                        <span className="font-semibold">Fake-discount signal in this cluster.</span> At least one
                        listing shows markdown math that peers do not corroborate—treat headline savings as unproven
                        until you verify list prices.
                      </p>
                    </div>
                  )}

                  <div className="mb-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 backdrop-blur-md">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${primaryActionStyle(cluster.primaryRecommendation)}`}
                      >
                        <Target className="size-3.5" aria-hidden />
                        {primaryActionLabel(cluster.primaryRecommendation)}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${completenessStyle(cluster.dataCompleteness)}`}
                      >
                        Data · {cluster.dataCompleteness}
                      </span>
                      {cluster.bestDiscountPct != null && (
                        <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-100">
                          Best headline discount · {cluster.bestDiscountPct}%
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[12px] leading-relaxed text-slate-300">
                      {cluster.primaryRecommendationReason}
                    </p>
                    <p className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
                      <Shield className="mt-0.5 size-3.5 shrink-0 text-slate-500" aria-hidden />
                      {cluster.retailTrustNote}
                    </p>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-md">
                        <div className="flex items-start gap-2">
                          <Sparkles className="mt-0.5 size-4 shrink-0 text-violet-300" strokeWidth={1.5} />
                          <div>
                            <p className="text-xs font-semibold text-white/90">AI read</p>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300">
                              {cluster.advisorSummary}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2">
                            <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                              <Gauge className="size-3" aria-hidden />
                              Fair band
                            </p>
                            <p className="mt-1 text-sm font-semibold tabular-nums text-emerald-200">
                              €{cluster.fairMarketEstimate.toFixed(0)}
                            </p>
                            <p className="text-[10px] text-slate-500">Peer median</p>
                          </div>
                          <div className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2">
                            <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                              <Wallet className="size-3" aria-hidden />
                              Min / max
                            </p>
                            <p className="mt-1 text-sm font-semibold tabular-nums text-white">
                              €{cluster.minPrice.toFixed(0)} – €{cluster.maxPrice.toFixed(0)}
                            </p>
                            <p className="text-[10px] text-slate-500">Across stores</p>
                          </div>
                          <div className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Spread</p>
                            <p className="mt-1 text-sm font-semibold tabular-nums text-amber-200">
                              {cluster.priceSpreadPct.toFixed(0)}%
                            </p>
                            <p className="text-[10px] text-slate-500">Price ladder</p>
                          </div>
                          <div className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2">
                            <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                              <Radar className="size-3" aria-hidden />
                              Volatility
                            </p>
                            <p className="mt-1 text-[11px] leading-snug text-slate-400">{cluster.volatilityNote}</p>
                          </div>
                        </div>
                      </div>

                      {cluster.whenCheapestNotBest && (
                        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/[0.06] px-3 py-2.5 text-[11px] leading-relaxed text-cyan-50/95">
                          <span className="font-semibold text-cyan-200">Cheapest ≠ best here. </span>
                          {cluster.whenCheapestNotBest}
                        </div>
                      )}

                      <details className="group rounded-2xl border border-white/[0.06] bg-black/25 px-3 py-2.5">
                        <summary className="cursor-pointer list-none text-[11px] font-semibold text-slate-300 marker:content-none [&::-webkit-details-marker]:hidden">
                          <span className="inline-flex items-center gap-2">
                            Why these stores are grouped
                            <ChevronDown className="size-3.5 transition group-open:rotate-180 text-slate-500" />
                          </span>
                        </summary>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{cluster.groupingRationale}</p>
                        <p className="mt-2 text-[10px] leading-relaxed text-slate-600">{cluster.matchSignalsSummary}</p>
                        <p className="mt-2 text-[10px] italic text-slate-600">{cluster.imageSimilarityNote}</p>
                      </details>

                      <details className="group rounded-2xl border border-white/[0.06] bg-black/25 px-3 py-2.5">
                        <summary className="cursor-pointer list-none text-[11px] font-semibold text-slate-300 marker:content-none [&::-webkit-details-marker]:hidden">
                          <span className="inline-flex items-center gap-2">
                            Hidden risks & uncertainty
                            <ChevronDown className="size-3.5 transition group-open:rotate-180 text-slate-500" />
                          </span>
                        </summary>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{cluster.hiddenRisksNote}</p>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{cluster.uncertaintyNote}</p>
                      </details>

                      <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Curated picks
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {pickDefs.map(({ key, label }) => {
                            const link = cluster.picks[key];
                            const p = productByLink(cluster, link);
                            if (!p) return null;
                            return (
                              <a
                                key={key}
                                href={p.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-gradient-to-r from-white/[0.07] to-transparent px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-cyan-400/35 hover:text-white"
                              >
                                <span className="text-cyan-200/90">{label}</span>
                                <span className="max-w-[120px] truncate text-slate-500 group-hover:text-slate-300">
                                  {p.store}
                                </span>
                                <ArrowUpRight className="size-3 shrink-0 text-slate-500 group-hover:text-cyan-300" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/20">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[780px] text-left text-[11px]">
                          <thead>
                            <tr className="border-b border-white/[0.06] bg-white/[0.03] text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                              <th className="px-3 py-2.5">Retailer</th>
                              <th className="px-3 py-2.5">Price</th>
                              <th className="px-3 py-2.5">List</th>
                              <th className="px-3 py-2.5">Disc.</th>
                              <th className="px-3 py-2.5">Trust</th>
                              <th className="px-3 py-2.5">Mkt</th>
                              <th className="px-3 py-2.5">Delivery</th>
                              <th className="px-3 py-2.5">Reviews</th>
                              <th className="px-3 py-2.5">Verdict</th>
                              <th className="px-3 py-2.5">QI</th>
                              <th className="px-3 py-2.5">Conf.</th>
                              <th className="px-3 py-2.5">Signal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {listingsSorted.map((p, idx) => {
                              const ins = insightFor(cluster, p.link);
                              const trust = getStoreTrustScore(p.store);
                              const comp = getFinalComposite(p, sortedProducts);
                              const delScore =
                                p.qiSignals?.delivery ?? scoreDeliverySpeed(p.shipping) * 100;
                              const delLabel =
                                p.shipping?.slice(0, 42) ||
                                (delScore >= 72
                                  ? "Fast signal"
                                  : delScore >= 45
                                    ? "Standard"
                                    : "Slower cue");
                              const disc = ins?.discountPct;
                              const savings = ins?.savingsVsFair;
                              const badges = pickBadgesForLink(cluster, p.link);
                              return (
                                <motion.tr
                                  key={p.link}
                                  initial={reduceMotion ? false : { opacity: 0, x: 8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ ...transition, delay: idx * 0.04 }}
                                  className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
                                >
                                  <td className="px-3 py-2.5">
                                    <a
                                      href={p.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-medium text-cyan-200/95 underline-offset-2 hover:underline"
                                    >
                                      {p.store}
                                    </a>
                                    {badges.length > 0 && (
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {badges.slice(0, 3).map((b) => (
                                          <span
                                            key={b}
                                            className="rounded-md border border-cyan-400/25 bg-cyan-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-100/90"
                                          >
                                            {b}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    <p className="mt-0.5 line-clamp-2 max-w-[200px] text-[10px] font-normal text-slate-500">
                                      {p.title}
                                    </p>
                                  </td>
                                  <td className="px-3 py-2.5 font-semibold tabular-nums text-white">
                                    €{p.price.toFixed(0)}
                                  </td>
                                  <td className="px-3 py-2.5 tabular-nums text-slate-500">
                                    {p.oldPrice != null && p.oldPrice > p.price
                                      ? `€${p.oldPrice.toFixed(0)}`
                                      : "—"}
                                  </td>
                                  <td className="px-3 py-2.5 tabular-nums text-slate-300">
                                    {disc != null ? `${disc}%` : "—"}
                                  </td>
                                  <td className="px-3 py-2.5 tabular-nums text-slate-300">{trust}</td>
                                  <td className="px-3 py-2.5 text-[10px] uppercase text-slate-500">
                                    {ins?.marketplaceSellerRisk ?? "—"}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <div className="flex items-center gap-1 text-slate-400">
                                      <Truck className="size-3 shrink-0 text-slate-500" aria-hidden />
                                      <span className="line-clamp-2 max-w-[100px]" title={p.shipping ?? ""}>
                                        {delLabel}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-400">
                                    <span className="tabular-nums text-amber-200/90">
                                      {ratingValue(p.rating).toFixed(1)}
                                    </span>
                                    <span className="text-slate-600"> · </span>
                                    {p.reviewsCount != null ? (
                                      <span className="tabular-nums">{p.reviewsCount}</span>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {ins && (
                                      <span
                                        className={`inline-flex max-w-[150px] flex-col gap-0.5 rounded-lg border px-2 py-1 text-[10px] font-semibold leading-tight ${verdictTone(ins.dealVerdict)}`}
                                      >
                                        {ins.dealVerdict}
                                        <span className="font-normal text-white/70">
                                          {fakeRiskLabel(ins.fakeDiscountRisk)}
                                        </span>
                                        {ins.tooGoodToBeTrue && (
                                          <span className="font-normal text-amber-200/90">Too good vs peers</span>
                                        )}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 tabular-nums font-medium text-cyan-200/90">{comp}</td>
                                  <td className="px-3 py-2.5 tabular-nums text-slate-300">
                                    {ins?.buyerConfidence ?? "—"}
                                  </td>
                                  <td className="px-3 py-2.5 text-[10px] leading-snug text-slate-400">
                                    {ins && (
                                      <>
                                        <span className="font-medium text-slate-300">
                                          {buyWaitLabel(ins.buyVsWait)}
                                        </span>
                                        {savings != null && (
                                          <span className="mt-0.5 block text-emerald-200/80">
                                            {savings >= 0 ? "↓" : "↑"} €{Math.abs(savings).toFixed(0)} vs fair
                                          </span>
                                        )}
                                        <span className="mt-1 block italic text-slate-500">{ins.reasoning}</span>
                                        <span className="mt-1 block text-[10px] text-slate-600">
                                          {ins.ratingAuthenticityHint}
                                        </span>
                                      </>
                                    )}
                                  </td>
                                </motion.tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
