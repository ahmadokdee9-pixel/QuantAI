"use client";

/** QUANTAI_PHASE_26_2_STABLE_FROZEN — final verdict panel alignment. */
import { useMemo } from "react";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { QuantProduct } from "@/lib/shoppingScore";
import { buildMarketSummary } from "@/lib/ui/marketSummary";
import type { UnifiedTrayVerdict } from "@/lib/ui/unifiedVerdictAuthority";
import type { Phase270TrayPresentation } from "@/lib/ui/phase270PresentationActivation";

type Props = {
  products: QuantProduct[];
  searchIntelligence?: SearchIntelligenceDTO | null;
  marketComparison?: {
    merchantCount?: number;
    trustedMerchantCount?: number;
  } | null;
  /** Phase 26.1 — same authority as product cards (no parallel final verdict). */
  trayVerdict?: UnifiedTrayVerdict | null;
  /** Phase 27 — confidence-ranked final verdict overlay (Phase 26.2 verdict authority unchanged). */
  phase270Tray?: Phase270TrayPresentation | null;
};

function verdictTone(action: string): "buy-ready" | "compare" | "wait" {
  const normalized = action.replace(/\s+/g, " ").trim().toUpperCase();
  if (normalized === "BUY READY" || normalized === "BUY") return "buy-ready";
  if (normalized === "WAIT" || normalized === "AVOID") return "wait";
  return "compare";
}

function confidenceSegments(confidence: number): number {
  if (confidence >= 75) return 3;
  if (confidence >= 50) return 2;
  return 1;
}

/** Final verdict — synthesized intelligence climax for this scan. */
export default function MarketSummaryBlock({
  products,
  searchIntelligence = null,
  marketComparison = null,
  trayVerdict = null,
  phase270Tray = null,
}: Props) {
  const summary = useMemo(
    () => buildMarketSummary(products, searchIntelligence, marketComparison, trayVerdict),
    [products, searchIntelligence, marketComparison, trayVerdict],
  );

  if (!summary) return null;

  const tone = verdictTone(summary.recommendedAction);
  const displayConfidence = phase270Tray?.trayConfidence ?? summary.confidence;
  const segments = confidenceSegments(displayConfidence);
  const synthesisText = phase270Tray
    ? `Reason: ${phase270Tray.winningReasonLine} Alternative Pressure: ${phase270Tray.alternativePressureLine}`
    : summary.marketObservation;

  return (
    <section className="qa-ref-exec-brief qa-ref-exec-brief--climax" aria-label="Final verdict">
      <p className="qa-ref-exec-brief__kicker">Final verdict</p>

      <div className={`qa-ref-exec-brief__verdict qa-ref-exec-brief__verdict--${tone}`}>
        <span className="qa-ref-exec-brief__verdict-beam" aria-hidden />
        <span className="qa-ref-exec-brief__verdict-glow" aria-hidden />
        <span className="qa-ref-exec-brief__verdict-halo" aria-hidden />

        <div className="qa-ref-exec-brief__verdict-head">
          <span className="qa-ref-exec-brief__seal" aria-hidden />
          <span className="qa-ref-exec-brief__verdict-label">
            {summary.recommendedAction}
            {phase270Tray ? ` · ${displayConfidence}%` : ""}
          </span>
          <span className={`qa-ref-exec-brief__confidence qa-ref-exec-brief__confidence--${tone}`} aria-hidden>
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
