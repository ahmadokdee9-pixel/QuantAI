"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Shield,
  Target,
  Truck,
} from "lucide-react";
import type { DealClusterDTO, ListingDealInsight, PrimaryDealAction } from "@/lib/deals/types";
import { buildClusterDealLanes } from "@/lib/intelligence/dealIntelligenceEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { resolveOfferClickUrl } from "@/lib/commerce/offerClick";
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

function buyWaitLabel(b: ListingDealInsight["buyVsWait"], predictive?: string): string {
  if (predictive?.trim()) return predictive.trim();
  if (b === "buy_now") return "Buy now";
  if (b === "wait") return "Watch tray";
  return "Compare";
}

function fakeRiskLabel(r: ListingDealInsight["fakeDiscountRisk"]): string {
  if (r === "high") return "Discount trust: low";
  if (r === "medium") return "Discount trust: mixed";
  return "Discount trust: solid";
}

function primaryActionLabel(cluster: DealClusterDTO): string {
  if (cluster.primaryRecommendation === "buy_now") return "Buy now";
  if (cluster.primaryRecommendation === "wait") {
    const head = cluster.primaryRecommendationReason.split(":")[0]?.trim() ?? "";
    if (head.length >= 6 && head.length <= 52) return head;
    return "Watch — predictive read";
  }
  return "Compare carefully";
}

function primaryActionStyle(a: PrimaryDealAction): string {
  if (a === "buy_now") return "border-emerald-400/35 bg-emerald-500/15 text-emerald-100";
  if (a === "wait") return "border-rose-400/35 bg-rose-500/12 text-rose-100";
  return "border-amber-400/35 bg-amber-500/12 text-amber-100";
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

  const clusterDealLanes = useMemo(
    () => (cluster ? buildClusterDealLanes(cluster.listings) : []),
    [cluster]
  );

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
        <div className="rounded-t-[1.45rem] border border-white/[0.08] border-b-0 bg-gradient-to-b from-[#0a1428]/94 via-[#060b18]/92 to-[#03060f]/94 shadow-[0_-24px_72px_-32px_rgba(34,211,238,0.14),0_0_48px_-44px_rgba(167,139,250,0.08),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-[36px]">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex w-full items-center justify-between gap-4 rounded-t-[1.45rem] px-4 py-4 text-left transition-colors duration-300 hover:bg-white/[0.03] sm:px-5 sm:py-4"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/20 to-violet-500/15 shadow-[0_0_24px_-6px_rgba(34,211,238,0.45)]">
                <span className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_90deg,transparent,rgba(34,211,238,0.15),transparent)] motion-safe:animate-spin opacity-70" style={{ animationDuration: "6s" }} aria-hidden />
                <Layers className="relative size-4 text-cyan-100" strokeWidth={1.5} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400/90">
                  Live intelligence
                </p>
                <p className="truncate text-[15px] font-semibold tracking-[-0.02em] text-white/95 sm:text-base">
                  {clusters.length} retailer group{clusters.length === 1 ? "" : "s"} · same product family
                </p>
              </div>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium tracking-tight text-slate-400/95 transition hover:border-white/[0.1]">
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
                <div className="max-h-[min(58vh,600px)] overflow-y-auto overscroll-contain px-4 pb-5 pt-4 sm:px-6">
                  <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                          className={`rounded-2xl border px-4 py-4 text-left transition duration-300 ${
                            active
                              ? "border-cyan-400/35 bg-gradient-to-br from-cyan-500/12 to-white/[0.03] shadow-[0_16px_48px_-24px_rgba(34,211,238,0.18)]"
                              : "border-white/[0.055] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-[13px] font-medium leading-snug tracking-[-0.01em] text-white/95">
                              {c.canonicalTitle}
                            </p>
                            {c.suspiciousDiscountCluster && (
                              <AlertTriangle
                                className="size-4 shrink-0 text-amber-300/90"
                                aria-label="Suspicious discounts in cluster"
                              />
                            )}
                          </div>
                          <p className="mt-2 text-[12px] leading-relaxed text-slate-500/95">
                            <span className="text-slate-500/80">{c.inferredCategoryLabel}</span>
                            <span className="mx-2 text-slate-600">·</span>
                            <span className="tabular-nums text-cyan-200/85">{c.clusterDealConfidence}</span>
                            <span className="text-slate-600"> /100</span>
                            <span className="mx-2 text-slate-600">·</span>
                            <span className="tabular-nums text-white/88">{c.listings.length}</span> offers
                            <span className="mx-2 text-slate-600">·</span>
                            <span className="tabular-nums">€{lo.toFixed(0)}–€{hi.toFixed(0)}</span>
                            <span className="mx-2 text-slate-600">·</span>
                            avg <span className="tabular-nums text-slate-400/95">€{c.avgPrice.toFixed(0)}</span>
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {cluster.suspiciousDiscountCluster && (
                    <div className="mb-5 rounded-2xl border border-amber-400/22 bg-amber-500/[0.06] px-4 py-3.5 sm:px-5">
                      <p className="text-[13px] leading-relaxed text-amber-50/95">
                        <span className="font-semibold text-amber-100/95">Headline discounts look unreliable.</span>{" "}
                        List prices do not match what peer sellers show—verify before you trust the savings.
                      </p>
                    </div>
                  )}

                  <div className="mb-6 space-y-6 rounded-[1.35rem] border border-white/[0.055] bg-white/[0.025] px-4 py-5 sm:px-6 sm:py-6">
                    <div className="flex flex-col gap-4 border-b border-white/[0.05] pb-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-6">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold tracking-tight ${primaryActionStyle(cluster.primaryRecommendation)}`}
                        >
                          <Target className="size-3.5 opacity-90" aria-hidden />
                          {primaryActionLabel(cluster)}
                        </span>
                        <span className="text-[13px] text-slate-500/95">
                          Data depth: <span className="capitalize text-slate-400/95">{cluster.dataCompleteness}</span>
                          {cluster.bestDiscountPct != null && (
                            <>
                              <span className="mx-2 text-slate-600">·</span>
                              <span className="text-slate-400/95">Best headline markdown {cluster.bestDiscountPct}%</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <p className="text-[14px] leading-relaxed tracking-[-0.01em] text-slate-300/95">
                      {cluster.primaryRecommendationReason}
                    </p>
                    <p className="flex items-start gap-3 text-[13px] leading-relaxed text-slate-500/95">
                      <Shield className="mt-0.5 size-4 shrink-0 text-slate-500/80" aria-hidden />
                      {cluster.retailTrustNote}
                    </p>

                    <div className="border-t border-white/[0.05] pt-5">
                      <p className="text-[12px] font-semibold tracking-tight text-white/90">Summary</p>
                      <p className="mt-2 text-[14px] leading-relaxed text-slate-400/95">{cluster.advisorSummary}</p>
                      <div className="mt-5 flex flex-col gap-4 border-t border-white/[0.04] pt-5 text-[13px] text-slate-400/95 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-10 sm:gap-y-3">
                        <div>
                          <p className="text-[11px] font-medium text-slate-500/90">Fair price band</p>
                          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-emerald-200/95">
                            €{cluster.fairMarketEstimate.toFixed(0)}
                          </p>
                          <p className="mt-0.5 text-[12px] text-slate-500/90">Peer median</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-500/90">Price range</p>
                          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-white/95">
                            €{cluster.minPrice.toFixed(0)} – €{cluster.maxPrice.toFixed(0)}
                          </p>
                          <p className="mt-0.5 text-[12px] text-slate-500/90">Across this group</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-500/90">Spread</p>
                          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-amber-200/95">
                            {cluster.priceSpreadPct.toFixed(0)}%
                          </p>
                          <p className="mt-0.5 text-[12px] text-slate-500/90">Store-to-store</p>
                        </div>
                        <div className="min-w-0 flex-1 sm:max-w-md">
                          <p className="text-[11px] font-medium text-slate-500/90">Volatility</p>
                          <p className="mt-1 text-[13px] leading-relaxed text-slate-400/95">{cluster.volatilityNote}</p>
                        </div>
                      </div>
                    </div>

                    {clusterDealLanes.length > 0 && (
                      <div className="border-t border-white/[0.05] pt-5">
                        <p className="text-[12px] font-semibold tracking-tight text-white/88">Suggested lanes</p>
                        <ul className="mt-3 space-y-2.5">
                          {clusterDealLanes.map((lane) => (
                            <li key={`${lane.label}-${lane.link}`} className="text-[13px] leading-snug text-slate-400/95">
                              <a
                                href={lane.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-emerald-100/95 underline-offset-2 hover:underline"
                              >
                                {lane.label}
                              </a>
                              <span className="text-slate-600"> — </span>
                              <span className="text-slate-500/95 [overflow-wrap:anywhere]">{lane.hint}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
                    <div className="space-y-4">
                      {cluster.whenCheapestNotBest && (
                        <div className="rounded-2xl border border-cyan-400/18 bg-cyan-500/[0.05] px-4 py-3.5 text-[13px] leading-relaxed text-cyan-50/95">
                          <span className="font-semibold text-cyan-100/95">Cheapest is not always best here. </span>
                          {cluster.whenCheapestNotBest}
                        </div>
                      )}

                      <details className="group rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3.5">
                        <summary className="cursor-pointer list-none text-[13px] font-medium text-slate-300 marker:content-none [&::-webkit-details-marker]:hidden">
                          <span className="inline-flex items-center gap-2">
                            Why these offers are grouped
                            <ChevronDown className="size-3.5 text-slate-500 transition group-open:rotate-180" />
                          </span>
                        </summary>
                        <p className="mt-3 text-[13px] leading-relaxed text-slate-500/95">{cluster.groupingRationale}</p>
                        <p className="mt-2 text-[12px] leading-relaxed text-slate-600/95">{cluster.matchSignalsSummary}</p>
                        <p className="mt-2 text-[12px] italic leading-relaxed text-slate-600/90">
                          {cluster.imageSimilarityNote}
                        </p>
                      </details>

                      <details className="group rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3.5">
                        <summary className="cursor-pointer list-none text-[13px] font-medium text-slate-300 marker:content-none [&::-webkit-details-marker]:hidden">
                          <span className="inline-flex items-center gap-2">
                            Risks & what we cannot see
                            <ChevronDown className="size-3.5 text-slate-500 transition group-open:rotate-180" />
                          </span>
                        </summary>
                        <p className="mt-3 text-[13px] leading-relaxed text-slate-500/95">{cluster.hiddenRisksNote}</p>
                        <p className="mt-2 text-[13px] leading-relaxed text-slate-500/95">{cluster.uncertaintyNote}</p>
                      </details>

                      <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-4 sm:px-5">
                        <p className="text-[12px] font-semibold tracking-tight text-white/88">Curated picks</p>
                        <ul className="mt-3 divide-y divide-white/[0.05]">
                          {pickDefs.map(({ key, label }) => {
                            const link = cluster.picks[key];
                            const p = productByLink(cluster, link);
                            if (!p) return null;
                            return (
                              <li key={key}>
                                <a
                                  href={resolveOfferClickUrl(p)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between gap-3 py-2.5 text-[13px] text-slate-300/95 transition hover:text-white"
                                >
                                  <span className="min-w-0">
                                    <span className="font-medium text-slate-200/95">{label}</span>
                                    <span className="mt-0.5 block truncate text-[12px] text-slate-500/90">{p.store}</span>
                                  </span>
                                  <ArrowUpRight className="size-4 shrink-0 text-slate-500/80" />
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-black/18">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[780px] text-left text-[12px]">
                          <thead>
                            <tr className="border-b border-white/[0.05] bg-white/[0.025] text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500/90">
                              <th className="px-4 py-3.5">Retailer</th>
                              <th className="px-4 py-3.5">Price</th>
                              <th className="px-4 py-3.5">List</th>
                              <th className="px-4 py-3.5">Disc.</th>
                              <th className="px-4 py-3.5">Trust</th>
                              <th className="px-4 py-3.5">Mkt</th>
                              <th className="px-4 py-3.5">Delivery</th>
                              <th className="px-4 py-3.5">Reviews</th>
                              <th className="px-4 py-3.5">Verdict</th>
                              <th className="px-4 py-3.5">QI</th>
                              <th className="px-4 py-3.5">Conf.</th>
                              <th className="px-4 py-3.5">Signal</th>
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
                                  className="border-b border-white/[0.035] last:border-0 transition-colors duration-200 hover:bg-white/[0.02]"
                                >
                                  <td className="px-4 py-3.5">
                                    <a
                                      href={resolveOfferClickUrl(p)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-medium text-cyan-200/95 underline-offset-2 hover:underline"
                                    >
                                      {p.store}
                                    </a>
                                    {badges.length > 0 && (
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {badges.slice(0, 2).map((b) => (
                                          <span
                                            key={b}
                                            className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium tracking-tight text-slate-400/95"
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
                                  <td className="px-4 py-3.5 font-semibold tabular-nums text-white">
                                    €{p.price.toFixed(0)}
                                  </td>
                                  <td className="px-4 py-3.5 tabular-nums text-slate-500">
                                    {p.oldPrice != null && p.oldPrice > p.price
                                      ? `€${p.oldPrice.toFixed(0)}`
                                      : "—"}
                                  </td>
                                  <td className="px-4 py-3.5 tabular-nums text-slate-300">
                                    {disc != null ? `${disc}%` : "—"}
                                  </td>
                                  <td className="px-4 py-3.5 tabular-nums text-slate-300">{trust}</td>
                                  <td className="px-4 py-3.5 text-[10px] uppercase text-slate-500">
                                    {ins?.marketplaceSellerRisk ?? "—"}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <div className="flex items-center gap-1 text-slate-400">
                                      <Truck className="size-3 shrink-0 text-slate-500" aria-hidden />
                                      <span className="line-clamp-2 max-w-[100px]" title={p.shipping ?? ""}>
                                        {delLabel}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 text-slate-400">
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
                                  <td className="px-4 py-3.5">
                                    {ins && (
                                      <span
                                        className={`inline-flex max-w-[160px] flex-col gap-1 rounded-xl border px-2.5 py-2 text-[11px] font-medium leading-snug ${verdictTone(ins.dealVerdict)}`}
                                      >
                                        {ins.dealVerdict}
                                        <span className="font-normal text-[11px] text-white/65">
                                          {fakeRiskLabel(ins.fakeDiscountRisk)}
                                        </span>
                                        {ins.tooGoodToBeTrue && (
                                          <span className="font-normal text-amber-200/90">Too good vs peers</span>
                                        )}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 tabular-nums font-medium text-cyan-200/90">{comp}</td>
                                  <td className="px-4 py-3.5 tabular-nums text-slate-300">
                                    {ins?.buyerConfidence ?? "—"}
                                  </td>
                                  <td className="px-4 py-3.5 text-[10px] leading-snug text-slate-400">
                                    {ins && (
                                      <>
                                        <span className="font-medium text-slate-300">
                                          {buyWaitLabel(ins.buyVsWait, ins.predictiveTimingLabel)}
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
