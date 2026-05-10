"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Gauge,
  Layers,
  Sparkles,
  Truck,
  Wallet,
} from "lucide-react";
import type { DealClusterDTO, ListingDealInsight } from "@/lib/deals/types";
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

const pickDefs: { key: keyof DealClusterDTO["picks"]; label: string }[] = [
  { key: "bestOverall", label: "Best overall" },
  { key: "bestBudget", label: "Best budget" },
  { key: "mostTrusted", label: "Most trusted" },
  { key: "fastestDelivery", label: "Fastest delivery" },
  { key: "premiumChoice", label: "Premium choice" },
  { key: "bestLongTermValue", label: "Long-term value" },
];

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
        <div className="rounded-t-[1.35rem] border border-white/[0.1] border-b-0 bg-gradient-to-b from-[#0a1224]/95 via-[#060b16]/92 to-[#04070f]/95 shadow-[0_-28px_80px_-24px_rgba(34,211,238,0.15)] backdrop-blur-2xl">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex w-full items-center justify-between gap-3 rounded-t-[1.35rem] px-4 py-3 text-left transition hover:bg-white/[0.03]"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10">
                <Layers className="size-4 text-cyan-200" strokeWidth={1.5} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200/90">
                  QuantAI deal advisor
                </p>
                <p className="truncate text-sm font-medium text-white/95">
                  {clusters.length} multi-store {clusters.length === 1 ? "match" : "matches"} · same
                  product, different retailers
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
                <div className="max-h-[min(52vh,520px)] overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
                  {clusters.length > 1 && (
                    <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                      {clusters.map((c) => {
                        const pr = c.listings.map((x) => x.price);
                        const lo = Math.min(...pr);
                        const hi = Math.max(...pr);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setActiveId(c.id)}
                            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-left text-xs font-medium transition ${
                              c.id === cluster.id
                                ? "border-cyan-400/45 bg-cyan-400/15 text-cyan-50"
                                : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-slate-200"
                            }`}
                          >
                            <span className="line-clamp-1 max-w-[200px]">{c.canonicalTitle}</span>
                            <span className="mt-0.5 block text-[10px] font-normal text-slate-500">
                              {c.listings.length} stores · €{lo.toFixed(0)}–€{hi.toFixed(0)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
                    <div className="space-y-4">
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
                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          <div className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2">
                            <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                              <Gauge className="size-3" aria-hidden />
                              Fair band
                            </p>
                            <p className="mt-1 text-sm font-semibold tabular-nums text-emerald-200">
                              €{cluster.fairMarketEstimate.toFixed(0)}
                            </p>
                            <p className="text-[10px] text-slate-500">Peer median in this tray</p>
                          </div>
                          <div className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2">
                            <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                              <Wallet className="size-3" aria-hidden />
                              Spread
                            </p>
                            <p className="mt-1 text-sm font-semibold tabular-nums text-amber-200">
                              {cluster.priceSpreadPct.toFixed(0)}%
                            </p>
                            <p className="text-[10px] text-slate-500">Store-to-store gap</p>
                          </div>
                          <div className="col-span-2 rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2 sm:col-span-1">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                              Volatility
                            </p>
                            <p className="mt-1 text-[11px] leading-snug text-slate-400">
                              {cluster.volatilityNote}
                            </p>
                          </div>
                        </div>
                      </div>

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
                        <table className="w-full min-w-[640px] text-left text-[11px]">
                          <thead>
                            <tr className="border-b border-white/[0.06] bg-white/[0.03] text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                              <th className="px-3 py-2.5">Retailer</th>
                              <th className="px-3 py-2.5">Price</th>
                              <th className="px-3 py-2.5">List</th>
                              <th className="px-3 py-2.5">Disc.</th>
                              <th className="px-3 py-2.5">Trust</th>
                              <th className="px-3 py-2.5">Delivery</th>
                              <th className="px-3 py-2.5">Reviews</th>
                              <th className="px-3 py-2.5">Verdict</th>
                              <th className="px-3 py-2.5">QI</th>
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
                                    <p className="mt-0.5 line-clamp-2 max-w-[180px] text-[10px] font-normal text-slate-500">
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
                                        className={`inline-flex max-w-[140px] flex-col gap-0.5 rounded-lg border px-2 py-1 text-[10px] font-semibold leading-tight ${verdictTone(ins.dealVerdict)}`}
                                      >
                                        {ins.dealVerdict}
                                        <span className="font-normal text-white/70">
                                          {fakeRiskLabel(ins.fakeDiscountRisk)}
                                        </span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 tabular-nums font-medium text-cyan-200/90">
                                    {comp}
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
                                        <span className="mt-1 block italic text-slate-500">
                                          {ins.reasoning}
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
