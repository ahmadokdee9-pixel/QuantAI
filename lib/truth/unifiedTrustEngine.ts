/**
 * Phase 1M — Unified trust engine.
 * Fuses all trust-related signals across the Truth Foundation stack.
 */

import { isHighPrimaryRisk } from "@/lib/truth/commerceReasoningLayer";
import type { TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";

export type TrustState =
  | "TRUST_STRONG"
  | "TRUST_GOOD"
  | "TRUST_CAUTION"
  | "TRUST_WEAK"
  | "TRUST_UNKNOWN";

export type TrustEngineSnapshot = {
  trustScore: number;
  trustConfidence: number;
  trustSignals: string[];
  trustRisks: string[];
  trustStrength: number;
  trustState: TrustState;
};

export type TrustEngineInput = Omit<TruthFoundationSnapshot, "trustEngine">;

export const WEAK_TRUST_SCORE_THRESHOLD = 52;
export const WEAK_TRUST_CONFIDENCE_THRESHOLD = 50;
export const WEAK_TRUST_STRENGTH_THRESHOLD = 48;
export const ELEVATED_TRUST_RISK_THRESHOLD = 2;

const TRUST_WEIGHTS = {
  skuIdentity: 0.12,
  availability: 0.08,
  priceTruth: 0.14,
  discount: 0.08,
  merchantReliability: 0.12,
  marketIntelligence: 0.12,
  productIntelligence: 0.12,
  commerceIntelligence: 0.12,
  commerceReasoning: 0.1,
  evidenceGraph: 0.1,
} as const;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function marketTrustScore(foundation: TrustEngineInput): number {
  const market = foundation.marketIntelligence;
  return clampScore((market.marketCoverage + market.marketAgreementScore + market.marketPriceConfidence) / 3);
}

function collectTrustSignals(foundation: TrustEngineInput): string[] {
  const signals = new Set<string>();

  if (foundation.skuIdentityConfidence >= 70) {
    signals.add(`Strong SKU identity (${foundation.skuIdentityConfidence})`);
  }
  if (foundation.availabilityState === "AVAILABLE" && foundation.availability.freshnessScore >= 80) {
    signals.add("Fresh availability confirmation");
  }
  if (foundation.priceTruthConfidence >= 65) {
    signals.add(`Price truth confidence ${foundation.priceTruthConfidence}`);
  }
  if (foundation.discountEvidence?.state === "VERIFIED_DISCOUNT") {
    signals.add("Verified discount signal");
  }
  if (foundation.merchantReliability.merchantState === "RELIABLE") {
    signals.add(`Reliable merchant (${foundation.merchantReliability.merchantReliabilityScore})`);
  }
  if (foundation.marketIntelligence.marketDepth >= 50) {
    signals.add(`Market depth ${foundation.marketIntelligence.marketDepth}`);
  }
  if (foundation.productIntelligence.overallProductConfidence >= 65) {
    signals.add(`Product intelligence ${foundation.productIntelligence.intelligenceState}`);
  }
  if (foundation.commerceIntelligence.commerceConfidence >= 65) {
    signals.add(`Commerce intelligence ${foundation.commerceIntelligence.commerceState}`);
  }
  if (foundation.commerceReasoning.strongestPositiveSignal !== "Limited positive confirmation") {
    signals.add(foundation.commerceReasoning.strongestPositiveSignal);
  }
  for (const item of foundation.evidenceReasoningGraph.supportingEvidence.slice(0, 3)) {
    signals.add(item);
  }

  return [...signals];
}

function collectTrustRisks(foundation: TrustEngineInput): string[] {
  const risks = new Set<string>();

  if (foundation.skuIdentityConfidence < 55) {
    risks.add("Weak SKU identity trust");
  }
  if (foundation.availabilityState === "UNAVAILABLE") {
    risks.add("Listing unavailable");
  } else if (foundation.availabilityState === "STALE" || foundation.availabilityState === "UNKNOWN") {
    risks.add("Uncertain availability trust");
  }
  if (foundation.priceTruth?.fakeDiscount.isFake) {
    risks.add("Fake discount undermines price trust");
  } else if (foundation.priceTruthConfidence < 45) {
    risks.add("Weak price truth trust");
  }
  if (foundation.merchantReliability.merchantReliabilityScore < 45 && foundation.merchantObservationCount >= 2) {
    risks.add(`Unreliable merchant (${foundation.merchantReliability.merchantState})`);
  }
  if (foundation.listingPriceOutlier) {
    risks.add("Listing price outlier vs market");
  }
  if (foundation.commerceReasoning.primaryRisk !== "none") {
    risks.add(foundation.commerceReasoning.strongestNegativeSignal);
  }
  if (isHighPrimaryRisk(foundation.commerceReasoning.primaryRisk)) {
    risks.add(`Primary commerce risk: ${foundation.commerceReasoning.primaryRisk}`);
  }
  for (const item of foundation.evidenceReasoningGraph.conflictingEvidence.slice(0, 4)) {
    risks.add(item);
  }

  return [...risks];
}

function deriveTrustState(args: {
  canonicalSkuId: string | null;
  trustScore: number;
  trustConfidence: number;
  trustRiskCount: number;
}): TrustState {
  if (!args.canonicalSkuId || args.trustScore < 25) {
    return "TRUST_UNKNOWN";
  }
  if (args.trustScore >= 78 && args.trustConfidence >= 70 && args.trustRiskCount === 0) {
    return "TRUST_STRONG";
  }
  if (args.trustScore >= 65 && args.trustConfidence >= 58) {
    return "TRUST_GOOD";
  }
  if (args.trustScore >= WEAK_TRUST_SCORE_THRESHOLD || args.trustConfidence >= WEAK_TRUST_CONFIDENCE_THRESHOLD) {
    return "TRUST_CAUTION";
  }
  if (args.trustScore >= 25) {
    return "TRUST_WEAK";
  }
  return "TRUST_UNKNOWN";
}

export function hasTrustEngineSignal(snapshot: TrustEngineSnapshot | null | undefined): boolean {
  return Boolean(snapshot && snapshot.trustScore >= 0);
}

export function isWeakTrustState(state: string): boolean {
  return state === "TRUST_WEAK" || state === "TRUST_UNKNOWN";
}

/** Build unified trust snapshot from full truth foundation stack. */
export function buildUnifiedTrustEngine(foundation: TrustEngineInput): TrustEngineSnapshot {
  const product = foundation.productIntelligence;
  const commerce = foundation.commerceIntelligence;
  const reasoning = foundation.commerceReasoning;
  const evidence = foundation.evidenceReasoningGraph;

  const pillarScores = {
    skuIdentity: clampScore(foundation.skuIdentityConfidence),
    availability: clampScore(product.availabilityConfidence),
    priceTruth: clampScore(foundation.priceTruthConfidence),
    discount: clampScore(product.discountConfidence),
    merchantReliability: clampScore(foundation.merchantReliability.merchantReliabilityScore),
    marketIntelligence: marketTrustScore(foundation),
    productIntelligence: clampScore(product.overallProductConfidence),
    commerceIntelligence: clampScore(commerce.commerceConfidence),
    commerceReasoning: clampScore(reasoning.reasoningConfidence),
    evidenceGraph: clampScore(evidence.evidenceStrength),
  };

  const trustScore = clampScore(
    pillarScores.skuIdentity * TRUST_WEIGHTS.skuIdentity +
      pillarScores.availability * TRUST_WEIGHTS.availability +
      pillarScores.priceTruth * TRUST_WEIGHTS.priceTruth +
      pillarScores.discount * TRUST_WEIGHTS.discount +
      pillarScores.merchantReliability * TRUST_WEIGHTS.merchantReliability +
      pillarScores.marketIntelligence * TRUST_WEIGHTS.marketIntelligence +
      pillarScores.productIntelligence * TRUST_WEIGHTS.productIntelligence +
      pillarScores.commerceIntelligence * TRUST_WEIGHTS.commerceIntelligence +
      pillarScores.commerceReasoning * TRUST_WEIGHTS.commerceReasoning +
      pillarScores.evidenceGraph * TRUST_WEIGHTS.evidenceGraph
  );

  const trustSignals = collectTrustSignals(foundation);
  const trustRisks = collectTrustRisks(foundation);

  const trustStrength = clampScore(
    Object.values(pillarScores).reduce((sum, score) => sum + score, 0) / Object.values(pillarScores).length
  );

  const trustConfidence = clampScore(
    trustScore * 0.45 +
      evidence.evidenceCompleteness * 0.25 +
      reasoning.reasoningConfidence * 0.2 +
      Math.min(18, trustSignals.length * 4) -
      Math.min(24, trustRisks.length * 5)
  );

  const trustState = deriveTrustState({
    canonicalSkuId: foundation.canonicalSkuId,
    trustScore,
    trustConfidence,
    trustRiskCount: trustRisks.length,
  });

  return {
    trustScore,
    trustConfidence,
    trustSignals,
    trustRisks,
    trustStrength,
    trustState,
  };
}
