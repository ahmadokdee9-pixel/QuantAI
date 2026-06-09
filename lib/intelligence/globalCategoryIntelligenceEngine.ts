/**
 * Phase 41 — Global Category Intelligence Engine.
 * Category-specific scoring dimensions — no one-size-fits-all logic.
 */

import {
  getCategoryProfile,
  resolveCategoryProfileKey,
  type CategoryProfileKey,
  type CategoryProfileSpec,
} from "@/lib/intelligence/categoryProfileRegistry";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { MerchantTrustSignal } from "@/lib/intelligence/merchantTrustEngineV2";

export type CategoryDimensionScore = {
  key: string;
  label: string;
  score: number;
  signal: string;
};

export type GlobalCategoryIntelligence = {
  version: 1;
  categoryKey: CategoryProfileKey;
  categoryLabel: string;
  profile: CategoryProfileSpec;
  categoryFitScore: number;
  dimensions: CategoryDimensionScore[];
  categoryReasoning: string;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function scoreFromRating(product: QuantProduct): number {
  return clamp(Math.round(((product.rating as number) || 4) * 20), 0, 100);
}

function scoreDimension(
  key: string,
  product: QuantProduct,
  merchantTrust: MerchantTrustSignal,
  searchQuery: string
): number {
  const blob = `${product.title} ${product.extensions?.join(" ") ?? ""} ${searchQuery}`.toLowerCase();
  const rating = scoreFromRating(product);

  switch (key) {
    case "cpu":
    case "performance":
      return /m\d|i\d|ryzen|snapdragon|a\d{2}/i.test(blob) ? clamp(rating + 8, 0, 100) : rating;
    case "ram":
      return /\b(16|32|64)\s*gb\s*ram\b/i.test(blob) ? 82 : /\b8\s*gb\b/i.test(blob) ? 58 : 50;
    case "storage":
    case "ssd":
      return /\b(512|1024|1tb|2tb)\s*gb?\b/i.test(blob) ? 80 : /\b256\s*gb\b/i.test(blob) ? 62 : 52;
    case "battery":
      return /battery|mah|hours/i.test(blob) ? clamp(rating + 4, 0, 100) : rating - 8;
    case "display":
      return /oled|retina|4k|qhd|120hz/i.test(blob) ? 84 : rating;
    case "portability":
      return /air|ultrabook|lightweight|13"/i.test(blob) ? 78 : /17"/i.test(blob) ? 42 : 58;
    case "camera":
      return /pro max|ultra|camera|48mp|200mp/i.test(blob) ? 82 : rating;
    case "ecosystem":
      return /iphone|macbook|airpods|apple|galaxy/i.test(blob) ? 72 : 55;
    case "comfort":
    case "material_quality":
      return /leather|velvet|memory foam|premium fabric|bouclé/i.test(blob) ? 80 : /fabric|linen/i.test(blob) ? 68 : rating;
    case "build_quality":
    case "durability":
      return /solid wood|steel frame|hardwood|warranty/i.test(blob) ? 78 : rating;
    case "space_efficiency":
    case "design_quality":
      return /corner|modular|compact|scandinavian|modern/i.test(blob) ? 74 : rating;
    case "energy":
    case "reliability":
      return /energy|a\+\s*rating|reliable|warranty/i.test(blob) ? 76 : rating;
    case "material":
    case "authenticity":
      return /authentic|genuine|official|brand/i.test(blob) ? 76 : merchantTrust.trustScore >= 68 ? 62 : 48;
    case "return_policy":
      return merchantTrust.returnPolicyScore;
    case "trust":
    case "value":
    case "quality":
    case "fit":
      return clamp(Math.round(rating * 0.6 + merchantTrust.trustScore * 0.4), 0, 100);
    default:
      return rating;
  }
}

/** Build category-native intelligence for one product. */
export function buildGlobalCategoryIntelligence(args: {
  product: QuantProduct;
  searchQuery: string;
  merchantTrust: MerchantTrustSignal;
  segment?: import("@/lib/ui/universalProductIntelligenceEngine").ProductIntelligenceSegment | null;
}): GlobalCategoryIntelligence {
  const { product, searchQuery, merchantTrust, segment = null } = args;
  const categoryKey = resolveCategoryProfileKey(segment, product.title, searchQuery);
  const profile = getCategoryProfile(categoryKey);

  const dimensions: CategoryDimensionScore[] = profile.dimensionKeys.map((key, i) => {
    const score = scoreDimension(key, product, merchantTrust, searchQuery);
    return {
      key,
      label: profile.dimensionLabels[i] ?? key,
      score,
      signal: score >= 72 ? "strong" : score >= 55 ? "fair" : "weak",
    };
  });

  const categoryFitScore = clamp(
    Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / Math.max(1, dimensions.length)),
    0,
    100
  );

  const topDims = [...dimensions].sort((a, b) => b.score - a.score).slice(0, 2);
  const categoryReasoning = `${profile.label} judged on ${profile.reasoningFocus.slice(0, 3).join(", ")} — ${topDims.map((d) => `${d.label} ${d.score}/100`).join(", ")}.`;

  return {
    version: 1,
    categoryKey,
    categoryLabel: profile.label,
    profile,
    categoryFitScore,
    dimensions,
    categoryReasoning,
  };
}

export function detectCategoryFromQuery(searchQuery: string): CategoryProfileKey {
  return resolveCategoryProfileKey(null, "", searchQuery);
}
