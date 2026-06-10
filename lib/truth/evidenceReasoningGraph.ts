/**
 * Phase 1L — Evidence reasoning graph.
 * Connects intelligence pillars to supporting and conflicting evidence chains.
 */

import { isConsensusConflict } from "@/lib/truth/availabilityConsensusModel";
import {
  isStaleAvailabilityState,
  isUnavailableAvailabilityState,
  isUnknownAvailabilityState,
} from "@/lib/truth/availabilityStateModel";
import { THIN_MARKET_DEPTH_THRESHOLD } from "@/lib/truth/marketTruthRollup";
import {
  HIGH_VOLATILITY_THRESHOLD,
  UNRELIABLE_MERCHANT_THRESHOLD,
} from "@/lib/truth/merchantReliabilityTruth";
import type { TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";

export type EvidenceState =
  | "EVIDENCE_STRONG"
  | "EVIDENCE_GOOD"
  | "EVIDENCE_PARTIAL"
  | "EVIDENCE_WEAK"
  | "EVIDENCE_UNKNOWN";

export type EvidenceReasoningGraph = {
  evidenceChain: string[];
  supportingEvidence: string[];
  conflictingEvidence: string[];
  evidenceStrength: number;
  evidenceCompleteness: number;
  evidenceState: EvidenceState;
};

export type EvidenceReasoningGraphInput = Omit<TruthFoundationSnapshot, "evidenceReasoningGraph" | "trustEngine" | "decisionEngine" | "intentEngine" | "intentRetrieval" | "productMatch" | "productReasoning" | "recommendationIntelligence" | "explainableAI" | "conversationalIntent">;

export const WEAK_EVIDENCE_STRENGTH_THRESHOLD = 52;
export const WEAK_EVIDENCE_COMPLETENESS_THRESHOLD = 45;
export const CONFLICTING_EVIDENCE_GATE_THRESHOLD = 2;

const PILLAR_ORDER = [
  "sku_identity",
  "availability",
  "price_truth",
  "discount_verification",
  "merchant_reliability",
  "market_intelligence",
  "product_intelligence",
  "commerce_intelligence",
  "commerce_reasoning",
] as const;

type PillarKey = (typeof PILLAR_ORDER)[number];

type PillarEvaluation = {
  key: PillarKey;
  strength: number;
  complete: boolean;
  supporting: string | null;
  conflicting: string | null;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function evaluateSkuIdentity(foundation: EvidenceReasoningGraphInput): PillarEvaluation {
  const strength = clampScore(foundation.skuIdentityConfidence);
  const complete = Boolean(foundation.canonicalSkuId);
  return {
    key: "sku_identity",
    strength,
    complete,
    supporting: strength >= 70 ? `SKU identity confidence ${strength}` : null,
    conflicting: strength < 55 ? "Weak SKU identity evidence" : null,
  };
}

function evaluateAvailability(foundation: EvidenceReasoningGraphInput): PillarEvaluation {
  const strength = clampScore(foundation.productIntelligence.availabilityConfidence);
  const complete = foundation.availability.observedAt != null || foundation.availabilityState !== "UNKNOWN";
  let conflicting: string | null = null;
  if (isUnavailableAvailabilityState(foundation.availabilityState)) {
    conflicting = "Availability evidence shows listing unavailable";
  } else if (isStaleAvailabilityState(foundation.availabilityState)) {
    conflicting = "Availability evidence is stale";
  } else if (isUnknownAvailabilityState(foundation.availabilityState)) {
    conflicting = "Availability evidence incomplete";
  }
  return {
    key: "availability",
    strength,
    complete,
    supporting:
      foundation.availabilityState === "AVAILABLE" && foundation.availability.freshnessScore >= 80
        ? `Fresh availability observation (${foundation.availability.availabilityStatus})`
        : null,
    conflicting,
  };
}

function evaluatePriceTruth(foundation: EvidenceReasoningGraphInput): PillarEvaluation {
  const strength = clampScore(foundation.priceTruthConfidence);
  const samples = foundation.baselineCoverage?.samples90d ?? 0;
  const complete = samples >= 1 || foundation.priceTruth != null;
  return {
    key: "price_truth",
    strength,
    complete,
    supporting: strength >= 65 ? `Price truth confidence ${strength} (${samples} samples)` : null,
    conflicting:
      strength < 45
        ? "Insufficient price history evidence"
        : foundation.listingPriceOutlier
          ? "Listing price diverges from market reference"
          : null,
  };
}

function evaluateDiscount(foundation: EvidenceReasoningGraphInput): PillarEvaluation {
  const strength = clampScore(foundation.productIntelligence.discountConfidence);
  const state = foundation.discountEvidence?.state ?? null;
  const complete = state != null || foundation.priceTruth != null;
  return {
    key: "discount_verification",
    strength,
    complete,
    supporting: state === "VERIFIED_DISCOUNT" ? "Verified discount against price history" : null,
    conflicting: foundation.priceTruth?.fakeDiscount.isFake ? "Fake discount conflicts with price truth" : null,
  };
}

function evaluateMerchantReliability(foundation: EvidenceReasoningGraphInput): PillarEvaluation {
  const strength = clampScore(foundation.merchantReliability.merchantReliabilityScore);
  const complete = foundation.merchantObservationCount >= 1;
  return {
    key: "merchant_reliability",
    strength,
    complete,
    supporting:
      foundation.merchantReliability.merchantState === "RELIABLE"
        ? `Reliable merchant profile (${strength})`
        : null,
    conflicting:
      foundation.merchantObservationCount >= 2 &&
      (strength < UNRELIABLE_MERCHANT_THRESHOLD ||
        foundation.merchantReliability.merchantVolatilityScore >= HIGH_VOLATILITY_THRESHOLD)
        ? `Merchant reliability concern (${foundation.merchantReliability.merchantState})`
        : null,
  };
}

function evaluateMarketIntelligence(foundation: EvidenceReasoningGraphInput): PillarEvaluation {
  const market = foundation.marketIntelligence;
  const strength = clampScore(
    (market.marketCoverage + market.marketAgreementScore + market.marketPriceConfidence) / 3
  );
  const complete = foundation.merchantCount >= 1 || market.marketDepth > 0;
  return {
    key: "market_intelligence",
    strength,
    complete,
    supporting:
      market.marketDepth >= THIN_MARKET_DEPTH_THRESHOLD
        ? `Market depth ${market.marketDepth} across ${foundation.merchantCount} merchants`
        : null,
    conflicting:
      isConsensusConflict(foundation.availabilityConsensus)
        ? "Market availability consensus conflict"
        : market.marketDepth < THIN_MARKET_DEPTH_THRESHOLD
          ? "Thin cross-merchant market evidence"
          : null,
  };
}

function evaluateProductIntelligence(foundation: EvidenceReasoningGraphInput): PillarEvaluation {
  const strength = clampScore(foundation.productIntelligence.overallProductConfidence);
  const complete = Boolean(foundation.canonicalSkuId);
  return {
    key: "product_intelligence",
    strength,
    complete,
    supporting:
      foundation.productIntelligence.intelligenceState === "PRODUCT_CONFIDENT"
        ? `Product intelligence ${foundation.productIntelligence.intelligenceState}`
        : null,
    conflicting: strength < 52 ? "Weak unified product intelligence evidence" : null,
  };
}

function evaluateCommerceIntelligence(foundation: EvidenceReasoningGraphInput): PillarEvaluation {
  const strength = clampScore(foundation.commerceIntelligence.commerceConfidence);
  const complete = Boolean(foundation.canonicalSkuId);
  return {
    key: "commerce_intelligence",
    strength,
    complete,
    supporting:
      foundation.commerceIntelligence.commerceState === "COMMERCE_STRONG" ||
      foundation.commerceIntelligence.commerceState === "COMMERCE_GOOD"
        ? `Commerce intelligence ${foundation.commerceIntelligence.commerceState}`
        : null,
    conflicting: strength < 52 ? "Weak commerce intelligence fusion" : null,
  };
}

function evaluateCommerceReasoning(foundation: EvidenceReasoningGraphInput): PillarEvaluation {
  const reasoning = foundation.commerceReasoning;
  const strength = clampScore(reasoning.reasoningConfidence);
  const complete = reasoning.primaryRisk !== "none" || reasoning.strongestPositiveSignal.length > 0;
  return {
    key: "commerce_reasoning",
    strength,
    complete,
    supporting: reasoning.strongestPositiveSignal !== "Limited positive confirmation" ? reasoning.strongestPositiveSignal : null,
    conflicting:
      reasoning.primaryRisk !== "none" ? reasoning.strongestNegativeSignal : null,
  };
}

function deriveEvidenceState(args: {
  canonicalSkuId: string | null;
  evidenceStrength: number;
  evidenceCompleteness: number;
  conflictingCount: number;
}): EvidenceState {
  if (!args.canonicalSkuId || args.evidenceCompleteness < 25) {
    return "EVIDENCE_UNKNOWN";
  }
  if (args.evidenceStrength >= 78 && args.evidenceCompleteness >= 75 && args.conflictingCount === 0) {
    return "EVIDENCE_STRONG";
  }
  if (args.evidenceStrength >= 65 && args.evidenceCompleteness >= 55) {
    return "EVIDENCE_GOOD";
  }
  if (args.evidenceStrength >= WEAK_EVIDENCE_STRENGTH_THRESHOLD || args.evidenceCompleteness >= WEAK_EVIDENCE_COMPLETENESS_THRESHOLD) {
    return "EVIDENCE_PARTIAL";
  }
  if (args.evidenceStrength >= 25) {
    return "EVIDENCE_WEAK";
  }
  return "EVIDENCE_UNKNOWN";
}

export function hasEvidenceReasoningGraphSignal(graph: EvidenceReasoningGraph | null | undefined): boolean {
  return Boolean(graph && graph.evidenceChain.length > 0);
}

/** Build evidence reasoning graph linking all intelligence pillars. */
export function buildEvidenceReasoningGraph(foundation: EvidenceReasoningGraphInput): EvidenceReasoningGraph {
  const pillars = [
    evaluateSkuIdentity(foundation),
    evaluateAvailability(foundation),
    evaluatePriceTruth(foundation),
    evaluateDiscount(foundation),
    evaluateMerchantReliability(foundation),
    evaluateMarketIntelligence(foundation),
    evaluateProductIntelligence(foundation),
    evaluateCommerceIntelligence(foundation),
    evaluateCommerceReasoning(foundation),
  ];

  const evidenceChain = pillars.map((pillar) => pillar.key);
  const supportingEvidence = pillars.map((pillar) => pillar.supporting).filter((value): value is string => value != null);
  const conflictingEvidence = pillars.map((pillar) => pillar.conflicting).filter((value): value is string => value != null);

  const completeCount = pillars.filter((pillar) => pillar.complete).length;
  const evidenceCompleteness = clampScore((completeCount / PILLAR_ORDER.length) * 100);
  const evidenceStrength = clampScore(
    pillars.reduce((sum, pillar) => sum + pillar.strength, 0) / pillars.length
  );

  const evidenceState = deriveEvidenceState({
    canonicalSkuId: foundation.canonicalSkuId,
    evidenceStrength,
    evidenceCompleteness,
    conflictingCount: conflictingEvidence.length,
  });

  return {
    evidenceChain,
    supportingEvidence,
    conflictingEvidence,
    evidenceStrength,
    evidenceCompleteness,
    evidenceState,
  };
}
