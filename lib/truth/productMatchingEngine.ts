/**
 * Phase 2C — Product matching intelligence layer.
 * Deep attribute matching between listing signals and Phase 2A IntentSnapshot.
 */

import type { IntentEngineSnapshot, IntentSnapshot } from "@/lib/truth/intentIntelligenceEngine";
import { normalizeShoppingQuery } from "@/lib/truth/intentIntelligenceEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { queryListingRelevance01 } from "@/lib/intelligence/queryRelevance";
import { ratingValue } from "@/lib/shoppingScore";

export type ProductMatchSnapshot = {
  intentMatchScore: number;
  budgetMatchScore: number;
  qualityMatchScore: number;
  brandMatchScore: number;
  useCaseMatchScore: number;
  overallMatchScore: number;
  strongestMatchReason: string;
  strongestMismatchReason: string;
};

export type ProductMatchingInput = {
  product: QuantProduct;
  intentEngine: IntentEngineSnapshot;
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

const USE_CASE_SIGNALS: Record<string, { positive: { rx: RegExp; reason: string; weight: number }[]; negative: { rx: RegExp; reason: string; weight: number }[] }> = {
  gaming: {
    positive: [
      { rx: /\b(rtx|gtx|geforce|radeon|rx\s*\d|gpu|graphics)\b/i, reason: "Gaming GPU present", weight: 92 },
      { rx: /\b(144hz|165hz|240hz|360hz|high\s*refresh)\b/i, reason: "High refresh display", weight: 86 },
      { rx: /\b(gaming|gamer|esports|legion|rog|omen|predator)\b/i, reason: "Gaming product positioning", weight: 80 },
    ],
    negative: [{ rx: /\b(chromebook|office\s+only|basic\s+use)\b/i, reason: "Weak gaming hardware profile", weight: 84 }],
  },
  travel: {
    positive: [
      { rx: /\btravel\s+camera\b/i, reason: "Travel camera positioning", weight: 90 },
      { rx: /\b(travel|compact|portable|lightweight|mirrorless|zoom\s+lens)\b/i, reason: "Travel-friendly product profile", weight: 88 },
      { rx: /\b(battery|long\s+life|carry)\b/i, reason: "Portable usage attributes", weight: 76 },
    ],
    negative: [{ rx: /\b(studio|desktop|heavy|bulk)\b/i, reason: "Bulky for travel intent", weight: 82 }],
  },
  "video editing": {
    positive: [
      { rx: /\b(m1|m2|m3|m4|core\s*i[79]|ryzen\s*[79]|32gb|64gb|creator|studio)\b/i, reason: "Editing-grade performance specs", weight: 90 },
      { rx: /\b(oled|color\s+accurate|premiere|davinci|4k\s+edit)\b/i, reason: "Creator workflow attributes", weight: 84 },
    ],
    negative: [{ rx: /\b(entry\s+level|celeron|4gb\s+ram)\b/i, reason: "Underpowered for editing intent", weight: 86 }],
  },
  productivity: {
    positive: [
      { rx: /\b(ultrabook|thinkpad|macbook|office|business|productivity)\b/i, reason: "Productivity-oriented listing", weight: 82 },
    ],
    negative: [{ rx: /\b(toy|kids|novelty)\b/i, reason: "Not work-oriented", weight: 78 }],
  },
  photography: {
    positive: [
      { rx: /\b(dslr|mirrorless|full\s*frame|aps-c|sensor|lens|megapixel|mp)\b/i, reason: "Photography hardware attributes", weight: 88 },
      { rx: /\b(pro|professional|creator|vlog)\b/i, reason: "Professional photography positioning", weight: 80 },
    ],
    negative: [{ rx: /\b(webcam|doorbell|toy\s+camera)\b/i, reason: "Not a photography product", weight: 84 }],
  },
  student: {
    positive: [{ rx: /\b(student|school|budget|value|chromebook|affordable)\b/i, reason: "Student value positioning", weight: 78 }],
    negative: [{ rx: /\b(enterprise|workstation|premium\s+only)\b/i, reason: "Too expensive for student intent", weight: 80 }],
  },
};

type MatchEvaluation = {
  score: number;
  matchReason: string | null;
  mismatchReason: string | null;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function productTextBlob(product: QuantProduct): string {
  return `${product.title} ${(product.extensions ?? []).join(" ")} ${product.shipping ?? ""}`.toLowerCase();
}

function evaluateIntentTypeMatch(blob: string, intent: IntentSnapshot, queryRelevance: number): MatchEvaluation {
  if (!intent.productType) {
    return {
      score: clampScore(50 + queryRelevance * 30),
      matchReason: queryRelevance >= 0.6 ? "Strong query relevance" : null,
      mismatchReason: queryRelevance < 0.35 ? "Weak product type alignment" : null,
    };
  }

  const rx = PRODUCT_TYPE_HINTS[intent.productType];
  if (rx?.test(blob)) {
    return {
      score: clampScore(78 + queryRelevance * 18),
      matchReason: `${intent.productType} type match`,
      mismatchReason: null,
    };
  }

  return {
    score: clampScore(22 + queryRelevance * 20),
    matchReason: null,
    mismatchReason: `Listing does not match ${intent.productType} intent`,
  };
}

function evaluateBudgetMatch(price: number, intent: IntentSnapshot, budgetSensitive: boolean): MatchEvaluation {
  if (!intent.budget || price <= 0) {
    if (intent.qualityLevel === "budget" || budgetSensitive) {
      return { score: 58, matchReason: "Budget-sensitive intent", mismatchReason: null };
    }
    return { score: 52, matchReason: null, mismatchReason: null };
  }

  if (price <= intent.budget) {
    const headroom = (intent.budget - price) / intent.budget;
    return {
      score: clampScore(74 + headroom * 22),
      matchReason: `Within ${intent.currency ?? "budget"} ${intent.budget} budget`,
      mismatchReason: null,
    };
  }

  const over = (price - intent.budget) / intent.budget;
  return {
    score: clampScore(Math.max(10, 42 - over * 36)),
    matchReason: null,
    mismatchReason: `Price exceeds ${intent.currency ?? "budget"} ${intent.budget} budget`,
  };
}

function evaluateQualityMatch(blob: string, price: number, intent: IntentSnapshot): MatchEvaluation {
  if (!intent.qualityLevel) return { score: 52, matchReason: null, mismatchReason: null };

  const premium = /\b(pro|max|ultra|premium|flagship|studio|professional|oled|powerful|قوي|احتراف)\b/i.test(blob);
  const budget = /\b(cheap|budget|refurb|renewed|clearance|value|رخيص|ارخص)\b/i.test(blob);

  switch (intent.qualityLevel) {
    case "budget":
      if (budget || (intent.budget != null && price > 0 && price <= intent.budget * 0.85)) {
        return { score: 82, matchReason: "Budget value positioning", mismatchReason: null };
      }
      if (premium) {
        return { score: 28, matchReason: null, mismatchReason: "Premium listing conflicts with budget intent" };
      }
      return { score: 56, matchReason: null, mismatchReason: null };
    case "best":
    case "premium":
    case "professional":
    case "powerful":
      if (premium) {
        return { score: 84, matchReason: `${intent.qualityLevel} quality attributes`, mismatchReason: null };
      }
      if (
        intent.qualityLevel === "professional" &&
        /\b(mirrorless|dslr|alpha|canon|nikon|fujifilm|sony\s*alpha)\b/i.test(blob)
      ) {
        return { score: 78, matchReason: "Professional camera attributes", mismatchReason: null };
      }
      if (budget) {
        return { score: 26, matchReason: null, mismatchReason: `Listing conflicts with ${intent.qualityLevel} intent` };
      }
      return { score: 58, matchReason: null, mismatchReason: null };
    default:
      return { score: 54, matchReason: null, mismatchReason: null };
  }
}

function evaluateBrandMatch(blob: string, intent: IntentSnapshot): MatchEvaluation {
  let score = 52;
  let matchReason: string | null = null;
  let mismatchReason: string | null = null;

  if (intent.preferredBrand) {
    const rx = BRAND_HINTS[intent.preferredBrand];
    if (rx?.test(blob)) {
      score = 88;
      matchReason = `Preferred brand ${intent.preferredBrand}`;
    } else {
      score = 24;
      mismatchReason = `Missing preferred brand ${intent.preferredBrand}`;
    }
  }

  for (const excluded of intent.excludedBrands) {
    const rx = BRAND_HINTS[excluded];
    if (rx?.test(blob)) {
      score = Math.min(score, 12);
      mismatchReason = `Excluded brand ${excluded} detected`;
    }
  }

  return { score: clampScore(score), matchReason, mismatchReason };
}

function evaluateUseCaseMatch(blob: string, useCase: string | null, reviews: number, rating: number): MatchEvaluation {
  if (!useCase) return { score: 52, matchReason: null, mismatchReason: null };

  const profile = USE_CASE_SIGNALS[useCase];
  if (!profile) return { score: 52, matchReason: null, mismatchReason: null };

  let score = 40;
  let matchReason: string | null = null;
  let mismatchReason: string | null = null;
  let bestMatchWeight = 0;
  let worstMismatchWeight = 0;

  for (const signal of profile.positive) {
    if (signal.rx.test(blob)) {
      score += 16;
      if (signal.weight >= bestMatchWeight) {
        bestMatchWeight = signal.weight;
        matchReason = signal.reason;
      }
    }
  }

  if (useCase === "gaming" && reviews >= 20 && rating >= 4) {
    score += 10;
    if (bestMatchWeight < 78) {
      matchReason = "Strong gaming review profile";
      bestMatchWeight = 78;
    }
  }

  for (const signal of profile.negative) {
    if (signal.rx.test(blob)) {
      score -= 24;
      if (signal.weight >= worstMismatchWeight) {
        worstMismatchWeight = signal.weight;
        mismatchReason = signal.reason;
      }
    }
  }

  return { score: clampScore(score), matchReason, mismatchReason };
}

function pickStrongestReason(evaluations: MatchEvaluation[], kind: "match" | "mismatch"): string {
  const key = kind === "match" ? "matchReason" : "mismatchReason";
  const fallback = kind === "match" ? "General intent alignment" : "No major mismatch detected";
  const ranked = evaluations
    .filter((item) => item[key])
    .sort((a, b) => (kind === "match" ? b.score - a.score : a.score - b.score));
  return ranked[0]?.[key] ?? fallback;
}

function computeOverallMatchScore(scores: {
  intentMatchScore: number;
  budgetMatchScore: number;
  qualityMatchScore: number;
  brandMatchScore: number;
  useCaseMatchScore: number;
}): number {
  return clampScore(
    scores.intentMatchScore * 0.24 +
      scores.budgetMatchScore * 0.18 +
      scores.qualityMatchScore * 0.16 +
      scores.brandMatchScore * 0.18 +
      scores.useCaseMatchScore * 0.24
  );
}

export function hasProductMatchSignal(snapshot: ProductMatchSnapshot | null | undefined): boolean {
  return Boolean(snapshot && snapshot.overallMatchScore >= 0);
}

/** Build deep product-intent match snapshot for one listing. */
export function buildProductMatchingEngine(input: ProductMatchingInput): ProductMatchSnapshot {
  const intent = input.intentEngine.intent;
  const normalizedQuery = input.intentEngine.normalizedQuery || normalizeShoppingQuery("");
  const blob = productTextBlob(input.product);
  const queryRelevance = queryListingRelevance01(input.intentEngine.rewrittenQuery || normalizedQuery, input.product);
  const reviews = input.product.reviewsCount ?? 0;
  const rating = ratingValue(input.product.rating);

  const intentEval = evaluateIntentTypeMatch(blob, intent, queryRelevance);
  const budgetEval = evaluateBudgetMatch(input.product.price, intent, input.intentEngine.rewrite.budgetSensitive);
  const qualityEval = evaluateQualityMatch(blob, input.product.price, intent);
  const brandEval = evaluateBrandMatch(blob, intent);
  const useCaseEval = evaluateUseCaseMatch(blob, intent.useCase, reviews, rating);

  const intentMatchScore = intentEval.score;
  const budgetMatchScore = budgetEval.score;
  const qualityMatchScore = qualityEval.score;
  const brandMatchScore = brandEval.score;
  const useCaseMatchScore = useCaseEval.score;
  const overallMatchScore = computeOverallMatchScore({
    intentMatchScore,
    budgetMatchScore,
    qualityMatchScore,
    brandMatchScore,
    useCaseMatchScore,
  });

  const evaluations = [intentEval, budgetEval, qualityEval, brandEval, useCaseEval];

  return {
    intentMatchScore,
    budgetMatchScore,
    qualityMatchScore,
    brandMatchScore,
    useCaseMatchScore,
    overallMatchScore,
    strongestMatchReason: pickStrongestReason(evaluations, "match"),
    strongestMismatchReason: pickStrongestReason(evaluations, "mismatch"),
  };
}
