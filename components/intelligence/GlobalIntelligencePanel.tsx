"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  MapPin,
  Shield,
  Sparkles,
} from "lucide-react";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { SearchIntelligenceLevel } from "@/lib/subscription/plans";
import Link from "next/link";

type Props = {
  intel: SearchIntelligenceDTO;
  /** Free plan shows condensed synthesis; Pro/Premium see full layers. */
  displayLevel?: SearchIntelligenceLevel;
  /** Mobile / touch: deep tables & persona lane load behind an expand control. */
  performanceMode?: boolean;
};

function finalTone(kind: SearchIntelligenceDTO["finalRecommendation"]): string {
  switch (kind) {
    case "buy_now":
    case "best_trusted_option":
    case "smart_long_term_buy":
      return "from-emerald-500/12 via-cyan-500/6 to-transparent border-emerald-400/18";
    case "wait":
      return "from-rose-500/10 via-violet-500/6 to-transparent border-rose-400/18";
    case "risky_deal":
    case "cheapest_but_risky":
      return "from-amber-500/10 via-orange-500/5 to-transparent border-amber-400/22";
    case "premium_but_overpriced":
      return "from-violet-500/10 to-transparent border-violet-400/18";
    default:
      return "from-cyan-500/8 to-transparent border-cyan-400/16";
  }
}

function tierLabel(t: SearchIntelligenceDTO["confidenceTier"]): string {
  if (t === "high") return "High conviction";
  if (t === "moderate") return "Solid — verify checkout";
  if (t === "low") return "Thin signal";
  return "First-pass read";
}

export default function GlobalIntelligencePanel({
  intel,
  displayLevel = "full",
  performanceMode = false,
}: Props) {
  const reduceMotion = useReducedMotion();
  const showDeepLayers = displayLevel !== "summary";
  const [deepOpen, setDeepOpen] = useState(false);
  const confPct = Math.max(8, 100 - intel.buyerUncertaintyScore);
  const radarVals = useMemo(() => {
    const clarity = Math.max(10, 100 - intel.buyerUncertaintyScore);
    const stressFlags = [
      intel.marketIntel.aggressiveFakeDiscount,
      intel.marketIntel.ratingInflationRisk,
      intel.marketIntel.marketplaceVarianceRisk,
      intel.marketIntel.cheapestNotSafest,
    ].filter(Boolean).length;
    const equilibrium = Math.max(18, 100 - stressFlags * 16);
    const band =
      intel.priceSpread.max > intel.priceSpread.min
        ? Math.min(
            100,
            40 +
              (1 -
                (intel.priceSpread.median - intel.priceSpread.min) /
                  (intel.priceSpread.max - intel.priceSpread.min)) *
                60
          )
        : 72;
    return [clarity, equilibrium, band] as const;
  }, [intel]);

  const heatRows = useMemo(() => {
    return intel.trustMatrix.slice(0, 8).map((row) => {
      const trustNorm = row.trust / 100;
      const mkt =
        row.marketplaceRisk === "high" ? 0.25 : row.marketplaceRisk === "medium" ? 0.55 : 0.88;
      return { ...row, trustNorm, mkt };
    });
  }, [intel.trustMatrix]);

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 36 }}
      className="space-y-8 md:space-y-10"
      aria-label="Global shopping intelligence"
    >
      <div
        className={`relative overflow-hidden rounded-[1.75rem] border bg-gradient-to-br p-7 sm:p-10 backdrop-blur-[28px] ${finalTone(intel.finalRecommendation)}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_20%_0%,rgba(34,211,238,0.06),transparent_58%)]" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium tracking-tight text-slate-500/90">
              {intel.basketRegionBias === "unknown" || intel.basketRegionBias === "mixed"
                ? "Mixed seller regions"
                : `Seller mix leans ${intel.basketRegionBias.toUpperCase()}`}
            </p>
            <h3 className="cockpit-display mt-4 text-[1.35rem] leading-[1.12] text-white sm:text-[1.65rem]">
              {intel.finalHeadline}
            </h3>
            <p className="cockpit-body mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-400/95">{intel.finalBody}</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-2.5">
              {intel.globalDeal && (
                <a
                  href={intel.globalDeal.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-400/18 bg-emerald-500/[0.06] px-3.5 py-2 text-[13px] font-medium text-emerald-50/95 transition hover:bg-emerald-500/10"
                >
                  Global value · {intel.globalDeal.store}
                  <ArrowRight className="size-3.5" aria-hidden />
                </a>
              )}
              {intel.localDeal && (
                <a
                  href={intel.localDeal.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-400/16 bg-cyan-500/[0.05] px-3.5 py-2 text-[13px] font-medium text-cyan-50/95 transition hover:bg-cyan-500/10"
                >
                  <MapPin className="size-3.5" aria-hidden />
                  Regional edge · {intel.localDeal.store}
                </a>
              )}
              {intel.cheapestReliable && (
                <a
                  href={intel.cheapestReliable.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3.5 py-2 text-[13px] font-medium text-slate-300/95 transition hover:border-white/[0.12]"
                >
                  Trusted value · {intel.cheapestReliable.store}
                </a>
              )}
              {intel.mostTrustedListing && (
                <a
                  href={intel.mostTrustedListing.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-violet-400/16 bg-violet-500/[0.05] px-3.5 py-2 text-[13px] font-medium text-violet-100/95 transition hover:bg-violet-500/10"
                >
                  <Shield className="size-3.5" aria-hidden />
                  Safest seller · {intel.mostTrustedListing.store}
                </a>
              )}
            </div>
          </div>
          <div className="w-full shrink-0 lg:w-64">
            <p className="cockpit-overline text-slate-500/80">Read quality</p>
            <div className="mt-4 flex justify-center lg:justify-start">
              <ConfidenceTriRadar
                values={radarVals}
                reduceMotion={!!reduceMotion}
                disableInfinitePulse={!!reduceMotion || performanceMode}
              />
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-black/40">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500/80 via-slate-400/70 to-emerald-500/75"
                initial={reduceMotion ? false : { width: 0 }}
                animate={{ width: `${confPct}%` }}
                transition={{ duration: reduceMotion ? 0 : 0.85, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-slate-500/90">
              {tierLabel(intel.confidenceTier)} · uncertainty {intel.buyerUncertaintyScore}/100
            </p>
            {intel.insufficientDataWarnings.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-[11px] text-amber-200/90">
                {intel.insufficientDataWarnings.slice(0, 4).map((w) => (
                  <li key={w} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {!showDeepLayers && (
        <div className="cockpit-glass-panel relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/[0.04] via-transparent to-white/[0.03]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Intelligence preview
              </p>
              <p className="mt-1 max-w-xl text-sm font-medium text-white/90">
              Pro and Power Buyer unlock richer seller graphs, market timing, and full global synthesis on every scan.
              </p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_12px_36px_-14px_rgba(15,23,42,0.55)] transition hover:brightness-[1.02]"
            >
              View intelligence plans
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      )}

      {showDeepLayers && !deepOpen && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
          <button
            type="button"
            onClick={() => setDeepOpen(true)}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/[0.03]"
            aria-expanded={false}
          >
            <span className="text-[13px] font-medium text-slate-300/95">Full analyst layer</span>
            <ChevronDown className="size-4 text-slate-500" aria-hidden />
          </button>
        </div>
      )}

      {showDeepLayers && deepOpen && (
        <>
          <div className="cockpit-glass-panel p-6 sm:p-8">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
              <div>
                <p className="text-[13px] font-semibold tracking-tight text-white/92">Price spread</p>
                <p className="mt-3 text-3xl font-semibold tabular-nums tracking-[-0.03em] text-white/95">
                  €{intel.priceSpread.min.toFixed(0)}
                  <span className="mx-2 text-slate-600">→</span>
                  €{intel.priceSpread.max.toFixed(0)}
                </p>
                <p className="mt-2 text-[13px] text-slate-500/95">Median €{intel.priceSpread.median.toFixed(0)}</p>
                <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-black/35">
                  <div
                    className="bg-gradient-to-r from-emerald-400/75 to-amber-400/85"
                    style={{
                      width: `${
                        intel.priceSpread.max > intel.priceSpread.min
                          ? Math.min(
                              100,
                              ((intel.priceSpread.median - intel.priceSpread.min) /
                                (intel.priceSpread.max - intel.priceSpread.min)) *
                                100
                            )
                          : 50
                      }%`,
                    }}
                  />
                  <div className="flex-1 bg-violet-500/15" />
                </div>
              </div>
              <div className="border-t border-white/[0.05] pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
                <p className="text-[13px] font-semibold tracking-tight text-white/92">Market read</p>
                <p className="mt-3 text-[14px] leading-relaxed text-slate-400/95">
                  {[
                    intel.marketIntel.aggressiveFakeDiscount &&
                      "Some headline discounts look inflated compared with peer pricing.",
                    intel.marketIntel.ratingInflationRisk &&
                      "A few rows show very high stars with little review depth.",
                    intel.marketIntel.marketplaceVarianceRisk &&
                      "Third-party fulfillment adds variance—worth confirming the seller you get.",
                    intel.marketIntel.cheapestNotSafest &&
                      "The cheapest row is not always the safest checkout path.",
                  ]
                    .filter(Boolean)
                    .join(" ") || "This tray looks steady on deal stress and seller variance."}
                </p>
              </div>
            </div>

            <div className="mt-10 border-t border-white/[0.05] pt-10">
              <p className="text-[13px] font-semibold tracking-tight text-white/92">Who it suits</p>
              <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-slate-400/95">{intel.whoShouldBuy}</p>
              <p className="mt-4 max-w-3xl text-[14px] leading-relaxed text-rose-100/55">{intel.whoShouldAvoid}</p>
              <p className="mt-4 max-w-3xl text-[13px] leading-relaxed text-slate-500/90">{intel.timingNote}</p>
            </div>
          </div>

          <div className="cockpit-glass-panel bg-black/15 p-6 sm:p-8">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <p className="text-[13px] font-semibold tracking-tight text-white/92">Seller landscape</p>
              <span className="text-[12px] text-slate-500/90">Price fit, trust, marketplace safety</span>
            </div>
            <div className="mt-6 overflow-x-auto">
              <div className="min-w-[520px] space-y-0 divide-y divide-white/[0.05]">
                <div className="grid grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] gap-3 pb-3 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500/80">
                  <span>Store</span>
                  <span>Price fit</span>
                  <span>Trust</span>
                  <span>Marketplace</span>
                </div>
                {heatRows.map((row) => (
                  <div
                    key={row.store}
                    className="grid grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] gap-3 py-3.5 text-[13px] leading-relaxed"
                  >
                    <span className="truncate font-medium text-slate-200/95">{row.store}</span>
                    <HeatCell v={row.priceFit} />
                    <HeatCell v={row.trustNorm} />
                    <HeatCell v={row.mkt} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="cockpit-glass-panel p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="size-4 text-violet-300/70" aria-hidden />
              <p className="text-[13px] font-semibold tracking-tight text-white/92">How different shoppers read this tray</p>
            </div>
            <div className="flex gap-5 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
              {intel.personaCards.map((card, i) => (
                <motion.div
                  key={card.id}
                  initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduceMotion ? 0 : i * 0.04 }}
                  className="min-w-[260px] max-w-[280px] shrink-0 rounded-2xl border border-white/[0.055] bg-gradient-to-b from-white/[0.035] to-black/30 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-semibold tracking-tight text-white/93">{card.title}</p>
                    <span className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium tabular-nums text-slate-400/95">
                      {card.fitScore}
                    </span>
                  </div>
                  <p className="mt-3 text-[13px] font-medium leading-snug text-slate-300/92">{card.verdict}</p>
                  <p className="mt-3 text-[13px] leading-relaxed text-slate-500/92">{card.body}</p>
                  {card.suggestedLink && card.suggestedStore && (
                    <a
                      href={card.suggestedLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-cyan-300/95 hover:underline"
                    >
                      Open · {card.suggestedStore}
                      <ArrowRight className="size-3.5" />
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="cockpit-glass-panel p-6 sm:p-8">
            <div className="grid gap-10 md:grid-cols-2 md:gap-12">
              <div>
                <p className="text-[13px] font-semibold tracking-tight text-white/92">Trade-offs</p>
                <p className="mt-3 text-[14px] leading-relaxed text-slate-400/95">{intel.opportunityCostNote}</p>
              </div>
              <div className="border-t border-white/[0.05] pt-8 md:border-l md:border-t-0 md:pl-12 md:pt-0">
                <p className="text-[13px] font-semibold tracking-tight text-white/92">Stepping up a tier</p>
                <p className="mt-3 text-[14px] leading-relaxed text-slate-400/95">
                  {intel.upgradeWorthItNote ??
                    "No strong upgrade signal on this query—the field looks flat on spec deltas."}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </motion.section>
  );
}

function triRadarPoints(values: readonly [number, number, number]): string {
  const cx = 50;
  const cy = 52;
  const maxR = 34;
  const angles = [-Math.PI / 2, (5 * Math.PI) / 6, Math.PI / 6] as const;
  return values
    .map((raw, i) => {
      const v = Math.max(0, Math.min(100, raw)) / 100;
      const r = maxR * v;
      const x = cx + r * Math.cos(angles[i]!);
      const y = cy + r * Math.sin(angles[i]!);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function ConfidenceTriRadar({
  values,
  reduceMotion,
  disableInfinitePulse,
}: {
  values: readonly [number, number, number];
  reduceMotion: boolean;
  disableInfinitePulse?: boolean;
}) {
  const shell = triRadarPoints([100, 100, 100]);
  const fill = triRadarPoints(values);
  const pulseOff = reduceMotion || disableInfinitePulse;
  return (
    <div className="relative">
      <svg width="132" height="124" viewBox="0 0 100 100" role="img" aria-label="Tri-axis confidence radar">
        <defs>
          <linearGradient id="qi-radar-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.22)" />
            <stop offset="50%" stopColor="rgba(148,163,184,0.18)" />
            <stop offset="100%" stopColor="rgba(52,211,153,0.2)" />
          </linearGradient>
        </defs>
        <polygon points={shell} fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth="0.75" />
        <motion.polygon
          points={fill}
          fill="url(#qi-radar-fill)"
          stroke="rgba(148,163,184,0.28)"
          strokeWidth="0.75"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
          animate={
            pulseOff
              ? { opacity: 1, scale: 1 }
              : { opacity: 1, scale: [1, 1.012, 1] }
          }
          transition={
            pulseOff
              ? { duration: 0 }
              : {
                  opacity: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                  scale: { duration: 5.5, repeat: Infinity, ease: "easeInOut" },
                }
          }
          style={{ transformOrigin: "50px 52px" }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-between px-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-500/75">
        <span className="w-8 text-center leading-tight">Signal</span>
        <span className="w-8 text-center leading-tight">Calm</span>
        <span className="w-8 text-center leading-tight">Band</span>
      </div>
    </div>
  );
}

function HeatCell({ v }: { v: number }) {
  const hue =
    v >= 0.72 ? "bg-emerald-500/45" : v >= 0.48 ? "bg-amber-400/38" : v >= 0.32 ? "bg-orange-500/32" : "bg-rose-500/38";
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-1.5 flex-1 rounded-full ${hue}`} style={{ opacity: 0.28 + v * 0.42 }} />
      <CheckCircle2 className="size-3 shrink-0 text-slate-600" aria-hidden />
    </div>
  );
}
