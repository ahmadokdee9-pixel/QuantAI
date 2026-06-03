/**
 * Phase 12.1 — Multi-Category Intelligence Engine.
 * Deterministic category + subcategory classification from natural-language queries.
 * Extends Phase 12.0 Universal Shopping Brain — meta-only, pre-search, read-only.
 */

import type { ShoppingBrainMeta } from "@/lib/intelligence/universalShoppingBrain";
import type { QueryIntelligenceMeta } from "@/lib/search/phase94QueryIntelligence";

export type MultiCategoryId =
  | "electronics"
  | "fashion"
  | "home"
  | "garden"
  | "beauty"
  | "automotive"
  | "sports"
  | "toys"
  | "books"
  | "office"
  | "pets"
  | "health"
  | "general";

export type MultiCategoryMeta = {
  version: "phase12.1-v1";
  category: MultiCategoryId;
  subcategory: string;
  confidence: number;
};

export type MultiCategoryInput = {
  query: string;
  shoppingBrain: ShoppingBrainMeta;
  queryIntelligence: QueryIntelligenceMeta;
};

const VERSION = "phase12.1-v1" as const;

type CategoryRule = { category: MultiCategoryId; rx: RegExp; weight: number };
type SubcategoryRule = { category: MultiCategoryId; subcategory: string; rx: RegExp; weight: number };

const CATEGORY_RULES: CategoryRule[] = [
  { category: "office", rx: /\b(office\s+chair|office\s+desk|desk\s+chair|ergonomic\s+chair|standing\s+desk|office\s+furniture|work\s+desk)\b/i, weight: 1.35 },
  { category: "office", rx: /\b(office|workstation|workspace)\b/i, weight: 0.55 },
  { category: "electronics", rx: /\b(laptop|monitor|phone|iphone|macbook|gpu|tablet|tv|keyboard|headphones|earbuds|camera|speaker|router|ssd|cpu|smartwatch|gaming\s+pc|electronics)\b/i, weight: 1.1 },
  { category: "fashion", rx: /\b(dress|shirt|pants|jeans|jacket|coat|outfit|fashion|clothing|apparel|handbag|wallet|belt|sunglasses)\b/i, weight: 1 },
  { category: "sports", rx: /\b(running\s+shoes|training\s+shoes|gym|fitness|yoga|hiking|cycling|dumbbell|treadmill|sports|workout|athletic|golf|tennis|basketball|soccer)\b/i, weight: 1.15 },
  { category: "sports", rx: /\b(running|marathon|trail\s+run)\b/i, weight: 0.85 },
  { category: "home", rx: /\b(sofa|couch|mattress|bed|table|lamp|rug|blender|microwave|air\s+fryer|furniture|kitchen|appliance|home\s+decor|vacuum\s+cleaner)\b/i, weight: 1 },
  { category: "home", rx: /\b(vacuum|cleaner)\b/i, weight: 0.45 },
  { category: "garden", rx: /\b(garden|lawn|mower|shovel|rake|hedge|pruner|greenhouse|patio|planter|compost|gardening|garden\s+tools)\b/i, weight: 1.2 },
  { category: "automotive", rx: /\b(car\s+vacuum|automotive|vehicle|motorcycle|dash\s+cam|car\s+seat|engine\s+oil|brake\s+pad|car\s+tire|car\b)/i, weight: 1.15 },
  { category: "automotive", rx: /\b(tire|tires)\b/i, weight: 0.75 },
  { category: "beauty", rx: /\b(skincare|makeup|perfume|fragrance|serum|moisturizer|shampoo|conditioner|beauty|cosmetic|lipstick|foundation)\b/i, weight: 1.05 },
  { category: "toys", rx: /\b(toy|toys|lego|doll|action\s+figure|board\s+game|puzzle|playset|stuffed\s+animal)\b/i, weight: 1.05 },
  { category: "books", rx: /\b(book|books|novel|textbook|kindle|audiobook|paperback|hardcover|ebook|e-book)\b/i, weight: 1.05 },
  { category: "pets", rx: /\b(pet|dog|cat|puppy|kitten|aquarium|pet\s+food|leash|collar|litter)\b/i, weight: 1.05 },
  { category: "health", rx: /\b(vitamin|supplement|protein\s+powder|health|wellness|medical|thermometer|blood\s+pressure)\b/i, weight: 1.05 },
  { category: "fashion", rx: /\b(sneakers|shoes|boots)\b/i, weight: 0.65 },
];

const SUBCATEGORY_RULES: SubcategoryRule[] = [
  { category: "electronics", subcategory: "laptop", rx: /\b(laptop|macbook|notebook\s+pc|gaming\s+laptop|ultrabook)\b/i, weight: 1.2 },
  { category: "electronics", subcategory: "monitor", rx: /\b(monitor|display|screen|gaming\s+monitor)\b/i, weight: 1.15 },
  { category: "electronics", subcategory: "phone", rx: /\b(phone|iphone|smartphone|android\s+phone|galaxy\s+s)\b/i, weight: 1.15 },
  { category: "electronics", subcategory: "gpu", rx: /\b(gpu|graphics\s+card|rtx|gtx|radeon)\b/i, weight: 1.15 },
  { category: "electronics", subcategory: "headphones", rx: /\b(headphones|earbuds|airpods|headset)\b/i, weight: 1.1 },
  { category: "electronics", subcategory: "keyboard", rx: /\b(keyboard|mechanical\s+keyboard)\b/i, weight: 1.1 },
  { category: "electronics", subcategory: "tablet", rx: /\b(tablet|ipad)\b/i, weight: 1.1 },
  { category: "electronics", subcategory: "tv", rx: /\b(tv|television|oled\s+tv)\b/i, weight: 1.1 },
  { category: "sports", subcategory: "running-shoes", rx: /\b(running\s+shoes|marathon\s+shoes|trail\s+running\s+shoes|jogging\s+shoes)\b/i, weight: 1.25 },
  { category: "sports", subcategory: "running-shoes", rx: /\b(running)\b.*\b(shoes|sneakers)\b/i, weight: 1.05 },
  { category: "sports", subcategory: "gym-equipment", rx: /\b(dumbbell|treadmill|gym\s+equipment|weight\s+bench)\b/i, weight: 1.1 },
  { category: "sports", subcategory: "yoga", rx: /\b(yoga\s+mat|yoga\s+block|yoga)\b/i, weight: 1.05 },
  { category: "office", subcategory: "chair", rx: /\b(office\s+chair|desk\s+chair|ergonomic\s+chair|chair)\b/i, weight: 1.2 },
  { category: "office", subcategory: "desk", rx: /\b(standing\s+desk|office\s+desk|work\s+desk|desk)\b/i, weight: 1.15 },
  { category: "garden", subcategory: "tools", rx: /\b(garden\s+tools|shovel|rake|pruner|hedge\s+trimmer|tools)\b/i, weight: 1.15 },
  { category: "garden", subcategory: "mower", rx: /\b(lawn\s+mower|mower)\b/i, weight: 1.1 },
  { category: "automotive", subcategory: "car-vacuum", rx: /\b(car\s+vacuum|automotive\s+vacuum|handheld\s+car\s+vacuum)\b/i, weight: 1.25 },
  { category: "automotive", subcategory: "car-vacuum", rx: /\bcar\b.*\b(vacuum|cleaner)\b/i, weight: 1.05 },
  { category: "automotive", subcategory: "tires", rx: /\b(tire|tires|tyre|tyres)\b/i, weight: 1.1 },
  { category: "home", subcategory: "vacuum", rx: /\b(vacuum|vacuum\s+cleaner|robot\s+vacuum)\b/i, weight: 1.1 },
  { category: "home", subcategory: "sofa", rx: /\b(sofa|couch)\b/i, weight: 1.05 },
  { category: "home", subcategory: "mattress", rx: /\b(mattress|bed)\b/i, weight: 1.05 },
  { category: "fashion", subcategory: "shoes", rx: /\b(shoes|sneakers|boots)\b/i, weight: 1.05 },
  { category: "fashion", subcategory: "dress", rx: /\b(dress|gown)\b/i, weight: 1.05 },
  { category: "beauty", subcategory: "skincare", rx: /\b(skincare|serum|moisturizer|cleanser)\b/i, weight: 1.1 },
  { category: "beauty", subcategory: "makeup", rx: /\b(makeup|lipstick|foundation|mascara)\b/i, weight: 1.1 },
  { category: "beauty", subcategory: "perfume", rx: /\b(perfume|fragrance|cologne)\b/i, weight: 1.1 },
  { category: "toys", subcategory: "lego", rx: /\b(lego)\b/i, weight: 1.1 },
  { category: "books", subcategory: "fiction", rx: /\b(novel|fiction)\b/i, weight: 1.05 },
  { category: "books", subcategory: "textbook", rx: /\b(textbook)\b/i, weight: 1.05 },
  { category: "pets", subcategory: "dog", rx: /\b(dog|puppy)\b/i, weight: 1.05 },
  { category: "pets", subcategory: "cat", rx: /\b(cat|kitten)\b/i, weight: 1.05 },
  { category: "health", subcategory: "supplements", rx: /\b(vitamin|supplement|protein\s+powder)\b/i, weight: 1.05 },
  { category: "general", subcategory: "gift", rx: /\b(gift|present|for\s+(?:my\s+)?(?:father|dad|mother|mom|wife|husband|friend|brother|sister|son|daughter))\b/i, weight: 1.1 },
];

const BRAIN_CATEGORY_MAP: Partial<Record<ShoppingBrainMeta["categoryIntent"], MultiCategoryId>> = {
  electronics: "electronics",
  fashion: "fashion",
  home: "home",
  garden: "garden",
  sports: "sports",
  automotive: "automotive",
  beauty: "beauty",
  toys: "toys",
  books: "books",
  general: "general",
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildEnvelope(input: MultiCategoryInput): string {
  const qi = input.queryIntelligence;
  return [
    input.query,
    qi.originalQuery,
    qi.canonicalQuery,
    qi.detectedIntent.category,
    qi.detectedIntent.productType,
    qi.detectedIntent.useCase?.replace(/_/g, " "),
    qi.detectedIntent.performanceIntent?.replace(/_/g, " "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scoreCategories(envelope: string, input: MultiCategoryInput): Map<MultiCategoryId, number> {
  const scores = new Map<MultiCategoryId, number>();

  for (const rule of CATEGORY_RULES) {
    if (rule.rx.test(envelope)) {
      scores.set(rule.category, (scores.get(rule.category) ?? 0) + rule.weight);
    }
  }

  const brainCategory = BRAIN_CATEGORY_MAP[input.shoppingBrain.categoryIntent];
  if (brainCategory) {
    scores.set(brainCategory, (scores.get(brainCategory) ?? 0) + 0.42);
  }

  if (input.shoppingBrain.purchaseIntent === "gift") {
    scores.set("general", (scores.get("general") ?? 0) + 0.85);
  }

  if (/\boffice\s+chair\b/i.test(envelope) || qiProductIsOffice(input)) {
    scores.set("office", (scores.get("office") ?? 0) + 0.55);
    scores.set("home", Math.max(0, (scores.get("home") ?? 0) - 0.35));
  }

  if (/\b(running\s+shoes|running)\b/i.test(envelope) && /\b(shoes|sneakers)\b/i.test(envelope)) {
    scores.set("sports", (scores.get("sports") ?? 0) + 0.75);
    scores.set("fashion", Math.max(0, (scores.get("fashion") ?? 0) - 0.45));
  }

  if (/\bcar\b/i.test(envelope) && /\b(vacuum|cleaner)\b/i.test(envelope)) {
    scores.set("automotive", (scores.get("automotive") ?? 0) + 0.85);
    scores.set("home", Math.max(0, (scores.get("home") ?? 0) - 0.5));
  }

  return scores;
}

function qiProductIsOffice(input: MultiCategoryInput): boolean {
  const token = `${input.queryIntelligence.detectedIntent.productType ?? ""} ${input.queryIntelligence.detectedIntent.category ?? ""}`.toLowerCase();
  return /\boffice/.test(token);
}

function topCategory(scores: Map<MultiCategoryId, number>): MultiCategoryId {
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? "general";
}

function topCategoryScore(scores: Map<MultiCategoryId, number>, category: MultiCategoryId): number {
  return scores.get(category) ?? 0;
}

function inferSubcategory(
  envelope: string,
  category: MultiCategoryId,
  input: MultiCategoryInput
): { subcategory: string; score: number } {
  if (input.shoppingBrain.purchaseIntent === "gift" && category === "general") {
    return { subcategory: "gift", score: 1.05 };
  }

  const scores = new Map<string, number>();
  for (const rule of SUBCATEGORY_RULES) {
    if (rule.category !== category && rule.category !== "general") continue;
    if (rule.rx.test(envelope)) {
      scores.set(rule.subcategory, (scores.get(rule.subcategory) ?? 0) + rule.weight);
    }
  }

  const productType = slugifyToken(
    input.queryIntelligence.detectedIntent.productType ??
      input.queryIntelligence.detectedIntent.category
  );
  if (productType && category !== "general") {
    scores.set(productType, (scores.get(productType) ?? 0) + 0.55);
  }

  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted[0]) {
    return { subcategory: sorted[0][0], score: sorted[0][1] };
  }

  return { subcategory: category === "general" ? "general" : "other", score: 0.2 };
}

function slugifyToken(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return slug.length >= 2 ? slug : null;
}

function computeConfidence(
  category: MultiCategoryId,
  categoryScore: number,
  subcategory: string,
  subcategoryScore: number,
  input: MultiCategoryInput
): number {
  const isGiftQuery =
    category === "general" ||
    subcategory === "gift" ||
    input.shoppingBrain.purchaseIntent === "gift";

  if (isGiftQuery) {
    let score = 0.58;
    if (/\b(gift|present)\b/i.test(input.query)) score += 0.08;
    if (/\bfor\s+(?:my\s+)?(?:father|dad|mother|mom|wife|husband)\b/i.test(input.query)) {
      score += 0.05;
    }
    return round2(clamp01(Math.min(score, 0.74)));
  }

  let score = 0.38;
  score += Math.min(0.28, categoryScore * 0.16);
  score += Math.min(0.24, subcategoryScore * 0.14);

  if (input.shoppingBrain.categoryIntent === category || BRAIN_CATEGORY_MAP[input.shoppingBrain.categoryIntent] === category) {
    score += 0.06;
  }
  if (input.queryIntelligence.detectedIntent.productType || input.queryIntelligence.detectedIntent.category) {
    score += 0.05;
  }
  if (subcategory !== "general" && subcategory !== "other") {
    score += 0.08;
  }
  if (categoryScore >= 1.1 && subcategoryScore >= 1.0) {
    score = Math.max(score, 0.9);
  }
  if (categoryScore >= 1.3 && subcategoryScore >= 1.15) {
    score = Math.max(score, 0.93);
  }

  return round2(clamp01(score));
}

/** Classify shopping category and subcategory from query + Phase 12.0 signals. */
export function buildMultiCategoryIntelligence(input: MultiCategoryInput): MultiCategoryMeta {
  const envelope = buildEnvelope(input);
  const categoryScores = scoreCategories(envelope, input);
  const category = topCategory(categoryScores);
  const categoryScore = topCategoryScore(categoryScores, category);
  const { subcategory, score: subcategoryScore } = inferSubcategory(envelope, category, input);
  const confidence = computeConfidence(category, categoryScore, subcategory, subcategoryScore, input);

  return {
    version: VERSION,
    category,
    subcategory,
    confidence,
  };
}
