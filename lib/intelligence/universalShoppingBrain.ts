/**
 * Phase 12.0 — Universal Shopping Brain.
 * Pre-search intent understanding across all shopping categories.
 * Read-only classification — no tray, ranking, or upstream mutations.
 */

import type { QueryIntelligenceMeta } from "@/lib/search/phase94QueryIntelligence";

export type ShoppingBrainCategoryIntent =
  | "electronics"
  | "fashion"
  | "home"
  | "garden"
  | "sports"
  | "automotive"
  | "beauty"
  | "toys"
  | "books"
  | "general";

export type ShoppingBrainPurchaseIntent =
  | "research"
  | "compare"
  | "buy_now"
  | "best_value"
  | "premium"
  | "gift"
  | "replacement";

export type ShoppingBrainUrgencyIntent = "low" | "medium" | "high";

export type ShoppingBrainValueIntent = "savings" | "balanced" | "premium";

export type ShoppingBrainQualityIntent = "basic" | "standard" | "high" | "luxury";

export type ShoppingBrainBudgetIntent = {
  active: boolean;
  maxPrice: number | null;
  currency: string;
};

export type ShoppingBrainMeta = {
  version: "phase12.0-v1";
  categoryIntent: ShoppingBrainCategoryIntent;
  purchaseIntent: ShoppingBrainPurchaseIntent;
  urgencyIntent: ShoppingBrainUrgencyIntent;
  valueIntent: ShoppingBrainValueIntent;
  qualityIntent: ShoppingBrainQualityIntent;
  premiumIntent: number;
  budgetIntent: ShoppingBrainBudgetIntent;
  confidence: number;
};

const VERSION = "phase12.0-v1" as const;

const CATEGORY_PATTERNS: { intent: ShoppingBrainCategoryIntent; rx: RegExp; weight: number }[] = [
  { intent: "electronics", rx: /\b(laptop|monitor|phone|iphone|macbook|gpu|tablet|tv|keyboard|headphones|earbuds|camera|speaker|router|ssd|ram|cpu|electronics|gaming\s+pc|smartwatch)\b/i, weight: 1 },
  { intent: "fashion", rx: /\b(dress|shirt|pants|jeans|jacket|coat|sneakers|shoes|boots|outfit|fashion|clothing|apparel|handbag|wallet|belt|sunglasses)\b/i, weight: 1 },
  { intent: "home", rx: /\b(chair|desk|sofa|couch|mattress|bed|table|lamp|rug|vacuum|cleaner|blender|microwave|air\s+fryer|furniture|kitchen|appliance|office\s+chair|home\s+decor)\b/i, weight: 1 },
  { intent: "garden", rx: /\b(garden|lawn|mower|shovel|rake|hedge|pruner|greenhouse|patio|planter|compost|outdoor\s+tools|gardening)\b/i, weight: 1 },
  { intent: "sports", rx: /\b(gym|fitness|yoga|running|hiking|cycling|dumbbell|treadmill|sports|workout|athletic|golf|tennis|basketball|soccer)\b/i, weight: 1 },
  { intent: "automotive", rx: /\b(car|tire|automotive|vehicle|motorcycle|dash\s+cam|car\s+seat|engine\s+oil|brake\s+pad)\b/i, weight: 1 },
  { intent: "beauty", rx: /\b(skincare|makeup|perfume|fragrance|serum|moisturizer|shampoo|conditioner|beauty|cosmetic|lipstick|foundation)\b/i, weight: 1 },
  { intent: "toys", rx: /\b(toy|toys|lego|doll|action\s+figure|board\s+game|puzzle|playset|stuffed\s+animal)\b/i, weight: 1 },
  { intent: "books", rx: /\b(book|books|novel|textbook|kindle|audiobook|paperback|hardcover|ebook|e-book)\b/i, weight: 1 },
];

const PURCHASE_PATTERNS: { intent: ShoppingBrainPurchaseIntent; rx: RegExp; weight: number }[] = [
  { intent: "compare", rx: /\b(compare|comparison|versus|vs\.?|which\s+is\s+better|better\s+than|difference\s+between)\b/i, weight: 1.2 },
  { intent: "gift", rx: /\b(gift|present|for\s+(?:my\s+)?(?:father|dad|mother|mom|wife|husband|friend|brother|sister|son|daughter|birthday|christmas|holiday))\b/i, weight: 1.15 },
  { intent: "replacement", rx: /\b(replace|replacement|upgrade\s+from|instead\s+of|old\s+\w+|broken|worn\s+out)\b/i, weight: 1.1 },
  { intent: "buy_now", rx: /\b(buy\s+now|order\s+now|need\s+today|asap|urgent|immediately|today|tonight|ship\s+fast)\b/i, weight: 1.05 },
  { intent: "premium", rx: /\b(premium|luxury|high[\s-]?end|designer|flagship|top[\s-]?tier|professional\s+grade)\b/i, weight: 1.05 },
  { intent: "best_value", rx: /\b(best\s+value|cheap|cheapest|budget|affordable|under\s+\$?\d|below\s+\$?\d|deal|bargain|lowest\s+price)\b/i, weight: 1 },
  { intent: "research", rx: /\b(best|top|recommend|recommended|which|what\s+is\s+the|good\s+\w+\s+for|review|reviews)\b/i, weight: 0.85 },
];

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function queryEnvelope(raw: string, qi?: QueryIntelligenceMeta): string {
  const parts = [raw];
  if (qi) {
    parts.push(qi.originalQuery, qi.canonicalQuery);
    if (qi.detectedIntent.category) parts.push(qi.detectedIntent.category);
    if (qi.detectedIntent.productType) parts.push(qi.detectedIntent.productType);
    if (qi.detectedIntent.useCase) parts.push(qi.detectedIntent.useCase.replace(/_/g, " "));
  }
  return parts.join(" ").toLowerCase();
}

function scoreByPatterns<T extends string>(
  envelope: string,
  patterns: { intent: T; rx: RegExp; weight: number }[]
): Map<T, number> {
  const scores = new Map<T, number>();
  for (const { intent, rx, weight } of patterns) {
    if (rx.test(envelope)) {
      scores.set(intent, (scores.get(intent) ?? 0) + weight);
    }
  }
  return scores;
}

function topIntent<T extends string>(scores: Map<T, number>, fallback: T): T {
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? fallback;
}

function mapPhase94Category(category: string | null, productType: string | null): ShoppingBrainCategoryIntent | null {
  const token = `${category ?? ""} ${productType ?? ""}`.toLowerCase();
  if (!token.trim()) return null;
  if (/\b(watch|audio|phone|laptop|monitor|gpu|tablet|tv|camera|electronics|keyboard|headphone)\b/.test(token)) {
    return "electronics";
  }
  if (/\b(fashion|shoe|sneaker|dress|shirt|clothing|apparel)\b/.test(token)) return "fashion";
  if (/\b(home|furniture|chair|desk|vacuum|kitchen|appliance|mattress)\b/.test(token)) return "home";
  if (/\b(garden|lawn|outdoor\s+tool)\b/.test(token)) return "garden";
  if (/\b(sport|fitness|gym|running|hiking)\b/.test(token)) return "sports";
  if (/\b(auto|car|tire|vehicle)\b/.test(token)) return "automotive";
  if (/\b(beauty|skincare|makeup|perfume)\b/.test(token)) return "beauty";
  if (/\b(toy|game|lego)\b/.test(token)) return "toys";
  if (/\b(book|novel|textbook)\b/.test(token)) return "books";
  return null;
}

function inferCategoryIntent(envelope: string, qi?: QueryIntelligenceMeta): ShoppingBrainCategoryIntent {
  const scores = scoreByPatterns(envelope, CATEGORY_PATTERNS);

  const fromQi = mapPhase94Category(
    qi?.detectedIntent.category ?? null,
    qi?.detectedIntent.productType ?? null
  );
  if (fromQi) scores.set(fromQi, (scores.get(fromQi) ?? 0) + 0.65);

  if (/\bgaming\b/i.test(envelope) && /\b(monitor|gpu|headset|keyboard|laptop|pc)\b/i.test(envelope)) {
    scores.set("electronics", (scores.get("electronics") ?? 0) + 0.55);
  }
  if (/\boffice\s+chair\b/i.test(envelope)) {
    scores.set("home", (scores.get("home") ?? 0) + 0.75);
  }

  return topIntent(scores, "general");
}

function inferPurchaseIntent(envelope: string, qi?: QueryIntelligenceMeta): ShoppingBrainPurchaseIntent {
  const scores = scoreByPatterns(envelope, PURCHASE_PATTERNS);

  if (
    qi?.detectedIntent.comparisonIntent ||
    (qi?.compareEntities != null && qi.compareEntities.length >= 2)
  ) {
    scores.set("compare", (scores.get("compare") ?? 0) + 1.25);
  }
  if (qi?.detectedIntent.priceIntent === "premium") {
    scores.set("premium", (scores.get("premium") ?? 0) + 0.85);
  }
  if (qi?.detectedIntent.priceIntent === "budget" || qi?.detectedIntent.priceIntent === "value") {
    scores.set("best_value", (scores.get("best_value") ?? 0) + 0.75);
  }
  if (qi?.detectedIntent.priceIntent === "discount") {
    scores.set("best_value", (scores.get("best_value") ?? 0) + 0.55);
  }
  if (qi?.constraints.budget.active) {
    scores.set("best_value", (scores.get("best_value") ?? 0) + 0.45);
  }

  const winner = topIntent(scores, "research");
  if (winner === "research" && /\bbest\b/i.test(envelope) && qi?.constraints.budget.active) {
    return "best_value";
  }
  return winner;
}

function inferUrgencyIntent(envelope: string, purchaseIntent: ShoppingBrainPurchaseIntent): ShoppingBrainUrgencyIntent {
  if (/\b(asap|urgent|today|tonight|immediately|ship\s+fast|need\s+now|buy\s+now)\b/i.test(envelope)) {
    return "high";
  }
  if (purchaseIntent === "buy_now" || purchaseIntent === "replacement") {
    return "medium";
  }
  if (/\b(soon|this\s+week|quickly|fast\s+delivery)\b/i.test(envelope)) {
    return "medium";
  }
  return "low";
}

function inferValueIntent(
  envelope: string,
  qi: QueryIntelligenceMeta | undefined,
  purchaseIntent: ShoppingBrainPurchaseIntent
): ShoppingBrainValueIntent {
  if (
    purchaseIntent === "premium" ||
    qi?.detectedIntent.priceIntent === "premium" ||
    /\b(premium|luxury|high[\s-]?end|designer|flagship)\b/i.test(envelope)
  ) {
    return "premium";
  }
  if (
    purchaseIntent === "best_value" ||
    qi?.detectedIntent.priceIntent === "budget" ||
    qi?.detectedIntent.priceIntent === "value" ||
    qi?.detectedIntent.priceIntent === "discount" ||
    qi?.constraints.budget.active ||
    /\b(cheap|cheapest|budget|affordable|under\s+\$?\d|deal|bargain|lowest\s+price)\b/i.test(envelope)
  ) {
    return "savings";
  }
  return "balanced";
}

function inferQualityIntent(
  envelope: string,
  qi: QueryIntelligenceMeta | undefined,
  valueIntent: ShoppingBrainValueIntent
): ShoppingBrainQualityIntent {
  if (/\b(luxury|designer|flagship|professional\s+grade|studio\s+grade)\b/i.test(envelope)) {
    return "luxury";
  }
  if (
    valueIntent === "premium" ||
    qi?.detectedIntent.priceIntent === "premium" ||
    /\b(premium|high[\s-]?end|top[\s-]?tier|pro\b|professional)\b/i.test(envelope)
  ) {
    return "high";
  }
  if (/\b(basic|entry[\s-]?level|budget|cheap|economy)\b/i.test(envelope) || valueIntent === "savings") {
    return "basic";
  }
  return "standard";
}

function inferPremiumIntent(envelope: string, qi: QueryIntelligenceMeta | undefined): number {
  let score = 0.18;
  if (/\b(premium|luxury|high[\s-]?end|designer|flagship)\b/i.test(envelope)) score += 0.42;
  if (qi?.detectedIntent.priceIntent === "premium") score += 0.28;
  if (/\b(cheap|budget|affordable|under\s+\$?\d)\b/i.test(envelope)) score -= 0.22;
  if (qi?.detectedIntent.priceIntent === "budget") score -= 0.18;
  return clamp01(score);
}

function inferBudgetIntent(qi: QueryIntelligenceMeta | undefined): ShoppingBrainBudgetIntent {
  const budget = qi?.constraints.budget;
  return {
    active: budget?.active ?? false,
    maxPrice: budget?.maxPrice ?? null,
    currency: budget?.currency ?? "USD",
  };
}

function computeConfidence(
  envelope: string,
  categoryIntent: ShoppingBrainCategoryIntent,
  purchaseIntent: ShoppingBrainPurchaseIntent,
  qi: QueryIntelligenceMeta | undefined
): number {
  let score = 0.34;
  if (categoryIntent !== "general") score += 0.18;
  if (purchaseIntent !== "research") score += 0.12;
  if (qi?.detectedIntent.brand) score += 0.08;
  if (qi?.detectedIntent.model) score += 0.08;
  if (qi?.constraints.budget.active) score += 0.06;
  if (/\b(best|premium|gift|replace|compare|cheap|under)\b/i.test(envelope)) score += 0.08;
  if (qi?.confidence) score += qi.confidence * 0.12;
  return clamp01(score);
}

/** Classify universal shopping intent from a natural-language query. */
export function buildUniversalShoppingBrain(
  rawQuery: string,
  queryIntelligence?: QueryIntelligenceMeta
): ShoppingBrainMeta {
  const envelope = queryEnvelope(rawQuery, queryIntelligence);
  const categoryIntent = inferCategoryIntent(envelope, queryIntelligence);
  const purchaseIntent = inferPurchaseIntent(envelope, queryIntelligence);
  const urgencyIntent = inferUrgencyIntent(envelope, purchaseIntent);
  const valueIntent = inferValueIntent(envelope, queryIntelligence, purchaseIntent);
  const qualityIntent = inferQualityIntent(envelope, queryIntelligence, valueIntent);
  const premiumIntent = inferPremiumIntent(envelope, queryIntelligence);
  const budgetIntent = inferBudgetIntent(queryIntelligence);
  const confidence = computeConfidence(envelope, categoryIntent, purchaseIntent, queryIntelligence);

  return {
    version: VERSION,
    categoryIntent,
    purchaseIntent,
    urgencyIntent,
    valueIntent,
    qualityIntent,
    premiumIntent,
    budgetIntent,
    confidence,
  };
}
