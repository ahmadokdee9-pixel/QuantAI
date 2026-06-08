/**
 * Phase 34 — Taste Match Engine + Category Taste Profiles.
 * Maps query aesthetic preferences to product taste dimensions.
 */

import type { CategoryProfileKey } from "@/lib/intelligence/categoryProfileRegistry";
import { resolveCategoryProfileKey } from "@/lib/intelligence/categoryProfileRegistry";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { ProductIntelligenceSegment } from "@/lib/ui/universalProductIntelligenceEngine";

export type TasteDimension =
  | "modern"
  | "minimalist"
  | "luxury"
  | "premium"
  | "industrial"
  | "scandinavian"
  | "family_friendly"
  | "gaming_style"
  | "professional"
  | "executive"
  | "elegant"
  | "creator"
  | "business"
  | "student"
  | "gaming"
  | "space_saving"
  | "developer";

export type CategoryTasteSpec = {
  category: CategoryProfileKey;
  dimensions: TasteDimension[];
};

export type TastePreferenceProfile = {
  version: 1;
  queryDimensions: TasteDimension[];
  dimensionConfidence: Partial<Record<TasteDimension, number>>;
  dominantTaste: TasteDimension | null;
};

export type TasteMatchResult = {
  tasteMatchScore: number;
  matchedDimensions: TasteDimension[];
  dominantTaste: TasteDimension | null;
};

const CATEGORY_TASTE_REGISTRY: CategoryTasteSpec[] = [
  { category: "phones", dimensions: ["premium", "creator", "business", "gaming"] },
  { category: "laptops", dimensions: ["developer", "creator", "business", "student", "gaming"] },
  { category: "sofas", dimensions: ["luxury", "modern", "minimalist", "family_friendly", "space_saving"] },
  { category: "headphones", dimensions: ["premium", "professional", "gaming_style", "creator"] },
  { category: "dynamic", dimensions: ["modern", "premium", "professional", "minimalist"] },
];

const TASTE_RULES: Array<{ dimension: TasteDimension; rx: RegExp; weight: number }> = [
  { dimension: "modern", rx: /\b(modern|contemporary|sleek|mid century)\b/i, weight: 1.2 },
  { dimension: "minimalist", rx: /\b(minimal|minimalist|clean lines|simple design)\b/i, weight: 1.2 },
  { dimension: "luxury", rx: /\b(luxury|luxurious|designer|bespoke|haute)\b/i, weight: 1.25 },
  { dimension: "premium", rx: /\b(premium|high end|flagship|top tier|upscale)\b/i, weight: 1.15 },
  { dimension: "industrial", rx: /\b(industrial|loft|raw|metal frame)\b/i, weight: 1.1 },
  { dimension: "scandinavian", rx: /\b(scandinavian|nordic|hygge|ikea style)\b/i, weight: 1.15 },
  { dimension: "family_friendly", rx: /\b(family|kid friendly|children|pet friendly)\b/i, weight: 1.1 },
  { dimension: "gaming_style", rx: /\b(gaming|gamer|rgb|esports)\b/i, weight: 1.2 },
  { dimension: "professional", rx: /\b(professional|pro grade|workplace|office)\b/i, weight: 1.1 },
  { dimension: "executive", rx: /\b(executive|boardroom|corner office)\b/i, weight: 1.15 },
  { dimension: "elegant", rx: /\b(elegant|sophisticated|refined|classy|chic)\b/i, weight: 1.15 },
  { dimension: "creator", rx: /\b(creator|content creator|youtube|streaming|filmmaker)\b/i, weight: 1.2 },
  { dimension: "business", rx: /\b(business|corporate|enterprise|work laptop)\b/i, weight: 1.1 },
  { dimension: "student", rx: /\b(student|school|college|university)\b/i, weight: 1.15 },
  { dimension: "developer", rx: /\b(developer|development|coding|programming|ai development|ml engineer)\b/i, weight: 1.2 },
  { dimension: "gaming", rx: /\b(gaming laptop|gaming phone|rtx|geforce|gaming)\b/i, weight: 1.2 },
  { dimension: "space_saving", rx: /\b(small apartment|compact|space saving|apartment|studio)\b/i, weight: 1.2 },
];

const PRODUCT_TASTE_SIGNALS: Partial<Record<TasteDimension, RegExp>> = {
  modern: /\b(modern|contemporary|sleek|minimal frame)\b/i,
  minimalist: /\b(minimal|minimalist|clean|simple|slim)\b/i,
  luxury: /\b(luxury|designer|leather|marble|velvet|cashmere)\b/i,
  premium: /\b(premium|pro max|ultra|flagship|oled|m4|m3 pro)\b/i,
  industrial: /\b(industrial|metal|steel frame|loft)\b/i,
  scandinavian: /\b(scandinavian|nordic|oak|light wood|hygge)\b/i,
  family_friendly: /\b(family|sectional|modular|fabric|washable|pet)\b/i,
  gaming_style: /\b(gaming|rgb|rog|alienware|razer|rtx)\b/i,
  professional: /\b(business|thinkpad|latitude|probook|enterprise)\b/i,
  executive: /\b(executive|premium leather|x1 carbon|macbook pro)\b/i,
  elegant: /\b(elegant|sophisticated|designer|refined)\b/i,
  creator: /\b(creator|studio|content|video editing|m3 max|color accurate)\b/i,
  business: /\b(business|office|productivity|reliable|enterprise)\b/i,
  student: /\b(student|chromebook|affordable|budget|aspire|pavilion)\b/i,
  developer: /\b(developer|32gb|64gb|m3 max|m4|thinkpad|workstation|cuda|tensorflow)\b/i,
  gaming: /\b(gaming|rtx|geforce|144hz|165hz|rog|legion)\b/i,
  space_saving: /\b(compact|corner|modular|small|2 seater|loveseat|apartment)\b/i,
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

export function getCategoryTasteSpec(category: CategoryProfileKey): CategoryTasteSpec {
  return CATEGORY_TASTE_REGISTRY.find((row) => row.category === category) ?? CATEGORY_TASTE_REGISTRY.find((row) => row.category === "dynamic")!;
}

export function detectTastePreferences(query: string, segment: ProductIntelligenceSegment | null): TastePreferenceProfile {
  const q = query.trim().toLowerCase();
  const categoryKey = resolveCategoryProfileKey(segment, query, query);
  const spec = getCategoryTasteSpec(categoryKey);
  const dimensionConfidence: Partial<Record<TasteDimension, number>> = {};
  const queryDimensions: TasteDimension[] = [];

  for (const rule of TASTE_RULES) {
    if (!spec.dimensions.includes(rule.dimension) && rule.dimension !== "modern" && rule.dimension !== "premium") {
      if (!rule.rx.test(q)) continue;
    }
    if (rule.rx.test(q)) {
      queryDimensions.push(rule.dimension);
      dimensionConfidence[rule.dimension] = clamp(Math.round(55 + rule.weight * 20), 0, 100);
    }
  }

  const ranked = queryDimensions
    .map((dim) => ({ dim, score: dimensionConfidence[dim] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  return {
    version: 1,
    queryDimensions: [...new Set(queryDimensions)],
    dimensionConfidence,
    dominantTaste: ranked[0]?.dim ?? null,
  };
}

function listingBlob(product: QuantProduct, searchQuery = ""): string {
  return `${searchQuery} ${product.title} ${(product.extensions ?? []).join(" ")}`.toLowerCase();
}

/** Score how well a product matches detected taste preferences. */
export function computeTasteMatchScore(
  product: QuantProduct,
  taste: TastePreferenceProfile,
  searchQuery = ""
): TasteMatchResult {
  const blob = listingBlob(product, searchQuery);
  const matchedDimensions: TasteDimension[] = [];
  let score = 48;

  if (!taste.queryDimensions.length) {
    return { tasteMatchScore: 50, matchedDimensions: [], dominantTaste: null };
  }

  for (const dim of taste.queryDimensions) {
    const signal = PRODUCT_TASTE_SIGNALS[dim];
    const confidence = taste.dimensionConfidence[dim] ?? 55;
    if (signal?.test(blob)) {
      matchedDimensions.push(dim);
      score += confidence * 0.18;
    } else {
      score -= confidence * 0.04;
    }
  }

  const matchRatio = matchedDimensions.length / Math.max(1, taste.queryDimensions.length);
  score += matchRatio * 22;

  return {
    tasteMatchScore: clamp(Math.round(score), 0, 100),
    matchedDimensions,
    dominantTaste: matchedDimensions[0] ?? taste.dominantTaste,
  };
}

export function listCategoryTasteProfiles(): CategoryTasteSpec[] {
  return [...CATEGORY_TASTE_REGISTRY];
}
