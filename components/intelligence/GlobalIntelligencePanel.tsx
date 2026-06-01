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
import { readQualitySignal, searchIntelActionLabel } from "@/lib/ui/decisionLanguage";

type Props = {
  intel: SearchIntelligenceDTO;
  /** Free plan shows condensed synthesis; Pro/Premium see full layers. */
  displayLevel?: SearchIntelligenceLevel;
  /** Mobile / touch: deep tables & persona lane load behind an expand control. */
  performanceMode?: boolean;
  /** Compact preview after product grid — no deep analyst layers. */
  compact?: boolean;
};

function finalToneClass(kind: SearchIntelligenceDTO["finalRecommendation"]): string {
  switch (kind) {
    case "buy_now":
    case "best_trusted_option":
    case "smart_long_term_buy":
      return "qa-ui-intel-hero--positive";
    case "wait":
      return "qa-ui-intel-hero--wait";
    case "risky_deal":
    case "cheapest_but_risky":
    case "premium_but_overpriced":
      return "qa-ui-intel-hero--caution";
    default:
      return "";
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
  compact = false,
}: Props) {
  const reduceMotion = useReducedMotion();
  const showDeepLayers = !compact && displayLevel !== "summary";
  const [deepOpen, setDeepOpen] = useState(displayLevel === "full" && !compact);
  const confPct = Math.max(8, 100 - intel.buyerUncertaintyScore);
  const spreadWide =
    intel.priceSpread.max > intel.priceSpread.min &&
    (intel.priceSpread.max - intel.priceSpread.min) / Math.max(intel.priceSpread.min, 1) > 0.35;
  const readQuality = readQualitySignal({
    confidencePct: confPct,
    uncertainty: intel.buyerUncertaintyScore,
    spreadWide,
  });
  const actionLabel = searchIntelActionLabel(intel.finalRecommendation);
  const heatRows = useMemo(() => {
    return intel.trustMatrix.slice(0, 8).map((row) => {
      const trustNorm = row.trust / 100;
      const mkt =
        row.marketplaceRisk === "high" ? 0.25 : row.marketplaceRisk === "medium" ? 0.55 : 0.88;
      return { ...row, trustNorm, mkt };
    });
  }, [intel.trustMatrix]);

  if (compact) {
    return (
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 36 }}
        className="qa-ref-decision-summary"
        aria-label="Decision summary"
      >
        <p className="qa-ref-kicker">Decision summary</p>
        <dl className="qa-ref-decision-summary__grid">
          <div>
            <dt>Recommended action</dt>
            <dd
              className={`qa-ref-decision-summary__action qa-ref-decision-summary__action--${actionLabel.replace(/\s+/g, "-").toLowerCase()}`}
            >
              {actionLabel}
            </dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd>{confPct}%</dd>
          </div>
        </dl>
        <div className="qa-ref-decision-summary__block">
          <p className="qa-ref-decision-summary__label">Reason</p>
          <p className="qa-ref-decision-summary__text">{readQuality.reason}</p>
        </div>
        <div className="qa-ref-decision-summary__block">
          <p className="qa-ref-decision-summary__label">Market observation</p>
          <p className="qa-ref-decision-summary__text line-clamp-3">{intel.finalBody}</p>
        </div>
        <Link href="/pricing" className="qa-ref-decision-summary__link">
          Unlock deeper buying intelligence
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 36 }}
      className="qa-ui-analyst-shell space-y-8 md:space-y-10"
      aria-label="Global shopping intelligence"
    >
      <div
        className={`qa-ui-intel-hero qa-ui-intelligence-surface relative overflow-hidden p-7 sm:p-10 ${finalToneClass(intel.finalRecommendation)}`}
      >
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
          <div className="min-w-0 flex-1">
            <p className="qa-ref-decision-badge qa-ref-decision-badge--intel">
              {String(searchIntelActionLabel(intel.finalRecommendation))}
            </p>
            <p className="text-[12px] font-medium tracking-tight text-slate-500/90">
              {intel.basketRegionBias === "unknown" || intel.basketRegionBias === "mixed"
                ? "Mixed seller regions"
                : `Seller mix leans ${intel.basketRegionBias.toUpperCase()}`}
            </p>
            <h3 className="cockpit-display mt-3 text-[1.35rem] leading-[1.12] text-white sm:text-[1.65rem]">
              {intel.finalHeadline}
            </h3>
            <p className="cockpit-body mt-2 max-w-3xl line-clamp-3 text-[14px] leading-relaxed text-slate-400/95">
              {intel.finalBody}
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-2.5">
              {intel.globalDeal && (
                <a
                  href={intel.globalDeal.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="qa-ui-deal-chip qa-ui-deal-chip--positive"
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
                  className="qa-ui-deal-chip qa-ui-deal-chip--regional"
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
                  className="qa-ui-deal-chip"
                >
                  Trusted value · {intel.cheapestReliable.store}
                </a>
              )}
              {intel.mostTrustedListing && (
                <a
                  href={intel.mostTrustedListing.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="qa-ui-deal-chip qa-ui-deal-chip--trusted"
                >
                  <Shield className="size-3.5" aria-hidden />
                  Safest seller · {intel.mostTrustedListing.store}
                </a>
              )}
            </div>
          </div>
          <div className="w-full shrink-0 lg:w-56">
            <div className="qa-ref-read-quality">
              <p className="qa-ref-kicker">Read quality</p>
              <dl className="qa-ref-read-quality__grid">
                <div>
                  <dt>Signal</dt>
                  <dd>{readQuality.signal}</dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd>{readQuality.confidence}</dd>
                </div>
              </dl>
              <p className="qa-ref-read-quality__reason">{readQuality.reason}</p>
            </div>
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
        <div className="qa-ui-glass-panel relative overflow-hidden p-6 sm:p-8">
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="qa-ui-type-label">Intelligence preview</p>
              <p className="qa-ui-drawer-body-text qa-ui-drawer-emphasis mt-1 max-w-xl text-sm font-medium">
              Pro and Power Buyer unlock richer seller graphs, market timing, and full global synthesis on every scan.
              </p>
            </div>
            <Link
              href="/pricing"
              className="qa-ui-btn-primary inline-flex shrink-0 px-5 py-2.5 text-sm"
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
                <div className="qa-ui-confidence-band mt-5 h-2.5 overflow-hidden rounded-full">
                  <div
                    className="qa-ui-confidence-fill h-full"
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

          <div className="qa-ui-glass-panel p-6 sm:p-8">
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
                      className="qa-ui-drawer-link mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium"
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
