"use client";

/** Phase 38 — Market coverage replaces tray-level final verdict. */
import { useMemo } from "react";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { MarketCoverageIntelligence } from "@/lib/intelligence/marketCoverageEngine";
import type { SearchDominanceSummary } from "@/lib/intelligence/searchDominanceSummaryEngine";
import type { MarketSummaryV2 } from "@/lib/intelligence/marketSummaryV2Engine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { buildMarketSummary } from "@/lib/ui/marketSummary";
import type { Phase271TrayPresentation } from "@/lib/ui/phase271PresentationActivation";

type Props = {
  products: QuantProduct[];
  searchIntelligence?: SearchIntelligenceDTO | null;
  marketComparison?: {
    merchantCount?: number;
    trustedMerchantCount?: number;
  } | null;
  /** Phase 38 — market coverage replaces tray-level final verdict. */
  marketCoverage?: MarketCoverageIntelligence | null;
  /** Phase 40 — search dominance summary enriches synthesis (no new UI section). */
  searchDominanceSummary?: SearchDominanceSummary | null;
  /** Phase 41 — neutral market summary enriches synthesis (no new UI section). */
  marketSummaryV2?: MarketSummaryV2 | null;
  phase271Tray?: Phase271TrayPresentation | null;
};

function confidenceSegments(confidence: number): number {
  if (confidence >= 75) return 3;
  if (confidence >= 50) return 2;
  return 1;
}

/** Market coverage summary — product-level verdicts only, no global buy/wait/avoid. */
export default function MarketSummaryBlock({
  products,
  searchIntelligence = null,
  marketComparison = null,
  marketCoverage = null,
  searchDominanceSummary = null,
  marketSummaryV2 = null,
  phase271Tray = null,
}: Props) {
  const summary = useMemo(
    () => buildMarketSummary(products, searchIntelligence, marketComparison, null),
    [products, searchIntelligence, marketComparison],
  );

  if (!summary) return null;

  const coverageMode = Boolean(marketCoverage);
  const displayLabel = coverageMode
    ? `${marketCoverage!.coveragePct}% coverage`
    : summary.recommendedAction;
  const displayConfidence = coverageMode
    ? marketCoverage!.coveragePct
    : (phase271Tray?.trayConfidence ?? summary.confidence);
  const segments = confidenceSegments(displayConfidence);
  const synthesisText = coverageMode
    ? marketSummaryV2?.synthesisLine
      ? `${marketCoverage!.headline} ${marketSummaryV2.synthesisLine}`
      : searchDominanceSummary?.synthesisLine
        ? `${marketCoverage!.headline} ${searchDominanceSummary.synthesisLine}`
        : `${marketCoverage!.headline} ${marketCoverage!.detailLine}`
    : phase271Tray
      ? `Reason: ${phase271Tray.winningReasonLine} Alternative Pressure: ${phase271Tray.alternativePressureLine}`
      : summary.marketObservation;

  return (
    <section className="qa-ref-exec-brief qa-ref-exec-brief--climax" aria-label="Market coverage">
      <p className="qa-ref-exec-brief__kicker">{coverageMode ? "Market coverage" : "Market scan"}</p>

      <div className="qa-ref-exec-brief__verdict qa-ref-exec-brief__verdict--compare">
        <span className="qa-ref-exec-brief__verdict-beam" aria-hidden />
        <span className="qa-ref-exec-brief__verdict-glow" aria-hidden />
        <span className="qa-ref-exec-brief__verdict-halo" aria-hidden />

        <div className="qa-ref-exec-brief__verdict-head">
          <span className="qa-ref-exec-brief__seal" aria-hidden />
          <span className="qa-ref-exec-brief__verdict-label">
            {displayLabel}
            {coverageMode ? ` · ${marketCoverage!.merchantsScanned} merchants` : phase271Tray ? ` · ${displayConfidence}%` : ""}
          </span>
          <span className="qa-ref-exec-brief__confidence qa-ref-exec-brief__confidence--compare" aria-hidden>
            <span className={segments >= 1 ? "qa-ref-exec-brief__confidence-bar qa-ref-exec-brief__confidence-bar--on" : "qa-ref-exec-brief__confidence-bar"} />
            <span className={segments >= 2 ? "qa-ref-exec-brief__confidence-bar qa-ref-exec-brief__confidence-bar--on" : "qa-ref-exec-brief__confidence-bar"} />
            <span className={segments >= 3 ? "qa-ref-exec-brief__confidence-bar qa-ref-exec-brief__confidence-bar--on" : "qa-ref-exec-brief__confidence-bar"} />
          </span>
        </div>

        <p className="qa-ref-exec-brief__synthesis">{synthesisText}</p>
        <span className="qa-ref-exec-brief__lock" aria-hidden />
      </div>
    </section>
  );
}
