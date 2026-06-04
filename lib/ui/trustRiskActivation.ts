/**
 * Phase 22.0 — Trust & Risk Intelligence Activation Layer.
 * Evaluates purchasing risk from existing tray signals only (presentation).
 */

import type { ProductTrustDiscountAssessment } from "@/lib/intelligence/phase93TrustDiscountHardening";
import type { ActivatedAlternativeAdvantage } from "@/lib/ui/alternativeAdvantageActivation";
import type { ActivatedBuyWait } from "@/lib/ui/buyWaitActivation";
import type { ActivatedCommerceCoverage } from "@/lib/ui/commerceCoverageActivation";
import type { ActivatedCategoryIntelligence } from "@/lib/ui/categoryIntelligenceActivation";
import type { ActivatedDiscountTruth } from "@/lib/ui/discountTruthActivation";
import type { ActivatedPriceTarget } from "@/lib/ui/priceTargetActivation";
import { getStoreTrustScore, ratingValue, type QuantProduct } from "@/lib/shoppingScore";

export type TrustRiskFactors = {
  sellerTrust: number;
  marketplaceTrust: number;
  listingQuality: number;
  pricingAnomalyRisk: number;
  discountManipulationRisk: number;
  insufficientInformationRisk: number;
  suspiciousOfferRisk: number;
};

export type ActivatedTrustRisk = {
  trustScore: number;
  riskScore: number;
  trustReason: string;
  riskReason: string;
  factors: TrustRiskFactors;
  cardLine: string;
  expandedLines: string[];
};

export type TrustRiskInput = {
  product: QuantProduct;
  list: QuantProduct[];
  phase93Assessment?: ProductTrustDiscountAssessment | null;
  commerceCoverage?: ActivatedCommerceCoverage | null;
  discountTruth: ActivatedDiscountTruth;
  categoryIntelligence: ActivatedCategoryIntelligence;
  buyWait: ActivatedBuyWait;
  priceTarget: ActivatedPriceTarget;
  alternativeAdvantage: ActivatedAlternativeAdvantage;
  rankingRationaleLine?: string;
};

function clipLine(text: string | undefined | null, max = 112): string {
  if (text == null) return "";
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function medianPeerPrice(product: QuantProduct, list: QuantProduct[]): number {
  const prices = list
    .filter((item) => item.link !== product.link && item.price > 0)
    .map((item) => item.price)
    .sort((a, b) => a - b);
  if (!prices.length) return 0;
  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 ? prices[mid]! : (prices[mid - 1]! + prices[mid]!) / 2;
}

function evaluateSellerTrust(
  product: QuantProduct,
  assessment: ProductTrustDiscountAssessment | null | undefined
): number {
  let score = getStoreTrustScore(product.store);
  if (assessment?.trustScore != null && assessment.trustScore > 0) {
    score = Math.round((score + assessment.trustScore) / 2);
  }
  if (assessment?.suspiciousSeller) score = Math.min(score, 42);
  if (product.qiRealityTrust?.weakRetailer) score = Math.min(score, 48);
  return clampScore(score);
}

function evaluateMarketplaceTrust(
  product: QuantProduct,
  commerceCoverage: ActivatedCommerceCoverage | null | undefined
): number {
  if (commerceCoverage?.offers?.length) {
    const trusts = commerceCoverage.offers.map((offer) => offer.trustScore).filter((value) => value > 0);
    if (trusts.length) {
      const avg = trusts.reduce((sum, value) => sum + value, 0) / trusts.length;
      const spreadBonus =
        commerceCoverage.merchantCount > 1 && commerceCoverage.viewAllOffersEnabled ? 6 : 0;
      return clampScore(avg + spreadBonus);
    }
  }
  return evaluateSellerTrust(product, null);
}

function evaluateListingQuality(
  product: QuantProduct,
  categoryIntelligence: ActivatedCategoryIntelligence
): number {
  let score = 50;
  const rating = ratingValue(product.rating);
  const reviews = product.reviewsCount ?? 0;
  if (rating >= 4.5) score += 12;
  else if (rating >= 4.0) score += 6;
  else if (rating > 0 && rating < 3.5) score -= 10;
  if (reviews >= 200) score += 10;
  else if (reviews >= 50) score += 4;
  else if (reviews === 0) score -= 8;
  if (product.title.trim().length >= 24) score += 4;
  if (product.qiListingIdentity?.listingRisk01 != null) {
    score += Math.round((1 - product.qiListingIdentity.listingRisk01) * 18);
  }
  if (categoryIntelligence.categoryScore >= 60) score += 6;
  return clampScore(score);
}

function evaluatePricingAnomalyRisk(
  product: QuantProduct,
  list: QuantProduct[],
  assessment: ProductTrustDiscountAssessment | null | undefined,
  priceTarget: ActivatedPriceTarget
): number {
  let risk = 18;
  if (assessment?.priceAnomaly === "suspicious_low") risk += 38;
  if (assessment?.priceAnomaly === "premium_outlier") risk += 22;
  if (product.qiCommerce?.priceAnomaly === "suspicious_low") risk += 28;

  const peerMed = medianPeerPrice(product, list);
  if (peerMed > 0 && product.price > 0) {
    const gap = (peerMed - product.price) / peerMed;
    if (gap >= 0.28) risk += 24;
    else if (gap >= 0.18) risk += 14;
  }

  if (priceTarget.distanceFromLowPct != null && priceTarget.distanceFromLowPct <= 0) {
    risk = Math.max(8, risk - 8);
  }
  return clampScore(risk);
}

function evaluateDiscountManipulationRisk(discountTruth: ActivatedDiscountTruth): number {
  if (discountTruth.verdict === "Inflated") return 88;
  if (discountTruth.verdict === "Likely Inflated") return 68;
  if (discountTruth.verdict === "Uncertain") return 46;
  if (discountTruth.metrics.priceIncreaseBeforePromotion) return 82;
  if (discountTruth.verdict === "Likely Genuine") return 22;
  return 14;
}

function evaluateInsufficientInformationRisk(
  product: QuantProduct,
  categoryIntelligence: ActivatedCategoryIntelligence
): number {
  let risk = 12;
  if (!product.oldPrice && discountTruthHasDiscount(product)) risk += 10;
  if ((product.reviewsCount ?? 0) === 0) risk += 16;
  if (!product.availability?.trim()) risk += 8;
  if (!product.shipping?.trim()) risk += 6;
  if (!categoryIntelligence.segment) risk += 10;
  if (product.title.trim().length < 16) risk += 12;
  return clampScore(risk);
}

function discountTruthHasDiscount(product: QuantProduct): boolean {
  return product.oldPrice != null && product.oldPrice > product.price && product.price > 0;
}

function evaluateSuspiciousOfferRisk(args: {
  sellerTrust: number;
  discountManipulationRisk: number;
  pricingAnomalyRisk: number;
  insufficientInformationRisk: number;
  buyWait: ActivatedBuyWait;
  discountTruth: ActivatedDiscountTruth;
}): number {
  let risk = 16;
  if (args.sellerTrust < 52) risk += 28;
  if (args.discountManipulationRisk >= 65) risk += 22;
  if (args.pricingAnomalyRisk >= 55) risk += 18;
  if (args.insufficientInformationRisk >= 45) risk += 12;
  if (args.buyWait.verdict === "WAIT" && args.discountTruth.verdict !== "Genuine") risk += 10;
  return clampScore(risk);
}

function resolveTrustReason(factors: TrustRiskFactors, trustScore: number): string {
  if (trustScore >= 78) {
    if (factors.marketplaceTrust >= 75 && factors.sellerTrust >= 75) {
      return "Seller and marketplace trust look reliable for checkout.";
    }
    return "Seller trust profile looks reliable for this listing.";
  }
  if (trustScore >= 62) {
    return "Trust posture is acceptable, but verify seller details before buying.";
  }
  if (factors.listingQuality >= 68) {
    return "Listing quality is acceptable even though trust signals are mixed.";
  }
  return "Trust signals are limited — proceed with extra verification.";
}

function resolveRiskReason(factors: TrustRiskFactors, riskScore: number): string {
  if (factors.discountManipulationRisk >= 70) {
    return "Discount manipulation risk needs verification before acting on this markdown.";
  }
  if (factors.pricingAnomalyRisk >= 60) {
    return "Pricing anomaly risk detected versus comparable tray listings.";
  }
  if (factors.suspiciousOfferRisk >= 65) {
    return "Suspicious offer risk — double-check seller and listing details.";
  }
  if (factors.insufficientInformationRisk >= 55) {
    return "Insufficient listing information increases checkout uncertainty.";
  }
  if (factors.sellerTrust < 52) {
    return "Seller trust is below the usual checkout threshold.";
  }
  if (riskScore >= 55) {
    return "Combined trust and pricing signals suggest elevated purchase risk.";
  }
  return "No major trust or pricing red flags detected in current tray signals.";
}

/** Activate trust and risk intelligence for one listing (existing signals only). */
export function activateTrustRisk(input: TrustRiskInput): ActivatedTrustRisk {
  const sellerTrust = evaluateSellerTrust(input.product, input.phase93Assessment);
  const marketplaceTrust = evaluateMarketplaceTrust(input.product, input.commerceCoverage);
  const listingQuality = evaluateListingQuality(input.product, input.categoryIntelligence);
  const pricingAnomalyRisk = evaluatePricingAnomalyRisk(
    input.product,
    input.list,
    input.phase93Assessment,
    input.priceTarget
  );
  const discountManipulationRisk = evaluateDiscountManipulationRisk(input.discountTruth);
  const insufficientInformationRisk = evaluateInsufficientInformationRisk(
    input.product,
    input.categoryIntelligence
  );
  const suspiciousOfferRisk = evaluateSuspiciousOfferRisk({
    sellerTrust,
    discountManipulationRisk,
    pricingAnomalyRisk,
    insufficientInformationRisk,
    buyWait: input.buyWait,
    discountTruth: input.discountTruth,
  });

  const factors: TrustRiskFactors = {
    sellerTrust,
    marketplaceTrust,
    listingQuality,
    pricingAnomalyRisk,
    discountManipulationRisk,
    insufficientInformationRisk,
    suspiciousOfferRisk,
  };

  const trustScore = clampScore(
    sellerTrust * 0.34 +
      marketplaceTrust * 0.22 +
      listingQuality * 0.24 +
      input.discountTruth.confidence * 0.1 +
      (input.rankingRationaleLine ? 6 : 0) +
      (input.alternativeAdvantage.leadAdvantageScore > 0 ? 4 : 0)
  );

  const riskScore = clampScore(
    pricingAnomalyRisk * 0.24 +
      discountManipulationRisk * 0.24 +
      insufficientInformationRisk * 0.16 +
      suspiciousOfferRisk * 0.22 +
      Math.max(0, 100 - sellerTrust) * 0.14
  );

  const trustReason = clipLine(resolveTrustReason(factors, trustScore));
  const riskReason = clipLine(resolveRiskReason(factors, riskScore));
  const cardLine = clipLine(
    riskScore >= 55
      ? `Risk ${riskScore}/100 — ${riskReason}`
      : `Trust ${trustScore}/100 — ${trustReason}`
  );

  const expandedLines =
    riskScore >= 52
      ? uniqueBriefLines([riskReason, trustReason, cardLine])
      : uniqueBriefLines([trustReason, riskReason]);

  return {
    trustScore,
    riskScore,
    trustReason,
    riskReason,
    factors,
    cardLine,
    expandedLines,
  };
}

function uniqueBriefLines(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const line = value.trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out.slice(0, 3);
}

export function mergeTrustRiskExpandedSignals(
  existingLines: string[],
  trustRisk: ActivatedTrustRisk | null,
  max = 3
): string[] {
  if (!trustRisk?.expandedLines.length) return existingLines.slice(0, max);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of [...trustRisk.expandedLines, ...existingLines]) {
    const line = value.trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out.slice(0, max);
}

export function mergeTrustRiskExpandedLines(
  existingLines: string[],
  trustRisk: ActivatedTrustRisk | null,
  max = 3
): string[] {
  return mergeTrustRiskExpandedSignals(existingLines, trustRisk, max);
}

export function mergeTrustRiskBriefSignals(
  existingLines: string[],
  trustRisk: ActivatedTrustRisk | null,
  max = 3
): string[] {
  return mergeTrustRiskExpandedSignals(existingLines, trustRisk, max);
}

export function mergeTrustRiskChip(
  chips: Array<{ label: string; tone: "emerald" | "blue" | "violet" | "amber" | "slate" }>,
  trustRisk: ActivatedTrustRisk | null,
  max = 3
): Array<{ label: string; tone: "emerald" | "blue" | "violet" | "amber" | "slate" }> {
  if (!trustRisk) return chips.slice(0, max);
  const tone: "emerald" | "blue" | "violet" | "amber" | "slate" =
    trustRisk.riskScore >= 62
      ? "amber"
      : trustRisk.trustScore >= 68
        ? "emerald"
        : "slate";
  const chip = {
    label: clipLine(
      trustRisk.riskScore >= 55
        ? `Risk ${trustRisk.riskScore}%`
        : `Trust ${trustRisk.trustScore}%`,
      42
    ),
    tone,
  };
  const merged = [chip, ...chips.filter((item) => item.label !== chip.label)];
  return merged.slice(0, max);
}
