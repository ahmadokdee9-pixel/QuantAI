"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Globe2,
  MapPin,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { SearchIntelligenceLevel } from "@/lib/subscription/plans";
import Link from "next/link";

type Props = {
  intel: SearchIntelligenceDTO;
  /** Free plan shows condensed synthesis; Pro/Premium see full layers. */
  displayLevel?: SearchIntelligenceLevel;
};

function finalTone(kind: SearchIntelligenceDTO["finalRecommendation"]): string {
  switch (kind) {
    case "buy_now":
    case "best_trusted_option":
    case "smart_long_term_buy":
      return "from-emerald-500/20 via-cyan-500/10 to-transparent border-emerald-400/30";
    case "wait":
      return "from-rose-500/15 via-violet-500/10 to-transparent border-rose-400/30";
    case "risky_deal":
    case "cheapest_but_risky":
      return "from-amber-500/18 via-orange-500/8 to-transparent border-amber-400/35";
    case "premium_but_overpriced":
      return "from-violet-500/15 to-transparent border-violet-400/30";
    default:
      return "from-cyan-500/12 to-transparent border-cyan-400/25";
  }
}

function tierLabel(t: SearchIntelligenceDTO["confidenceTier"]): string {
  if (t === "high") return "Model confidence · high";
  if (t === "moderate") return "Model confidence · moderate";
  if (t === "low") return "Model confidence · low";
  return "Verify manually";
}

export default function GlobalIntelligencePanel({ intel, displayLevel = "full" }: Props) {
  const reduceMotion = useReducedMotion();
  const showDeepLayers = displayLevel !== "summary";
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
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="mb-10 space-y-6"
      aria-label="Global shopping intelligence"
    >
      <div
        className={`relative overflow-hidden rounded-[1.75rem] border bg-gradient-to-br p-5 sm:p-7 backdrop-blur-[28px] ${finalTone(intel.finalRecommendation)}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_20%_0%,rgba(34,211,238,0.12),transparent_55%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100/95">
                <Globe2 className="size-3.5" aria-hidden />
                Live global synthesis
              </span>
              <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                {intel.basketRegionBias === "unknown" || intel.basketRegionBias === "mixed"
                  ? "Region mix · inferred from store names"
                  : `Store-name bias · ${intel.basketRegionBias.toUpperCase()}`}
              </span>
            </div>
            <h3 className="cockpit-display mt-3 text-xl text-white sm:text-[1.65rem]">
              {intel.finalHeadline}
            </h3>
            <p className="cockpit-body mt-2 max-w-3xl text-sm text-slate-300/95">{intel.finalBody}</p>
            <p className="cockpit-body mt-3 max-w-3xl text-[11px] leading-relaxed text-slate-500">
              Confidence reflects signal alignment in this tray—not a promise of market truth. Sparse listings or uneven
              stores increase uncertainty; cross-check price and seller before you commit.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {intel.globalDeal && (
                <a
                  href={intel.globalDeal.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
                >
                  Best global pick · {intel.globalDeal.store}
                  <ArrowRight className="size-3.5" aria-hidden />
                </a>
              )}
              {intel.localDeal && (
                <a
                  href={intel.localDeal.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-500/18"
                >
                  <MapPin className="size-3.5" aria-hidden />
                  Local lean · {intel.localDeal.store}
                </a>
              )}
              {intel.cheapestReliable && (
                <a
                  href={intel.cheapestReliable.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-white/20"
                >
                  Cheapest reliable · {intel.cheapestReliable.store}
                </a>
              )}
              {intel.mostTrustedListing && (
                <a
                  href={intel.mostTrustedListing.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/18"
                >
                  <Shield className="size-3.5" aria-hidden />
                  Most trusted · {intel.mostTrustedListing.store}
                </a>
              )}
            </div>
          </div>
          <div className="w-full shrink-0 lg:w-64">
            <p className="cockpit-overline text-slate-500">AI confidence radar</p>
            <div className="mt-3 flex justify-center lg:justify-start">
              <ConfidenceTriRadar values={radarVals} reduceMotion={!!reduceMotion} />
            </div>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {tierLabel(intel.confidenceTier)}
            </p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/40">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400"
                initial={reduceMotion ? false : { width: 0 }}
                animate={{ width: `${confPct}%` }}
                transition={{ duration: reduceMotion ? 0 : 0.85, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Uncertainty · {intel.buyerUncertaintyScore}/100 (↑ means verify more)
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
        <div className="cockpit-glass-panel relative overflow-hidden p-5 sm:p-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-violet-500/10" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/90">
                Intelligence locked
              </p>
              <p className="mt-1 max-w-xl text-sm font-medium text-white/90">
                Upgrade to Pro or Power Buyer for retailer trust graphs, persona reasoning, and full
                global deal synthesis on every search.
              </p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_28px_-6px_rgba(34,211,238,0.45)] transition hover:brightness-105"
            >
              View plans
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      )}

      {showDeepLayers && (
        <>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="cockpit-glass-panel p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
            <BarChart3 className="size-4 text-cyan-300" aria-hidden />
            Price intelligence lane
          </div>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-white">
            €{intel.priceSpread.min.toFixed(0)}
            <span className="mx-1 text-slate-600">→</span>
            €{intel.priceSpread.max.toFixed(0)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Median €{intel.priceSpread.median.toFixed(0)}</p>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-black/35">
            <div
              className="bg-gradient-to-r from-emerald-400/80 to-amber-400/90"
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
            <div className="flex-1 bg-violet-500/20" />
          </div>
        </div>

        <div className="cockpit-glass-panel p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
            <Shield className="size-4 text-violet-300" aria-hidden />
            Market pulse
          </div>
          <ul className="mt-3 space-y-1.5 text-[11px] text-slate-400">
            <li className={intel.marketIntel.aggressiveFakeDiscount ? "text-amber-200" : ""}>
              {intel.marketIntel.aggressiveFakeDiscount ? "●" : "○"} Fake-discount stress in tray
            </li>
            <li className={intel.marketIntel.ratingInflationRisk ? "text-amber-200" : ""}>
              {intel.marketIntel.ratingInflationRisk ? "●" : "○"} Thin-review / high-star pattern
            </li>
            <li className={intel.marketIntel.marketplaceVarianceRisk ? "text-amber-200" : ""}>
              {intel.marketIntel.marketplaceVarianceRisk ? "●" : "○"} Marketplace / third-party variance
            </li>
            <li className={intel.marketIntel.cheapestNotSafest ? "text-rose-200/90" : ""}>
              {intel.marketIntel.cheapestNotSafest ? "●" : "○"} Cheapest ≠ safest gap detected
            </li>
          </ul>
        </div>

        <div className="cockpit-glass-panel p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
            <Users className="size-4 text-emerald-300" aria-hidden />
            Human fit window
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{intel.whoShouldBuy}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-rose-100/70">{intel.whoShouldAvoid}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{intel.timingNote}</p>
        </div>
      </div>

      <div className="cockpit-glass-panel bg-black/20 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-white/90">Retailer trust graph</p>
          <span className="text-[10px] text-slate-500">Price fit · Trust · Marketplace safety</span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <div className="min-w-[520px] space-y-1">
            <div className="grid grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] gap-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Store</span>
              <span>Price fit</span>
              <span>Trust</span>
              <span>Mkt safety</span>
            </div>
            {heatRows.map((row) => (
              <div
                key={row.store}
                className="grid grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] gap-1 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-1.5 text-[11px]"
              >
                <span className="truncate font-medium text-slate-200">{row.store}</span>
                <HeatCell v={row.priceFit} />
                <HeatCell v={row.trustNorm} />
                <HeatCell v={row.mkt} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cockpit-glass-panel p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-violet-300" aria-hidden />
          <p className="text-xs font-semibold text-white/90">Persona reasoning stream</p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
          {intel.personaCards.map((card, i) => (
            <motion.div
              key={card.id}
              initial={reduceMotion ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: reduceMotion ? 0 : i * 0.04 }}
              className="min-w-[240px] max-w-[260px] shrink-0 rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-black/30 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white/95">{card.title}</p>
                <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-cyan-100">
                  {card.fitScore}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-cyan-200/85">{card.verdict}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{card.body}</p>
              {card.suggestedLink && card.suggestedStore && (
                <a
                  href={card.suggestedLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-300 hover:underline"
                >
                  Lean · {card.suggestedStore}
                  <ArrowRight className="size-3" />
                </a>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="cockpit-glass-panel p-4">
          <p className="text-xs font-semibold text-white/90">Opportunity spectrum</p>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-400">{intel.opportunityCostNote}</p>
        </div>
        <div className="cockpit-glass-panel p-4">
          <p className="text-xs font-semibold text-white/90">Upgrade projection</p>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
            {intel.upgradeWorthItNote ??
              "No strong upgrade signal for this query—QuantAI did not detect a clear spec cliff worth paying for yet."}
          </p>
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
}: {
  values: readonly [number, number, number];
  reduceMotion: boolean;
}) {
  const shell = triRadarPoints([100, 100, 100]);
  const fill = triRadarPoints(values);
  return (
    <div className="relative">
      <svg width="132" height="124" viewBox="0 0 100 100" role="img" aria-label="Tri-axis confidence radar">
        <defs>
          <linearGradient id="qi-radar-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.45)" />
            <stop offset="50%" stopColor="rgba(167,139,250,0.35)" />
            <stop offset="100%" stopColor="rgba(52,211,153,0.35)" />
          </linearGradient>
        </defs>
        <polygon points={shell} fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="0.9" />
        <motion.polygon
          points={fill}
          fill="url(#qi-radar-fill)"
          stroke="rgba(34,211,238,0.55)"
          strokeWidth="0.9"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "50px 52px" }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-between px-1 text-[8px] font-semibold uppercase tracking-wider text-slate-500">
        <span className="w-8 text-center leading-tight">Signal</span>
        <span className="w-8 text-center leading-tight">Calm</span>
        <span className="w-8 text-center leading-tight">Band</span>
      </div>
    </div>
  );
}

function HeatCell({ v }: { v: number }) {
  const hue =
    v >= 0.72 ? "bg-emerald-500/55" : v >= 0.48 ? "bg-amber-400/45" : v >= 0.32 ? "bg-orange-500/40" : "bg-rose-500/45";
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2 flex-1 rounded-full ${hue}`} style={{ opacity: 0.35 + v * 0.55 }} />
      <CheckCircle2 className="size-3 shrink-0 text-slate-600" aria-hidden />
    </div>
  );
}
