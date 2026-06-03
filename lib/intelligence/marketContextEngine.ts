/**
 * Phase 10.3 — Market Context Intelligence.
 * Evaluates purchase timing and pricing context from existing pipeline signals only.
 * No tray reorder, no verdict/ranking/alternative overrides, no external APIs.
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { AlternativeIntelligenceMeta } from "@/lib/intelligence/alternativeIntelligenceEngine";
import type { ExplainabilityMeta } from "@/lib/intelligence/explainabilityEngine";
import type {
  Phase93TrustDiscountMeta,
  ProductTrustDiscountAssessment,
} from "@/lib/intelligence/phase93TrustDiscountHardening";
import type { CommerceVerdict, VerdictIntelligenceMeta } from "@/lib/intelligence/verdictEngine";
import type { SparseResultAssessment } from "@/lib/search/sparseResultIntelligence";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";

export type MarketStatus =
  | "BUY_NOW"
  | "GOOD_OPPORTUNITY"
  | "FAIR_PRICE"
  | "WAIT"
  | "OVERPRICED"
  | "INSUFFICIENT_DATA";

export type MarketContextMeta = {
  version: "phase10.3-v1";
  marketStatus: MarketStatus;
  confidence: number;
  summary: string;
  timingReason: string;
  pricingAssessment: {
    strength: number;
    confidence: number;
  };
  signals: string[];
  warnings: string[];
};

export type MarketContextInput = {
  products: QuantProduct[];
  decisionBrief: DecisionBriefDTO | null;
  phase93: Phase93TrustDiscountMeta;
  sparse?: SparseResultAssessment;
  verdictIntelligence: VerdictIntelligenceMeta;
  explainability: ExplainabilityMeta;
  alternativeIntelligence: AlternativeIntelligenceMeta;
};

const VERSION = "phase10.3-v1" as const;
const INSUFFICIENT_THRESHOLD = 45;
const STRONG_VERDICTS = new Set<CommerceVerdict>(["STRONG BUY", "BUY READY", "BEST VALUE"]);
const NEGATIVE_VERDICTS = new Set<CommerceVerdict>(["WAIT", "AVOID"]);

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function pickAssessment(
  brief: DecisionBriefDTO | null,
  phase93: Phase93TrustDiscountMeta
): ProductTrustDiscountAssessment | null {
  if (!brief) return phase93.trayAssessments[0] ?? null;
  return (
    phase93.trayAssessments.find((a) => a.link === brief.recommendation.link) ??
    phase93.trayAssessments[0] ??
    null
  );
}

function pickPrice(brief: DecisionBriefDTO | null): number {
  if (brief?.recommendation.price != null && brief.recommendation.price > 0) {
    return brief.recommendation.price;
  }
  return 0;
}

function verifiedDiscountOnPick(
  brief: DecisionBriefDTO | null,
  phase93: Phase93TrustDiscountMeta
): boolean {
  if (!brief) return false;
  const best = phase93.discountIntelligence.bestVerifiedDiscount;
  return best?.link === brief.recommendation.link;
}

function strongerValueAlternative(
  alt: AlternativeIntelligenceMeta,
  pickPrice: number
): boolean {
  if (pickPrice <= 0) return false;
  const better = alt.alternatives.find((a) => a.classification === "better_value");
  if (!better?.price || better.price <= 0) return false;
  return better.price <= pickPrice * 0.9 && better.trustScore >= 68;
}

function buildPricingAssessment(input: MarketContextInput): MarketContextMeta["pricingAssessment"] {
  const basis = input.explainability.recommendationBasis;
  const vc = input.phase93.verdictConfidence;
  const pick = pickAssessment(input.decisionBrief, input.phase93);
  const med = input.phase93.discountIntelligence.medianPrice;
  const pickPx = pickPrice(input.decisionBrief);

  let strength = basis.pricing;
  if (verifiedDiscountOnPick(input.decisionBrief, input.phase93)) strength += 12;
  if (pick?.priceAnomaly === "premium_outlier") strength -= 22;
  if (pick?.priceAnomaly === "deep_discount") strength += 6;
  if (pickPx > 0 && med > 0 && pickPx <= med * 0.92) strength += 8;
  if (pickPx > 0 && med > 0 && pickPx >= med * 1.12) strength -= 14;

  let confidence = Math.round(vc.score * 0.55 + basis.retailer * 0.25 + basis.trust * 0.2);
  if (vc.discountAuthentic) confidence += 4;
  if (input.sparse?.sparse) confidence -= 12;

  return {
    strength: clamp(Math.round(strength), 0, 100),
    confidence: clamp(Math.round(confidence), 0, 100),
  };
}

function compositeConfidence(
  pricing: MarketContextMeta["pricingAssessment"],
  input: MarketContextInput
): number {
  const verdictConf = input.verdictIntelligence.confidence;
  const explainAvg = Math.round(
    (input.explainability.recommendationBasis.trust +
      input.explainability.recommendationBasis.pricing +
      input.explainability.recommendationBasis.retailer) /
      3
  );
  return clamp(
    Math.round(pricing.confidence * 0.4 + verdictConf * 0.35 + explainAvg * 0.25),
    0,
    100
  );
}

function buildSignals(input: MarketContextInput, pick: ProductTrustDiscountAssessment | null): string[] {
  const out: string[] = [];
  const basis = input.explainability.recommendationBasis;
  const vc = input.phase93.verdictConfidence;

  if (verifiedDiscountOnPick(input.decisionBrief, input.phase93)) {
    out.push("Verified discount on recommended listing");
  }
  if (vc.discountAuthentic) out.push("Discount authenticity confirmed in tray");
  if (basis.trust >= 72) out.push("Trust profile supports checkout timing");
  if (basis.pricing >= 68) out.push("Pricing position favorable versus tray peers");
  if (basis.retailer >= 70) out.push("Retailer confidence is solid");
  if (STRONG_VERDICTS.has(input.verdictIntelligence.verdict)) {
    out.push(`Verdict ${input.verdictIntelligence.verdict} supports favorable timing`);
  }
  if (input.alternativeIntelligence.count >= 2) {
    out.push("Tray alternatives provide comparative pricing context");
  }
  if (pick?.retailerConfidence != null && pick.retailerConfidence >= 75) {
    out.push("High retailer confidence on primary pick");
  }
  if (input.sparse?.sparse) out.push("Sparse tray limits market breadth");

  return [...new Set(out)].slice(0, 6);
}

function buildWarnings(
  input: MarketContextInput,
  pick: ProductTrustDiscountAssessment | null
): string[] {
  const out: string[] = [];
  if (input.sparse?.sparse) out.push("Limited listings — timing assessment is directional only");
  if (!input.phase93.verdictConfidence.discountAuthentic) {
    out.push("Discount confidence is weak across evaluated offers");
  }
  if (pick?.fakeDiscountRisk === "high") out.push("Inflated discount anchor on primary listing");
  if (pick?.fakeDiscountRisk === "medium") out.push("Discount authenticity uncertain");
  if (pick?.priceAnomaly === "premium_outlier") out.push("Primary price sits above peer median");
  if (pick?.priceAnomaly === "suspicious_low") out.push("Pricing evidence unstable — unusually low versus peers");
  if (pick?.suspiciousSeller) out.push("Seller risk weakens purchase timing confidence");
  if (NEGATIVE_VERDICTS.has(input.verdictIntelligence.verdict)) {
    out.push(`Verdict ${input.verdictIntelligence.verdict} discourages immediate purchase`);
  }
  for (const w of input.verdictIntelligence.warnings) {
    if (out.length >= 5) break;
    if (!out.includes(w)) out.push(w);
  }
  return out.slice(0, 5);
}

function classifyMarketStatus(
  input: MarketContextInput,
  pricing: MarketContextMeta["pricingAssessment"],
  confidence: number
): MarketStatus {
  const pick = pickAssessment(input.decisionBrief, input.phase93);
  const basis = input.explainability.recommendationBasis;
  const vc = input.phase93.verdictConfidence;
  const sparse = Boolean(input.sparse?.sparse ?? input.decisionBrief?.sparseTrayWarning);
  const pickPx = pickPrice(input.decisionBrief);
  const verdict = input.verdictIntelligence.verdict;

  if (confidence < INSUFFICIENT_THRESHOLD || !input.decisionBrief || !input.products.length) {
    return "INSUFFICIENT_DATA";
  }

  const unstablePricing =
    pick?.fakeDiscountRisk === "high" ||
    pick?.priceAnomaly === "suspicious_low" ||
    (!vc.discountAuthentic && vc.score < 55);

  if (
    sparse ||
    verdict === "WAIT" ||
    verdict === "AVOID" ||
    vc.score < 50 ||
    unstablePricing
  ) {
    if (
      pick?.priceAnomaly === "premium_outlier" ||
      basis.pricing < 42 ||
      strongerValueAlternative(input.alternativeIntelligence, pickPx)
    ) {
      return "OVERPRICED";
    }
    return "WAIT";
  }

  if (
    pick?.priceAnomaly === "premium_outlier" ||
    basis.pricing < 42 ||
    strongerValueAlternative(input.alternativeIntelligence, pickPx)
  ) {
    return "OVERPRICED";
  }

  const trustedRetailer =
    (pick?.trustScore ?? getStoreTrustScore(input.decisionBrief?.recommendation.store ?? "")) >= 72 &&
    (pick?.retailerConfidence ?? 0) >= 70 &&
    !pick?.suspiciousSeller;

  const strongDiscount =
    verifiedDiscountOnPick(input.decisionBrief, input.phase93) && vc.discountAuthentic;

  if (
    strongDiscount &&
    trustedRetailer &&
    STRONG_VERDICTS.has(verdict) &&
    vc.score >= 72 &&
    pricing.strength >= 68 &&
    pricing.confidence >= 65
  ) {
    return "BUY_NOW";
  }

  if (
    pricing.strength >= 62 &&
    trustedRetailer &&
    confidence >= 58 &&
    !NEGATIVE_VERDICTS.has(verdict)
  ) {
    return "GOOD_OPPORTUNITY";
  }

  return "FAIR_PRICE";
}

const STATUS_SUMMARY: Record<MarketStatus, string> = {
  BUY_NOW:
    "Strong buy timing — verified discount, trusted retailer, and high pricing confidence.",
  GOOD_OPPORTUNITY:
    "Current pricing appears favorable relative to evaluated alternatives.",
  FAIR_PRICE:
    "Purchase is reasonable, though pricing does not suggest urgency.",
  WAIT: "Waiting may provide better value based on available pricing signals.",
  OVERPRICED: "Price profile appears elevated relative to stronger alternatives.",
  INSUFFICIENT_DATA:
    "Insufficient pricing and trust signals to assess market timing confidently.",
};

const STATUS_TIMING: Record<MarketStatus, string> = {
  BUY_NOW:
    "Verified savings, trusted retailer, and institutional verdict align for immediate purchase.",
  GOOD_OPPORTUNITY:
    "Tray pricing and trust signals support buying without strong urgency pressure.",
  FAIR_PRICE:
    "Pricing sits in a normal band — acceptable to buy, but no compelling timing edge.",
  WAIT:
    "Sparse coverage, weak discount proof, or verdict caution favors delaying the purchase.",
  OVERPRICED:
    "Primary listing prices above stronger tray alternatives or peer median expectations.",
  INSUFFICIENT_DATA:
    "Market timing cannot be scored reliably until more tray pricing evidence is available.",
};

const BRIEF_SUMMARY: Record<MarketStatus, string> = {
  BUY_NOW:
    "Current pricing appears favorable relative to evaluated alternatives with strong timing support.",
  GOOD_OPPORTUNITY:
    "Current pricing appears favorable relative to evaluated alternatives.",
  FAIR_PRICE:
    "Purchase is reasonable, though pricing does not suggest urgency.",
  WAIT: "Waiting may provide better value based on available pricing signals.",
  OVERPRICED:
    "Price profile appears elevated relative to stronger alternatives.",
  INSUFFICIENT_DATA:
    "Market timing assessment is limited until more pricing and trust evidence is available.",
};

/** Build market context meta from consumed pipeline intelligence. */
export function buildMarketContext(input: MarketContextInput): MarketContextMeta {
  const pricingAssessment = buildPricingAssessment(input);
  const confidence = compositeConfidence(pricingAssessment, input);
  const pick = pickAssessment(input.decisionBrief, input.phase93);
  const marketStatus = classifyMarketStatus(input, pricingAssessment, confidence);
  const signals = buildSignals(input, pick);
  const warnings = buildWarnings(input, pick);

  return {
    version: VERSION,
    marketStatus,
    confidence,
    summary: STATUS_SUMMARY[marketStatus],
    timingReason: STATUS_TIMING[marketStatus],
    pricingAssessment,
    signals,
    warnings,
  };
}

/** Post-alternative market context pass — meta + decision brief only. */
export function applyMarketContextIntelligence(input: MarketContextInput): {
  meta: MarketContextMeta;
  decisionBrief: DecisionBriefDTO | null;
  products: QuantProduct[];
} {
  const meta = buildMarketContext(input);
  const products = input.products;

  if (!input.decisionBrief) {
    return { meta, decisionBrief: null, products };
  }

  const decisionBrief: DecisionBriefDTO = {
    ...input.decisionBrief,
    marketContextSummary: BRIEF_SUMMARY[meta.marketStatus],
  };

  return { meta, decisionBrief, products };
}
