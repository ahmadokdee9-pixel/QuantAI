/**
 * Phase 10.8 — Retailer Intelligence Engine.
 * Evaluates retailer quality and trustworthiness from existing tray/meta signals only.
 * Read-only meta layer — no tray reorder, verdict, or ranking mutations.
 */

import type { AlternativeIntelligenceMeta } from "@/lib/intelligence/alternativeIntelligenceEngine";
import type { CompetitiveIntelligenceMeta } from "@/lib/intelligence/competitiveIntelligenceEngine";
import type { ConfidenceIntelligenceMeta } from "@/lib/intelligence/confidenceEngine";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { ExplainabilityMeta } from "@/lib/intelligence/explainabilityEngine";
import type { IntentAlignmentMeta } from "@/lib/intelligence/intentAlignmentEngine";
import type { MarketContextMeta } from "@/lib/intelligence/marketContextEngine";
import type { PersonalizationMeta } from "@/lib/intelligence/personalizationEngine";
import type {
  Phase93TrustDiscountMeta,
  ProductTrustDiscountAssessment,
} from "@/lib/intelligence/phase93TrustDiscountHardening";
import type { VerdictIntelligenceMeta } from "@/lib/intelligence/verdictEngine";
import { getMarketplaceSellerRiskTier, getStoreTrustScore, getTrustTierLabel } from "@/lib/retailTrust";
import type { Phase92TrayIntegrityMeta } from "@/lib/search/phase92TrayIntegrity";
import type { SparseResultAssessment } from "@/lib/search/sparseResultIntelligence";
import type { QuantProduct } from "@/lib/shoppingScore";
import { ratingValue } from "@/lib/shoppingScore";

export type RetailerTier = "ELITE" | "TRUSTED" | "ACCEPTABLE" | "CAUTION" | "RISKY";

export type RetailerIntelligenceMeta = {
  version: "phase10.8-v1";
  retailerScore: number;
  retailerTier: RetailerTier;
  retailerConfidence: number;
  retailerAdvantages: string[];
  retailerWarnings: string[];
  primaryRetailerReason: string;
  sellerRisk: number;
  marketplaceRisk: number;
};

export type RetailerIntelligenceInput = {
  products: QuantProduct[];
  decisionBrief: DecisionBriefDTO | null;
  phase92: Phase92TrayIntegrityMeta;
  phase93: Phase93TrustDiscountMeta;
  sparse?: SparseResultAssessment;
  verdictIntelligence: VerdictIntelligenceMeta;
  explainability: ExplainabilityMeta;
  alternativeIntelligence: AlternativeIntelligenceMeta;
  marketContext: MarketContextMeta;
  competitiveIntelligence: CompetitiveIntelligenceMeta;
  confidenceIntelligence: ConfidenceIntelligenceMeta;
  intentAlignment: IntentAlignmentMeta;
  personalization: PersonalizationMeta;
};

const VERSION = "phase10.8-v1" as const;

const AGGREGATOR_RX =
  /\b(fruugo|ubuy|wish|temu|aliexpress|dhgate|banggood|alibaba|joom|lightinthebox)\b/i;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function tierFor(score: number): RetailerTier {
  if (score >= 90) return "ELITE";
  if (score >= 75) return "TRUSTED";
  if (score >= 60) return "ACCEPTABLE";
  if (score >= 40) return "CAUTION";
  return "RISKY";
}

function pickAssessment(
  input: RetailerIntelligenceInput
): ProductTrustDiscountAssessment | null {
  const link =
    input.competitiveIntelligence.primaryProduct.link ||
    input.decisionBrief?.recommendation.link;
  if (!link) return input.phase93.trayAssessments[0] ?? null;
  return input.phase93.trayAssessments.find((a) => a.link === link) ?? input.phase93.trayAssessments[0] ?? null;
}

function pickProduct(input: RetailerIntelligenceInput): QuantProduct | null {
  const link =
    input.competitiveIntelligence.primaryProduct.link ||
    input.decisionBrief?.recommendation.link;
  if (!link) return input.products[0] ?? null;
  return input.products.find((p) => p.link === link) ?? input.products[0] ?? null;
}

function primaryStore(input: RetailerIntelligenceInput): string {
  return (
    input.competitiveIntelligence.primaryProduct.store ||
    input.decisionBrief?.recommendation.store ||
    pickProduct(input)?.store ||
    ""
  );
}

function primaryTitle(input: RetailerIntelligenceInput): string {
  return (
    input.competitiveIntelligence.primaryProduct.title ||
    input.decisionBrief?.recommendation.title ||
    pickProduct(input)?.title ||
    ""
  );
}

function isSparseTray(input: RetailerIntelligenceInput): boolean {
  return Boolean(input.sparse?.sparse ?? input.decisionBrief?.sparseTrayWarning ?? input.products.length <= 1);
}

function marketplaceRiskScore(store: string, title: string): number {
  const tier = getMarketplaceSellerRiskTier(store, title);
  if (AGGREGATOR_RX.test(store)) return 82;
  if (tier === "high") return 78;
  if (tier === "medium") return 48;
  return 18;
}

function sellerRiskScore(
  assessment: ProductTrustDiscountAssessment | null,
  store: string
): number {
  let risk = 22;
  if (!assessment) return AGGREGATOR_RX.test(store) ? 72 : 40;

  if (assessment.suspiciousSeller) risk += 34;
  if (assessment.fakeDiscountRisk === "high") risk += 22;
  else if (assessment.fakeDiscountRisk === "medium") risk += 10;
  if (assessment.priceAnomaly === "suspicious_low") risk += 16;
  if (assessment.trustScore < 55) risk += 18;
  else if (assessment.trustScore < 68) risk += 8;
  if (assessment.retailerConfidence < 55) risk += 12;

  for (const _ of assessment.suspiciousSellerReasons) {
    risk += 4;
  }

  if (AGGREGATOR_RX.test(store)) risk += 20;

  return clamp(Math.round(risk), 0, 100);
}

function computeRetailerTrust(store: string, assessment: ProductTrustDiscountAssessment | null): number {
  const base = getStoreTrustScore(store);
  const assessed = assessment?.trustScore ?? base;
  return clamp(Math.round(base * 0.45 + assessed * 0.55), 0, 100);
}

function computeRetailerReputation(
  product: QuantProduct | null,
  explainability: ExplainabilityMeta
): number {
  let score = Math.round(explainability.recommendationBasis.trust * 0.55 + explainability.recommendationBasis.retailer * 0.45);
  if (product) {
    const rating = ratingValue(product.rating ?? 0);
    const reviews = product.reviewsCount ?? 0;
    if (rating >= 4.2 && reviews >= 50) score += 10;
    else if (rating >= 3.8 && reviews >= 15) score += 4;
    else if (reviews < 5) score -= 8;
  }
  return clamp(score, 0, 100);
}

function computeRetailerConsistency(input: RetailerIntelligenceInput, assessment: ProductTrustDiscountAssessment | null): number {
  const avgTrust = input.phase93.averageTrustScore;
  const avgRetailer = input.phase93.averageRetailerConfidence;
  const pickTrust = assessment?.trustScore ?? getStoreTrustScore(primaryStore(input));

  let score = Math.round(pickTrust * 0.45 + avgTrust * 0.25 + avgRetailer * 0.3);

  if (input.phase92.compareIntegrity.queryMode === "normal") score += 4;
  if (input.phase92.top3Diversity.applied) score += 4;
  if (input.phase93.suspiciousSellerCount === 0) score += 4;
  if (input.phase93.suspiciousSellerCount >= 2) score -= 6;

  return clamp(score, 0, 100);
}

function computeDeliveryConfidence(product: QuantProduct | null, store: string): number {
  let score = getStoreTrustScore(store) >= 82 ? 78 : getStoreTrustScore(store) >= 68 ? 68 : 52;
  if (!product) return score;

  const avail = (product.availability ?? "").toLowerCase();
  if (/in\s*stock|available|op\s+voorraad|auf\s+lager/i.test(avail)) score += 10;
  if (/out\s*of\s*stock|unavailable|sold\s*out/i.test(avail)) score -= 22;
  if (product.shipping != null && String(product.shipping).trim().length > 0) score += 4;

  return clamp(score, 0, 100);
}

function computeReturnPolicyConfidence(store: string, marketplaceRisk: number): number {
  const label = getTrustTierLabel(store);
  let score =
    label === "elite" ? 86 : label === "strong" ? 78 : label === "standard" ? 62 : 44;
  if (marketplaceRisk >= 70) score -= 18;
  else if (marketplaceRisk >= 45) score -= 10;
  if (AGGREGATOR_RX.test(store)) score -= 16;
  return clamp(score, 0, 100);
}

function computeRetailerConfidenceDimension(
  assessment: ProductTrustDiscountAssessment | null,
  input: RetailerIntelligenceInput
): number {
  let score = assessment?.retailerConfidence ?? Math.round(input.confidenceIntelligence.trustQuality * 0.85);
  score = Math.round(score * 0.6 + input.explainability.recommendationBasis.retailer * 0.4);
  if (input.phase93.verdictConfidence.trustFloorOk) score += 4;
  if (input.phase93.verdictConfidence.suspiciousSellerBlocked) score += 3;
  return clamp(score, 0, 100);
}

function computeRetailerScore(args: {
  retailerTrust: number;
  retailerReputation: number;
  retailerConsistency: number;
  deliveryConfidence: number;
  returnPolicyConfidence: number;
  marketplaceRisk: number;
  sellerRisk: number;
  retailerConfidence: number;
  sparseTray: boolean;
}): number {
  let score = Math.round(
    args.retailerTrust * 0.22 +
      args.retailerReputation * 0.12 +
      args.retailerConsistency * 0.1 +
      args.deliveryConfidence * 0.1 +
      args.returnPolicyConfidence * 0.1 +
      (100 - args.marketplaceRisk) * 0.14 +
      (100 - args.sellerRisk) * 0.14 +
      args.retailerConfidence * 0.08
  );

  if (args.sparseTray) score = Math.min(score, 72);

  return clamp(score, 0, 100);
}

function buildAdvantages(
  store: string,
  assessment: ProductTrustDiscountAssessment | null,
  dims: {
    retailerTrust: number;
    deliveryConfidence: number;
    returnPolicyConfidence: number;
    marketplaceRisk: number;
    sellerRisk: number;
  }
): string[] {
  const out: string[] = [];
  const label = getTrustTierLabel(store);

  if (label === "elite" || label === "strong") out.push(`${store} is a recognized trusted retailer in this region`);
  if (dims.retailerTrust >= 80) out.push("High retailer trust score on the primary listing");
  if (assessment && assessment.retailerConfidence >= 72) {
    out.push(`Strong retailer confidence (${assessment.retailerConfidence}) from tray assessment`);
  }
  if (dims.deliveryConfidence >= 72) out.push("Availability and delivery signals look reliable");
  if (dims.returnPolicyConfidence >= 72) out.push("Return-policy confidence is favorable for checkout");
  if (dims.marketplaceRisk <= 25 && dims.sellerRisk <= 35) {
    out.push("Low marketplace and seller risk profile");
  }
  if (assessment && !assessment.suspiciousSeller && assessment.fakeDiscountRisk === "low") {
    out.push("No suspicious seller or discount flags on this retailer");
  }

  return [...new Set(out)].slice(0, 6);
}

function buildWarnings(
  store: string,
  assessment: ProductTrustDiscountAssessment | null,
  dims: { marketplaceRisk: number; sellerRisk: number },
  sparseTray: boolean
): string[] {
  const out: string[] = [];

  if (sparseTray) out.push("Sparse tray — retailer assessment is based on limited comparative evidence");
  if (AGGREGATOR_RX.test(store)) out.push("Aggregator marketplace seller — verify warranty and returns before purchase");
  if (dims.marketplaceRisk >= 70) out.push("Elevated marketplace variance risk on this retailer");
  if (dims.sellerRisk >= 65) out.push("Seller risk signals require extra verification");
  if (assessment?.suspiciousSeller) out.push("Suspicious seller flags detected in trust assessment");
  if (assessment?.fakeDiscountRisk === "high") out.push("Discount authenticity concerns on this retailer listing");
  if (assessment?.priceAnomaly === "suspicious_low") out.push("Price sits unusually low versus tray peers");
  for (const r of assessment?.suspiciousSellerReasons ?? []) {
    if (out.length >= 5) break;
    if (!out.includes(r)) out.push(r);
  }

  return [...new Set(out)].slice(0, 5);
}

function buildPrimaryRetailerReason(
  tier: RetailerTier,
  store: string,
  score: number,
  marketplaceRisk: number,
  sellerRisk: number
): string {
  if (tier === "ELITE" || tier === "TRUSTED") {
    return `${store} scores ${score}/100 with low seller risk (${sellerRisk}/100) and acceptable marketplace risk (${marketplaceRisk}/100).`;
  }
  if (tier === "ACCEPTABLE") {
    return `${store} is acceptable for checkout (${score}/100) but review marketplace and seller risk before purchasing.`;
  }
  return `${store} carries elevated retailer risk (${score}/100) — marketplace risk ${marketplaceRisk}/100 and seller risk ${sellerRisk}/100 warrant caution.`;
}

function buildRetailerSummary(tier: RetailerTier, store: string, score: number, sparseTray: boolean): string {
  if (sparseTray) {
    return `Retailer assessment for ${store} is directional only (${score}/100, ${tier}) due to sparse tray coverage.`;
  }
  switch (tier) {
    case "ELITE":
      return `${store} is an elite-trust retailer for this recommendation (${score}/100).`;
    case "TRUSTED":
      return `${store} is a trusted retailer with strong checkout confidence (${score}/100).`;
    case "ACCEPTABLE":
      return `${store} meets acceptable retailer thresholds (${score}/100) with some diligence recommended.`;
    case "CAUTION":
      return `${store} requires caution — retailer quality signals are mixed (${score}/100).`;
    default:
      return `${store} presents elevated retailer risk (${score}/100) — verify seller identity before purchase.`;
  }
}

/** Build retailer intelligence meta from consumed pipeline signals. */
export function buildRetailerIntelligence(input: RetailerIntelligenceInput): RetailerIntelligenceMeta {
  const store = primaryStore(input);
  const title = primaryTitle(input);
  const assessment = pickAssessment(input);
  const product = pickProduct(input);
  const sparseTray = isSparseTray(input);

  const marketplaceRisk = marketplaceRiskScore(store, title);
  const sellerRisk = sellerRiskScore(assessment, store);

  const retailerTrust = computeRetailerTrust(store, assessment);
  const retailerReputation = computeRetailerReputation(product, input.explainability);
  const retailerConsistency = computeRetailerConsistency(input, assessment);
  const deliveryConfidence = computeDeliveryConfidence(product, store);
  const returnPolicyConfidence = computeReturnPolicyConfidence(store, marketplaceRisk);
  const retailerConfidenceDim = computeRetailerConfidenceDimension(assessment, input);

  const retailerScore = computeRetailerScore({
    retailerTrust,
    retailerReputation,
    retailerConsistency,
    deliveryConfidence,
    returnPolicyConfidence,
    marketplaceRisk,
    sellerRisk,
    retailerConfidence: retailerConfidenceDim,
    sparseTray,
  });

  let retailerConfidence = clamp(
    Math.round(retailerConfidenceDim * 0.55 + retailerScore * 0.25 + (100 - sellerRisk) * 0.2),
    0,
    100
  );
  if (sparseTray) retailerConfidence = Math.min(retailerConfidence, 68);

  const retailerTier = tierFor(retailerScore);
  const retailerAdvantages = buildAdvantages(store, assessment, {
    retailerTrust,
    deliveryConfidence,
    returnPolicyConfidence,
    marketplaceRisk,
    sellerRisk,
  });
  const retailerWarnings = buildWarnings(store, assessment, { marketplaceRisk, sellerRisk }, sparseTray);
  const primaryRetailerReason = buildPrimaryRetailerReason(
    retailerTier,
    store,
    retailerScore,
    marketplaceRisk,
    sellerRisk
  );

  return {
    version: VERSION,
    retailerScore,
    retailerTier,
    retailerConfidence,
    retailerAdvantages,
    retailerWarnings,
    primaryRetailerReason,
    sellerRisk,
    marketplaceRisk,
  };
}

/** Post-personalization retailer pass — meta + decision brief only. */
export function applyRetailerIntelligence(input: RetailerIntelligenceInput): {
  meta: RetailerIntelligenceMeta;
  decisionBrief: DecisionBriefDTO | null;
  products: QuantProduct[];
} {
  const meta = buildRetailerIntelligence(input);

  if (!input.decisionBrief) {
    return { meta, decisionBrief: null, products: input.products };
  }

  const decisionBrief: DecisionBriefDTO = {
    ...input.decisionBrief,
    retailerSummary: buildRetailerSummary(meta.retailerTier, primaryStore(input), meta.retailerScore, isSparseTray(input)),
  };

  return { meta, decisionBrief, products: input.products };
}
