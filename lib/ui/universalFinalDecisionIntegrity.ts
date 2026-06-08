/**
 * Phase 27.5 — Universal Final Decision Integrity.
 * Final authority pass: confidence/verdict alignment, no static buckets, no invalid 0%.
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import type { ExposureChip } from "@/lib/ui/intelligenceExposureActivation";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import { primaryVerdictAlignment } from "@/lib/ui/decisionLanguage";
import { resolveEvidenceConfidence } from "@/lib/ui/evidenceConfidenceAuthority";
import { filterChipsForPhase270Presentation } from "@/lib/ui/phase270PresentationActivation";
import {
  buildProductDifferentiationProfile,
  type ProductTrayMeta,
} from "@/lib/ui/productDifferentiationEngine";
import {
  buildSurfaceSummaryLines,
  resolveProductReasonAuthority,
  type VerdictReasonAuthority,
} from "@/lib/ui/verdictReasonAuthority";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";

export type FinalDecisionIntegrityInput = {
  decision: UniversalProductDecision;
  coherent: CoherentProductDecision;
  meta: ProductTrayMeta;
  trayAlternativePressure: number;
  traySize: number;
  dominancePenalty?: number;
};

export type FinalDecisionIntegrityResult = {
  finalVerdict: PrimaryVerdict;
  finalConfidence: number;
  primaryReason: string;
  secondaryReason: string;
  evidenceChips: ExposureChip[];
  integrityFlags: string[];
  reasonAuthority: VerdictReasonAuthority;
  summaryLines: [string, string];
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function safeScore(value: number | null | undefined, fallback = 0): number {
  return value != null && Number.isFinite(value) ? value : fallback;
}

function clipLine(text: string, max = 96): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function effectiveTrust(coherent: CoherentProductDecision): number {
  const { trustRisk } = coherent;
  if (Number.isFinite(trustRisk.trustScore) && trustRisk.trustScore > 0) {
    return trustRisk.trustScore;
  }
  return clampScore(100 - safeScore(trustRisk.riskScore, 50));
}

function isCriticallyBroken(coherent: CoherentProductDecision, meta: ProductTrayMeta): boolean {
  const trust = effectiveTrust(coherent);
  const risk = safeScore(coherent.trustRisk.riskScore);
  return (
    trust < 28 ||
    risk >= 72 ||
    safeScore(coherent.trustRisk.factors.suspiciousOfferRisk) >= 68 ||
    (meta.reviewsCount <= 0 && meta.rating <= 0 && trust < 40)
  );
}

function isPriceOnlyReasoning(reason: string): boolean {
  const lower = reason.toLowerCase();
  const priceCue =
    lower.includes("historical low") ||
    lower.includes("above historical") ||
    lower.includes("price sits") ||
    lower.includes("target entry") ||
    lower.includes("distance from");
  const nonPriceCue =
    lower.includes("trust") ||
    lower.includes("intent") ||
    lower.includes("fit") ||
    lower.includes("seller") ||
    lower.includes("discount") ||
    lower.includes("risk") ||
    lower.includes("authority");
  return priceCue && !nonPriceCue;
}

function recomputeEvidenceConfidence(input: FinalDecisionIntegrityInput): number {
  const profile = buildProductDifferentiationProfile(input.decision.link, input.coherent, input.meta);
  return resolveEvidenceConfidence({
    link: input.decision.link,
    coherent: input.coherent,
    profile,
    meta: input.meta,
    alternativePressureScore: input.decision.alternativePressureScore,
    dominancePenalty: input.dominancePenalty ?? 0,
    traySize: input.traySize,
  }).confidenceScore;
}

function normalizeConfidence(input: FinalDecisionIntegrityInput): {
  confidence: number;
  flags: string[];
} {
  const flags: string[] = [];
  let confidence = input.decision.confidence;

  if (isCriticallyBroken(input.coherent, input.meta)) {
    const recomputed = recomputeEvidenceConfidence(input);
    return {
      confidence: clampScore(Math.max(1, Math.min(15, recomputed))),
      flags: ["critical_data_failure"],
    };
  }

  if (!Number.isFinite(confidence) || confidence <= 0) {
    confidence = recomputeEvidenceConfidence(input);
    flags.push("confidence_recomputed");
  }

  if (confidence < 16) {
    confidence = Math.max(16, recomputeEvidenceConfidence(input));
    flags.push("confidence_floor_applied");
  }

  if (confidence === primaryVerdictAlignment(input.decision.verdict)) {
    confidence = recomputeEvidenceConfidence(input);
    flags.push("legacy_bucket_removed");
  }

  if (isPriceOnlyReasoning(input.decision.reasonLine)) {
    confidence = Math.max(16, confidence - 10);
    flags.push("market_limited_signal");
  }

  if (confidence < 16) {
    confidence = Math.max(16, recomputeEvidenceConfidence(input));
    flags.push("confidence_floor_applied");
  }

  return { confidence: clampScore(confidence), flags };
}

type IntegritySignals = {
  trustOk: boolean;
  riskHigh: boolean;
  priceElevated: boolean;
  intentOk: boolean;
  categoryOk: boolean;
  alternativePressure: number;
  canAvoid: boolean;
};

function extractSignals(input: FinalDecisionIntegrityInput, confidence: number): IntegritySignals {
  const { coherent, decision } = input;
  const trust = effectiveTrust(coherent);
  const risk = safeScore(coherent.trustRisk.riskScore);
  const distLow = safeScore(coherent.priceTarget.distanceFromLowPct, 0);
  return {
    trustOk: trust >= 58 && risk < 55,
    riskHigh: risk >= 58 || trust < 45,
    priceElevated: distLow >= 15 || safeScore(coherent.priceTarget.opportunityScore, 50) < 45,
    intentOk: coherent.intentIntelligence.intentMatchScore >= 54,
    categoryOk: coherent.categoryIntelligence.categoryScore >= 50,
    alternativePressure: decision.alternativePressureScore,
    canAvoid:
      risk >= 52 ||
      trust < 42 ||
      safeScore(coherent.trustRisk.factors.suspiciousOfferRisk) >= 55 ||
      confidence <= 24,
  };
}

function buyReadyEligible(signals: IntegritySignals, confidence: number): boolean {
  return (
    confidence >= 74 &&
    signals.trustOk &&
    !signals.priceElevated &&
    !signals.riskHigh &&
    (signals.intentOk || signals.categoryOk)
  );
}

function compareEligible(signals: IntegritySignals, confidence: number): boolean {
  return (
    signals.alternativePressure >= 48 &&
    confidence >= 45 &&
    confidence <= 79 &&
    !signals.riskHigh
  );
}

function resolveVerdictFromEvidence(
  proposed: PrimaryVerdict,
  confidence: number,
  signals: IntegritySignals
): PrimaryVerdict {
  if (signals.canAvoid && confidence <= 24) return "AVOID";
  if (signals.riskHigh && confidence < 35) return "AVOID";

  if (buyReadyEligible(signals, confidence)) return "BUY READY";

  if (confidence >= 80 && signals.trustOk && !signals.priceElevated && signals.intentOk) {
    return "BUY READY";
  }

  if (confidence >= 65 && confidence < 74) {
    if (signals.trustOk && !signals.priceElevated && signals.intentOk && signals.categoryOk) {
      return compareEligible(signals, confidence) ? "COMPARE" : "WAIT";
    }
    return "WAIT";
  }

  if (proposed === "BUY READY" && confidence < 65) {
    return compareEligible(signals, confidence) ? "COMPARE" : "WAIT";
  }

  if (proposed === "COMPARE") {
    return compareEligible(signals, confidence) ? "COMPARE" : "WAIT";
  }

  if (compareEligible(signals, confidence) && confidence >= 45 && confidence <= 72) {
    return "COMPARE";
  }

  if (confidence >= 45) return "WAIT";
  if (confidence >= 25) return signals.riskHigh ? "AVOID" : "WAIT";
  return "AVOID";
}

function buildIntegrityReasons(
  input: FinalDecisionIntegrityInput,
  verdict: PrimaryVerdict,
  confidence: number,
  signals: IntegritySignals
): { primary: string; secondary: string } {
  const { coherent, meta } = input;
  const store = meta.store;
  const trust = effectiveTrust(coherent);

  if (verdict === "BUY READY") {
    return {
      primary: clipLine(
        `${store}: trust ${trust}/100, fit ${coherent.intentIntelligence.intentMatchScore}/100 — checkout-ready at ${confidence}%.`
      ),
      secondary: clipLine(
        coherent.discountTruth.verdict === "Genuine" || coherent.discountTruth.verdict === "Likely Genuine"
          ? `Discount ${coherent.discountTruth.verdict} supports buy timing.`
          : `Value and seller posture support immediate purchase.`
      ),
    };
  }

  if (verdict === "WAIT") {
    const driver = signals.priceElevated
      ? clipLine(coherent.priceTarget.explanation || "Price remains above a favorable entry band.")
      : signals.trustOk
        ? clipLine("Evidence coverage is limited — patience improves decision quality.")
        : clipLine(coherent.buyWait.explanation || "Market timing is not favorable enough yet.");
    return {
      primary: clipLine(`${store}: wait posture at ${confidence}% — ${driver}`),
      secondary: clipLine(
        signals.priceElevated
          ? "Market-limited signal — price history alone does not justify checkout."
          : "Hold until trust, value, and timing align."
      ),
    };
  }

  if (verdict === "COMPARE") {
    return {
      primary: clipLine(
        `${store}: close alternatives remain (${signals.alternativePressure}/100 pressure) at ${confidence}%.`
      ),
      secondary: clipLine(
        coherent.alternativeAdvantage.comparisonSummary ||
          "Compare spec, price, and seller trust before choosing."
      ),
    };
  }

  return {
    primary: clipLine(
      `${store}: avoid — risk ${safeScore(coherent.trustRisk.riskScore)}/100, trust ${trust}/100.`
    ),
    secondary: clipLine(
      coherent.trustRisk.riskReason || "Seller, pricing, or verification fails safe checkout checks."
    ),
  };
}

function buildReasonAuthority(
  coherent: CoherentProductDecision,
  verdict: PrimaryVerdict,
  confidence: number
): VerdictReasonAuthority {
  return resolveProductReasonAuthority({
    verdict,
    alignmentScore: confidence,
    isLeadProduct: coherent.isLeadProduct,
    rankingRationaleLine: coherent.rankingRationaleLine,
    discountTruth: coherent.discountTruth,
    buyWait: coherent.buyWait,
    priceTarget: coherent.priceTarget,
    alternativeAdvantage: coherent.alternativeAdvantage,
    categoryIntelligence: coherent.categoryIntelligence,
    intentIntelligence: coherent.intentIntelligence,
    trustRisk: coherent.trustRisk,
  });
}

/** Final integrity pass on universal product decision (after Phase 27.4). */
export function universalFinalDecisionIntegrity(
  input: FinalDecisionIntegrityInput
): FinalDecisionIntegrityResult {
  const { confidence, flags } = normalizeConfidence(input);
  const signals = extractSignals(input, confidence);
  let finalVerdict = resolveVerdictFromEvidence(input.decision.verdict, confidence, signals);
  const finalConfidence = confidence;

  if (finalVerdict === "BUY READY" && finalConfidence < 65) {
    finalVerdict = compareEligible(signals, finalConfidence) ? "COMPARE" : "WAIT";
    flags.push("buy_ready_downgraded");
  }

  if (finalVerdict === "BUY READY" && finalConfidence < 74) {
    if (!buyReadyEligible(signals, finalConfidence)) {
      finalVerdict = compareEligible(signals, finalConfidence) ? "COMPARE" : "WAIT";
      flags.push("buy_ready_confidence_gate");
    }
  }

  if (finalVerdict === "COMPARE" && !compareEligible(signals, finalConfidence)) {
    finalVerdict = "WAIT";
    flags.push("compare_requires_alternative_pressure");
  }

  if (finalVerdict === "AVOID" && finalConfidence > 24 && !signals.canAvoid) {
    finalVerdict = "WAIT";
    flags.push("avoid_downgraded_to_wait");
  }

  const { primary, secondary } = buildIntegrityReasons(input, finalVerdict, finalConfidence, signals);
  const reasonAuthority = buildReasonAuthority(input.coherent, finalVerdict, finalConfidence);
  const evidenceChips = filterChipsForPhase270Presentation(
    input.decision.displayChips.length > 0
      ? input.decision.displayChips
      : input.coherent.intelligenceExposure.chips,
    reasonAuthority,
    `Integrity confidence ${finalConfidence}% — ${secondary}`
  );

  return {
    finalVerdict,
    finalConfidence,
    primaryReason: primary,
    secondaryReason: secondary,
    evidenceChips,
    integrityFlags: flags,
    reasonAuthority,
    summaryLines: buildSurfaceSummaryLines(reasonAuthority),
  };
}

export function mergeIntegrityIntoUniversalDecision(
  decision: UniversalProductDecision,
  integrity: FinalDecisionIntegrityResult
): UniversalProductDecision {
  return {
    ...decision,
    verdict: integrity.finalVerdict,
    confidence: integrity.finalConfidence,
    reasonLine: integrity.primaryReason,
    confidenceReason: clipLine(
      `Integrity confidence ${integrity.finalConfidence}% — ${integrity.secondaryReason}`
    ),
    reasonAuthority: integrity.reasonAuthority,
    displayChips: integrity.evidenceChips,
    summaryLines: integrity.summaryLines,
    integrityFlags: integrity.integrityFlags,
    primaryReason: integrity.primaryReason,
    secondaryReason: integrity.secondaryReason,
  };
}

/** Tray-wide COMPARE cap unless alternative pressure is genuinely high. */
export function enforceTrayCompareIntegrity(
  decisions: Map<string, UniversalProductDecision>,
  trayAlternativePressure: number
): Map<string, UniversalProductDecision> {
  const rows = [...decisions.entries()];
  const n = rows.length;
  if (n === 0) return decisions;

  const maxCompare = trayAlternativePressure >= 55 ? Math.floor(n * 0.4) : Math.floor(n * 0.25);
  let compareRows = rows.filter(([, row]) => row.verdict === "COMPARE");
  if (compareRows.length <= maxCompare) return decisions;

  compareRows.sort((a, b) => a[1].confidence - b[1].confidence);
  const out = new Map(decisions);
  while (compareRows.length > maxCompare) {
    const [link, row] = compareRows.shift()!;
    out.set(link, {
      ...row,
      verdict: "WAIT",
      reasonLine: clipLine(`${row.reasonLine} — insufficient alternative separation for compare.`),
      integrityFlags: [...(row.integrityFlags ?? []), "tray_compare_cap"],
    });
  }
  return out;
}
