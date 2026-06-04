/**
 * Phase 19.0 — Alternative Advantage Intelligence Activation Layer.
 * Explains why the lead outranks nearby alternatives (presentation only).
 */

import { extractProductIdentity } from "@/lib/deals/productIdentity";
import type { ProductTrustDiscountAssessment } from "@/lib/intelligence/phase93TrustDiscountHardening";
import type { ActivatedBuyWait } from "@/lib/ui/buyWaitActivation";
import type { ActivatedCommerceCoverage } from "@/lib/ui/commerceCoverageActivation";
import {
  activateDiscountTruth,
  type ActivatedDiscountTruth,
} from "@/lib/ui/discountTruthActivation";
import { getStoreTrustScore, type QuantProduct } from "@/lib/shoppingScore";

export type ActivatedAlternativeAdvantage = {
  advantageReasons: string[];
  comparisonSummary: string;
  leadAdvantageScore: number;
  cardLine: string;
  expandedLines: string[];
};

export type AlternativeAdvantageInput = {
  product: QuantProduct;
  list: QuantProduct[];
  isLeadProduct: boolean;
  discountTruth: ActivatedDiscountTruth;
  buyWait: ActivatedBuyWait;
  commerceCoverage?: ActivatedCommerceCoverage | null;
  resolvePhase93?: (product: QuantProduct) => ProductTrustDiscountAssessment | null;
};

function clipLine(text: string | undefined | null, max = 112): string {
  if (text == null) return "";
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function listingSafe(product: QuantProduct): QuantProduct {
  return product.extensions ? product : { ...product, extensions: [] };
}

function normalizedTitle(product: QuantProduct): string {
  const safe = listingSafe(product);
  return extractProductIdentity(safe).normalizedTitle?.trim().toLowerCase() || safe.title.trim().toLowerCase();
}

function findNearbyAlternatives(product: QuantProduct, list: QuantProduct[]): QuantProduct[] {
  const title = normalizedTitle(product);
  const comparable = list.filter(
    (item) => item.link !== product.link && normalizedTitle(item) === title && item.price > 0
  );
  if (comparable.length) return comparable;
  return list.filter((item) => item.link !== product.link && item.price > 0);
}

function availabilityScore(product: QuantProduct): number {
  const raw = (product.availability ?? "").toLowerCase();
  if (/out\s*of\s*stock|unavailable|sold\s*out/.test(raw)) return 0.15;
  if (/only\s*\d+\s*left|limited\s*stock|low\s*stock/.test(raw)) return 0.72;
  if (/in\s*stock|available|ready to ship/.test(raw)) return 0.9;
  return 0.45;
}

function medianPrice(products: QuantProduct[]): number {
  const prices = products.map((item) => item.price).filter((price) => price > 0).sort((a, b) => a - b);
  if (!prices.length) return 0;
  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 ? prices[mid]! : (prices[mid - 1]! + prices[mid]!) / 2;
}

function averageDiscountConfidence(
  alternatives: QuantProduct[],
  list: QuantProduct[],
  resolvePhase93?: (product: QuantProduct) => ProductTrustDiscountAssessment | null
): number {
  if (!alternatives.length) return 0;
  const values = alternatives.map(
    (alt) =>
      activateDiscountTruth({
        product: alt,
        list,
        phase93Assessment: resolvePhase93?.(alt) ?? null,
      }).confidence
  );
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildComparisonSummary(reasons: string[]): string {
  if (!reasons.length) return "";
  if (reasons.length === 1) return clipLine(reasons[0]!);
  const themes = reasons.slice(0, 2).map((reason) => {
    if (reason.includes("trust")) return "trust";
    if (reason.includes("Price")) return "price";
    if (reason.includes("Discount")) return "discount";
    if (reason.includes("timing") || reason.includes("Buy")) return "timing";
    if (reason.includes("Availability")) return "availability";
    return "overall fit";
  });
  const uniqueThemes = [...new Set(themes)];
  return clipLine(`Lead outranks nearby alternatives on ${uniqueThemes.join(" and ")}.`);
}

function resolveLeadAdvantageScore(reasonCount: number, weights: number[]): number {
  if (!reasonCount) return 0;
  const raw = weights.reduce((sum, weight) => sum + weight, 0);
  return Math.round(Math.max(0, Math.min(100, raw)));
}

/** Activate alternative advantage copy for one listing (lead-focused). */
export function activateAlternativeAdvantage(
  input: AlternativeAdvantageInput
): ActivatedAlternativeAdvantage {
  const empty: ActivatedAlternativeAdvantage = {
    advantageReasons: [],
    comparisonSummary: "",
    leadAdvantageScore: 0,
    cardLine: "",
    expandedLines: [],
  };
  if (!input.isLeadProduct) return empty;

  const alternatives = findNearbyAlternatives(input.product, input.list);
  if (!alternatives.length) return empty;

  const reasons: string[] = [];
  const weights: number[] = [];
  const leadPrice = input.product.price;
  const altMedian = medianPrice(alternatives);

  if (leadPrice > 0 && altMedian > 0 && leadPrice < altMedian) {
    const pct = Math.round(((altMedian - leadPrice) / altMedian) * 100);
    if (pct >= 3) {
      reasons.push(`Price is ${pct}% lower than comparable offers.`);
      weights.push(Math.min(28, 12 + pct));
    }
  }

  const leadTrust = getStoreTrustScore(input.product.store);
  const altTrust = Math.max(...alternatives.map((alt) => getStoreTrustScore(alt.store)));
  if (leadTrust >= altTrust + 5) {
    reasons.push("Better seller trust than nearby alternatives.");
    weights.push(Math.min(26, 14 + (leadTrust - altTrust) / 2));
  }

  const avgAltDiscountConfidence = averageDiscountConfidence(
    alternatives,
    input.list,
    input.resolvePhase93
  );
  if (input.discountTruth.confidence >= avgAltDiscountConfidence + 8) {
    reasons.push("Discount confidence exceeds competing listings.");
    weights.push(Math.min(22, 10 + (input.discountTruth.confidence - avgAltDiscountConfidence) / 2));
  }

  if (input.buyWait.verdict === "BUY NOW") {
    const weakerTiming = alternatives.filter((alt) => alt.priceTrend !== "down").length;
    if (weakerTiming >= Math.ceil(alternatives.length / 2)) {
      reasons.push("Buy timing is stronger than nearby alternatives.");
      weights.push(16);
    }
  }

  const leadAvailability = availabilityScore(input.product);
  const altAvailability =
    alternatives.reduce((sum, alt) => sum + availabilityScore(alt), 0) / alternatives.length;
  const commerceStrong =
    input.commerceCoverage?.merchantCount != null &&
    input.commerceCoverage.merchantCount > 1 &&
    leadAvailability >= 0.85;
  if (leadAvailability >= altAvailability + 0.18 || commerceStrong) {
    reasons.push("Availability stronger across merchants.");
    weights.push(commerceStrong ? 18 : 14);
  }

  const advantageReasons = reasons.slice(0, 3).map((reason) => clipLine(reason));
  const comparisonSummary = buildComparisonSummary(advantageReasons);
  const leadAdvantageScore = resolveLeadAdvantageScore(advantageReasons.length, weights);
  const cardLine = clipLine(comparisonSummary || advantageReasons[0] || "");

  return {
    advantageReasons,
    comparisonSummary,
    leadAdvantageScore,
    cardLine,
    expandedLines: advantageReasons,
  };
}

export function mergeAlternativeAdvantageExpandedLines(
  existingLines: string[],
  advantage: ActivatedAlternativeAdvantage | null,
  max = 3
): string[] {
  if (!advantage?.expandedLines.length) return existingLines.slice(0, max);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of [...advantage.expandedLines, ...existingLines]) {
    const line = value.trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out.slice(0, max);
}

export function mergeAlternativeAdvantageExpandedSignals(
  existingLines: string[],
  advantage: ActivatedAlternativeAdvantage | null,
  max = 3
): string[] {
  return mergeAlternativeAdvantageExpandedLines(existingLines, advantage, max);
}
