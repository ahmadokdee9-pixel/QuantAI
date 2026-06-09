/**
 * Phase 42 — Global Category Intelligence Core.
 * Category-native dimensions — laptops, phones, TVs, furniture, appliances.
 */

import type { GlobalCategoryIntelligence } from "@/lib/intelligence/globalCategoryIntelligenceEngine";
import { buildGlobalCategoryIntelligence } from "@/lib/intelligence/globalCategoryIntelligenceEngine";
import type { MerchantTrustSignal } from "@/lib/intelligence/merchantTrustEngineV2";
import type { QuantProduct } from "@/lib/shoppingScore";

export type CategoryIntelligenceCore = Omit<GlobalCategoryIntelligence, "version"> & {
  version: 2;
  categoryIntelligenceScore: number;
  coreDimensions: string[];
};

const CORE_DIMS: Record<string, string[]> = {
  laptops: ["CPU", "RAM", "Battery", "Display", "Storage", "Upgradeability"],
  phones: ["Camera", "Battery", "Display", "Chip", "Longevity"],
  tvs: ["Brightness", "HDR", "Gaming", "Panel Type"],
  sofas: ["Comfort", "Material", "Durability", "Layout", "Construction Quality"],
  appliances: ["Energy Efficiency", "Reliability", "Repairability", "Operating Cost"],
};

function detectTvCategory(title: string, query: string): boolean {
  return /\b(tv|television|oled|qled|hdr|4k tv|8k)\b/i.test(`${title} ${query}`);
}

function scoreTvDimension(dim: string, blob: string, rating: number): number {
  switch (dim) {
    case "Brightness":
      return /nits|bright|hdr peak/i.test(blob) ? 80 : rating;
    case "HDR":
      return /hdr10|dolby vision|hdr/i.test(blob) ? 82 : 55;
    case "Gaming":
      return /120hz|vrr|game mode|hdmi 2\.1/i.test(blob) ? 78 : 50;
    case "Panel Type":
      return /oled|qled|mini.?led/i.test(blob) ? 84 : /led|lcd/i.test(blob) ? 62 : 50;
    default:
      return rating;
  }
}

/** Build category intelligence core with native dimensions per product type. */
export function buildCategoryIntelligenceCore(args: {
  product: QuantProduct;
  searchQuery: string;
  merchantTrust: MerchantTrustSignal;
  segment?: import("@/lib/ui/universalProductIntelligenceEngine").ProductIntelligenceSegment | null;
}): CategoryIntelligenceCore {
  const base = buildGlobalCategoryIntelligence(args);
  const blob = `${args.product.title} ${args.searchQuery}`.toLowerCase();
  const rating = Math.round(((args.product.rating as number) || 4) * 20);

  let categoryKey = base.categoryKey;
  if (detectTvCategory(args.product.title, args.searchQuery)) categoryKey = "home";

  const coreDims = CORE_DIMS[categoryKey] ?? CORE_DIMS[base.categoryKey] ?? ["Quality", "Value", "Trust"];

  let categoryIntelligenceScore = base.categoryFitScore;
  if (detectTvCategory(args.product.title, args.searchQuery)) {
    const tvScores = coreDims.map((d) => scoreTvDimension(d, blob, rating));
    categoryIntelligenceScore = Math.round(tvScores.reduce((a, b) => a + b, 0) / tvScores.length);
  }

  return {
    ...base,
    version: 2,
    categoryKey,
    categoryIntelligenceScore,
    coreDimensions: coreDims,
    categoryReasoning: `${base.categoryLabel} core: ${coreDims.slice(0, 3).join(", ")} — score ${categoryIntelligenceScore}/100.`,
  };
}
