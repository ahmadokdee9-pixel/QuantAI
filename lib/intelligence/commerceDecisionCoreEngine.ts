/**
 * Phase 42 — Commerce Decision Core Engine.
 * Executive rule: would QuantAI spend its own money?
 */

import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import { qualifyTierPriorityLabel, sanitizeUserFacingProse } from "@/lib/truth/truthLanguagePolicy";
import type { AlternativeDiscovery } from "@/lib/intelligence/alternativeDiscoveryEngine";
import type { CategoryIntelligenceCore } from "@/lib/intelligence/categoryIntelligenceCoreEngine";
import type { MarketDepthIntelligence } from "@/lib/intelligence/marketDepthEngine";
import type { RealDiscountProof } from "@/lib/intelligence/realDiscountProofEngine";
import type { RealMerchantVerification } from "@/lib/intelligence/realMerchantVerificationEngine";
import type { ValueIntelligenceCore } from "@/lib/intelligence/valueIntelligenceCoreEngine";

export type CommerceDecisionTier = "WAIT" | "COMPARE" | "BUY READY" | "STRONG BUY" | "BEST DEAL";

export type CommerceDecisionCore = {
  version: 1;
  tier: CommerceDecisionTier;
  verdict: PrimaryVerdict;
  decisionConfidence: number;
  compositeScore: number;
  valueScore: number;
  merchantTrustScore: number;
  discountAuthenticityScore: number;
  marketCoverageScore: number;
  alternativeAdvantageScore: number;
  categoryIntelligenceScore: number;
  executiveWouldBuy: boolean;
  reasoning: string;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/** Compute composite decision from all intelligence signals. */
export function computeCommerceDecisionCore(args: {
  value: ValueIntelligenceCore;
  merchant: RealMerchantVerification;
  discountProof: RealDiscountProof;
  marketDepth: MarketDepthIntelligence;
  categoryIntel: CategoryIntelligenceCore;
  alternatives: AlternativeDiscovery;
  link: string;
}): CommerceDecisionCore {
  const { value, merchant, discountProof, marketDepth, categoryIntel, alternatives, link } = args;

  const alternativeAdvantageScore = alternatives.promoteAlternative
    ? 35
    : alternatives.betterAlternativeExists
      ? 55
      : 78;

  const compositeScore = clamp(
    Math.round(
      value.valueScore * 0.28 +
        merchant.merchantTrustScore * 0.2 +
        discountProof.discountAuthenticityScore * 0.15 +
        marketDepth.marketCoverageScore * 0.1 +
        alternativeAdvantageScore * 0.12 +
        categoryIntel.categoryIntelligenceScore * 0.15
    ),
    0,
    100
  );

  const executiveWouldBuy =
    compositeScore >= 68 &&
    merchant.merchantTrustScore >= 70 &&
    value.valueScore >= 60 &&
    !discountProof.band.includes("Fake") &&
    merchant.band !== "Risky Merchant" &&
    !alternatives.promoteAlternative;

  let tier: CommerceDecisionTier = "COMPARE";
  if (!executiveWouldBuy && compositeScore < 50) tier = "WAIT";
  else if (executiveWouldBuy && compositeScore >= 88 && discountProof.band.includes("Exceptional")) tier = "BEST DEAL";
  else if (executiveWouldBuy && compositeScore >= 82) tier = "STRONG BUY";
  else if (executiveWouldBuy && compositeScore >= 72) tier = "BUY READY";
  else if (executiveWouldBuy) tier = "COMPARE";
  else tier = compositeScore < 55 ? "WAIT" : "COMPARE";

  const verdict: PrimaryVerdict = tier === "WAIT" ? "WAIT" : tier === "COMPARE" ? "COMPARE" : "BUY READY";

  let decisionConfidence = clamp(
    Math.round(
      compositeScore -
        marketDepth.confidencePenalty +
        (discountProof.verified ? 4 : 0) +
        (merchant.marketplaceVerified ? 3 : 0)
    ),
    45,
    98
  );

  // Differentiate confidence per link
  let hash = 0;
  for (let i = 0; i < link.length; i++) hash = (hash * 31 + link.charCodeAt(i)) >>> 0;
  decisionConfidence = clamp(decisionConfidence + (hash % 5) - 2, 45, 98);

  if (verdict === "BUY READY" && decisionConfidence < 70) decisionConfidence = 70;
  if (tier === "STRONG BUY" && decisionConfidence < 80) decisionConfidence = 80;
  if (tier === "BEST DEAL" && decisionConfidence < 85) decisionConfidence = 85;

  const reasoning = sanitizeUserFacingProse(
    executiveWouldBuy
      ? tier === "BEST DEAL"
        ? "Confidence-based recommendation — strongest price opportunity in this search sample with discount and seller trust signals."
        : tier === "STRONG BUY"
          ? "Confidence-based recommendation — strong value, seller trust signal, and favorable position in this search sample."
          : "Confidence-based recommendation — balanced evidence from this search sample supports checkout consideration."
      : tier === "WAIT"
        ? "Wait signal — market sample or trust/discount signals are unfavorable for immediate checkout."
        : "Compare signal — viable option but alternatives in this search sample deserve review."
  );

  return {
    version: 1,
    tier,
    verdict,
    decisionConfidence,
    compositeScore,
    valueScore: value.valueScore,
    merchantTrustScore: merchant.merchantTrustScore,
    discountAuthenticityScore: discountProof.discountAuthenticityScore,
    marketCoverageScore: marketDepth.marketCoverageScore,
    alternativeAdvantageScore,
    categoryIntelligenceScore: categoryIntel.categoryIntelligenceScore,
    executiveWouldBuy,
    reasoning,
  };
}

export function tierToPriorityLabel(tier: CommerceDecisionTier): string {
  return qualifyTierPriorityLabel(tier);
}
