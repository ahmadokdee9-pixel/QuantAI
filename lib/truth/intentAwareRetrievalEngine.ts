/**
 * Phase 2B — Intent-aware retrieval engine.
 * Scores product-listing fit against Phase 2A IntentSnapshot for retrieval ranking.
 */

import type { IntentEngineSnapshot } from "@/lib/truth/intentIntelligenceEngine";
import { normalizeShoppingQuery } from "@/lib/truth/intentIntelligenceEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { queryListingRelevance01 } from "@/lib/intelligence/queryRelevance";
import { ratingValue } from "@/lib/shoppingScore";

export type IntentRetrievalSnapshot = {
  retrievalIntentScore: number;
  retrievalReasons: string[];
};

export type IntentAwareRetrievalInput = {
  product: QuantProduct;
  intentEngine: IntentEngineSnapshot;
};

const USE_CASE_SIGNALS: Record<
  string,
  { positive: { rx: RegExp; reason: string }[]; negative: { rx: RegExp; reason: string }[] }
> = {
  gaming: {
    positive: [
      { rx: /\b(rtx|gtx|geforce|radeon|rx\s*\d|gpu|graphics)\b/i, reason: "✓ gaming GPU" },
      { rx: /\b(144hz|165hz|240hz|360hz|high\s*refresh)\b/i, reason: "✓ high refresh display" },
      { rx: /\b(gaming|gamer|esports|legion|rog|omen|predator)\b/i, reason: "✓ gaming positioning" },
      { rx: /\b(gaming|gamer)\b/i, reason: "✓ gaming reviews" },
    ],
    negative: [{ rx: /\b(chromebook|office\s+only|basic\s+use)\b/i, reason: "✗ weak gaming fit" }],
  },
  travel: {
    positive: [
      { rx: /\b(travel|compact|portable|lightweight|mirrorless|zoom\s+lens)\b/i, reason: "✓ travel-friendly design" },
      { rx: /\b(battery|long\s+life|carry)\b/i, reason: "✓ portable use case fit" },
    ],
    negative: [{ rx: /\b(studio|desktop|heavy|bulk)\b/i, reason: "✗ bulky for travel intent" }],
  },
  "video editing": {
    positive: [
      { rx: /\b(m1|m2|m3|m4|core\s*i[79]|ryzen\s*[79]|32gb|64gb|creator|studio)\b/i, reason: "✓ editing performance specs" },
      { rx: /\b(oled|color\s+accurate|premiere|davinci|4k\s+edit)\b/i, reason: "✓ creator display/workflow fit" },
    ],
    negative: [{ rx: /\b(entry\s+level|celeron|4gb\s+ram)\b/i, reason: "✗ underpowered for editing intent" }],
  },
  productivity: {
    positive: [
      { rx: /\b(ultrabook|thinkpad|macbook|office|business|productivity)\b/i, reason: "✓ productivity positioning" },
      { rx: /\b(long\s+battery|keyboard|webcam)\b/i, reason: "✓ work-ready features" },
    ],
    negative: [{ rx: /\b(toy|kids|novelty)\b/i, reason: "✗ not work-oriented" }],
  },
  photography: {
    positive: [
      { rx: /\b(dslr|mirrorless|full\s*frame|aps-c|sensor|lens|megapixel|mp)\b/i, reason: "✓ photography hardware signals" },
      { rx: /\b(pro|professional|creator|vlog)\b/i, reason: "✓ creator photography fit" },
    ],
    negative: [{ rx: /\b(webcam|doorbell|toy\s+camera)\b/i, reason: "✗ not a photography product" }],
  },
  student: {
    positive: [
      { rx: /\b(student|school|budget|value|chromebook|affordable)\b/i, reason: "✓ student value positioning" },
    ],
    negative: [{ rx: /\b(enterprise|workstation|premium\s+only)\b/i, reason: "✗ expensive for student intent" }],
  },
};

const PRODUCT_TYPE_HINTS: Record<string, RegExp> = {
  laptop: /\b(laptop|notebook|ultrabook|macbook|chromebook|لابتوب)\b/i,
  smartphone: /\b(phone|iphone|smartphone|galaxy|pixel|mobile|هاتف|جوال)\b/i,
  camera: /\b(camera|dslr|mirrorless|canon|nikon|sony\s*alpha|كاميرا)\b/i,
  headphones: /\b(headphones|earbuds|airpods|headset|سماعة)\b/i,
  monitor: /\b(monitor|display|screen|مونيتور)\b/i,
  television: /\b(tv|television|oled\s+tv|تلفزيون)\b/i,
  tablet: /\b(tablet|ipad)\b/i,
  smartwatch: /\b(watch|smartwatch|ساعة)\b/i,
  "graphics card": /\b(gpu|graphics\s+card|rtx|gtx|radeon)\b/i,
  "gaming console": /\b(playstation|xbox|nintendo|console)\b/i,
};

const BRAND_HINTS: Record<string, RegExp> = {
  Apple: /\b(apple|iphone|ipad|macbook|airpods)\b/i,
  Samsung: /\b(samsung|galaxy)\b/i,
  Google: /\b(google|pixel)\b/i,
  Xiaomi: /\b(xiaomi|redmi|poco)\b/i,
  Huawei: /\b(huawei|honor)\b/i,
  Sony: /\b(sony|playstation|wh-1000)\b/i,
  Bose: /\b(bose|quietcomfort)\b/i,
  Dell: /\b(dell|alienware|xps)\b/i,
  Lenovo: /\b(lenovo|thinkpad|legion)\b/i,
  Asus: /\b(asus|rog|zenbook)\b/i,
  HP: /\b(hp|omen|spectre)\b/i,
  MSI: /\b(msi)\b/i,
  Acer: /\b(acer|predator)\b/i,
  Nikon: /\b(nikon)\b/i,
  Canon: /\b(canon)\b/i,
  Fujifilm: /\b(fujifilm|fuji)\b/i,
  Dyson: /\b(dyson)\b/i,
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function productTextBlob(product: QuantProduct, normalizedQuery: string): string {
  return `${product.title} ${(product.extensions ?? []).join(" ")} ${product.shipping ?? ""} ${normalizedQuery}`.toLowerCase();
}

function scoreProductRelevance(blob: string, intent: IntentEngineSnapshot["intent"], queryRelevance: number): {
  score: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 35 + queryRelevance * 40;

  if (intent.productType) {
    const rx = PRODUCT_TYPE_HINTS[intent.productType];
    if (rx?.test(blob)) {
      score += 22;
      reasons.push(`✓ ${intent.productType} relevance`);
    } else {
      score -= 28;
      reasons.push(`✗ weak ${intent.productType} match`);
    }
  }

  if (intent.category) score += 6;

  return { score: clampScore(score), reasons };
}

function scoreUseCaseMatch(blob: string, useCase: string | null, reviews: number, rating: number): {
  score: number;
  reasons: string[];
} {
  if (!useCase) return { score: 50, reasons: [] };
  const profile = USE_CASE_SIGNALS[useCase];
  if (!profile) return { score: 50, reasons: [] };

  let score = 38;
  const reasons: string[] = [];
  for (const signal of profile.positive) {
    if (signal.rx.test(blob)) {
      score += 14;
      if (!reasons.includes(signal.reason)) reasons.push(signal.reason);
    }
  }
  if (useCase === "gaming" && reviews >= 20 && rating >= 4) {
    score += 10;
    if (!reasons.includes("✓ gaming reviews")) reasons.push("✓ gaming reviews");
  }
  for (const signal of profile.negative) {
    if (signal.rx.test(blob)) {
      score -= 22;
      reasons.push(signal.reason);
    }
  }
  return { score: clampScore(score), reasons };
}

function scoreBudgetMatch(
  price: number,
  intent: IntentEngineSnapshot["intent"],
  budgetSensitive: boolean
): { score: number; reasons: string[] } {
  if (!intent.budget || price <= 0) {
    if (intent.qualityLevel === "budget" || budgetSensitive) {
      return { score: 58, reasons: ["✓ budget-sensitive intent"] };
    }
    return { score: 52, reasons: [] };
  }

  if (price <= intent.budget) {
    const headroom = (intent.budget - price) / intent.budget;
    return {
      score: clampScore(72 + headroom * 24),
      reasons: [`✓ within ${intent.currency ?? "budget"} ${intent.budget} budget`],
    };
  }

  const over = (price - intent.budget) / intent.budget;
  return {
    score: clampScore(Math.max(12, 48 - over * 40)),
    reasons: [`✗ exceeds ${intent.currency ?? "budget"} ${intent.budget} budget`],
  };
}

function scoreQualityMatch(blob: string, price: number, intent: IntentEngineSnapshot["intent"]): {
  score: number;
  reasons: string[];
} {
  if (!intent.qualityLevel) return { score: 52, reasons: [] };

  const reasons: string[] = [];
  let score = 50;
  const premium = /\b(pro|max|ultra|premium|flagship|studio|professional|oled)\b/i.test(blob);
  const budget = /\b(cheap|budget|refurb|renewed|clearance|value)\b/i.test(blob);

  switch (intent.qualityLevel) {
    case "budget":
      if (budget || (intent.budget != null && price > 0 && price <= intent.budget * 0.85)) {
        score += 24;
        reasons.push("✓ budget value positioning");
      }
      if (premium) {
        score -= 18;
        reasons.push("✗ premium listing vs budget intent");
      }
      break;
    case "best":
    case "premium":
    case "professional":
    case "powerful":
      if (premium) {
        score += 24;
        reasons.push(`✓ ${intent.qualityLevel} quality signals`);
      } else if (budget) {
        score -= 20;
        reasons.push(`✗ conflicts with ${intent.qualityLevel} intent`);
      } else {
        score += 8;
      }
      break;
    default:
      score += 10;
  }

  return { score: clampScore(score), reasons };
}

function scoreBrandMatch(blob: string, intent: IntentEngineSnapshot["intent"]): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 52;

  if (intent.preferredBrand) {
    const rx = BRAND_HINTS[intent.preferredBrand];
    if (rx?.test(blob)) {
      score += 28;
      reasons.push(`✓ preferred brand ${intent.preferredBrand}`);
    } else {
      score -= 26;
      reasons.push(`✗ missing preferred brand ${intent.preferredBrand}`);
    }
  }

  for (const excluded of intent.excludedBrands) {
    const rx = BRAND_HINTS[excluded];
    if (rx?.test(blob)) {
      score -= 30;
      reasons.push(`✗ excluded brand ${excluded}`);
    }
  }

  return { score: clampScore(score), reasons };
}

export function hasIntentRetrievalSignal(snapshot: IntentRetrievalSnapshot | null | undefined): boolean {
  return Boolean(snapshot && snapshot.retrievalIntentScore >= 0);
}

/** Convert retrieval score to bounded tray rank nudge. */
export function intentRetrievalRankNudge(retrievalIntentScore: number): number {
  if (!Number.isFinite(retrievalIntentScore)) return 0;
  const delta = (retrievalIntentScore - 50) * 0.12;
  return Math.min(8, Math.max(-8, Math.round(delta * 10) / 10));
}

/** Score one listing against parsed query intent. */
export function buildIntentAwareRetrieval(input: IntentAwareRetrievalInput): IntentRetrievalSnapshot {
  const intent = input.intentEngine.intent;
  const normalizedQuery = input.intentEngine.normalizedQuery || normalizeShoppingQuery("");
  const blob = productTextBlob(input.product, normalizedQuery);
  const queryRelevance = queryListingRelevance01(input.intentEngine.rewrittenQuery || normalizedQuery, input.product);
  const reviews = input.product.reviewsCount ?? 0;
  const rating = ratingValue(input.product.rating);

  const relevance = scoreProductRelevance(blob, intent, queryRelevance);
  const useCase = scoreUseCaseMatch(blob, intent.useCase, reviews, rating);
  const budget = scoreBudgetMatch(input.product.price, intent, input.intentEngine.rewrite.budgetSensitive);
  const quality = scoreQualityMatch(blob, input.product.price, intent);
  const brand = scoreBrandMatch(blob, intent);

  const retrievalIntentScore = clampScore(
    relevance.score * 0.28 +
      useCase.score * 0.24 +
      budget.score * 0.18 +
      quality.score * 0.15 +
      brand.score * 0.15
  );

  const retrievalReasons = [
    ...relevance.reasons,
    ...useCase.reasons,
    ...budget.reasons,
    ...quality.reasons,
    ...brand.reasons,
  ].filter((reason, index, list) => list.indexOf(reason) === index);

  if (retrievalReasons.length === 0 && retrievalIntentScore >= 55) {
    retrievalReasons.push("✓ general intent alignment");
  }

  return {
    retrievalIntentScore,
    retrievalReasons,
  };
}
