/**
 * Phase 9.5 — Lightweight commerce preference intelligence (session + query only).
 * Small post-ranking nudges; no external APIs, no SerpAPI, no new storage.
 */

import { hardCategoryMismatch } from "@/lib/commerce/queryCategoryGuard";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import {
  EMPTY_COMMERCE_SESSION_MEMORY,
  type CommerceSessionMemoryV1,
} from "@/lib/intelligence/commerceSessionMemory";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { ExtractedSearchIntent } from "@/lib/search/intentExtractionEngine";
import type { QueryIntelligenceMeta } from "@/lib/search/phase94QueryIntelligence";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";

export type Phase95PriceTier = "premium" | "budget" | "value" | "balanced";

export type Phase95RetailerTrustPreference = "trusted_first" | "balanced" | "deal_first";

export type Phase95PreferenceSignals = {
  preferredBrand: string | null;
  preferredCategory: string | null;
  priceTier: Phase95PriceTier;
  retailerTrustPreference: Phase95RetailerTrustPreference;
  productType: string | null;
  premiumIntent01: number;
  budgetIntent01: number;
  repeatedQueryFamily: string | null;
  sessionBrandHits: string[];
  sessionCategoryHits: string[];
};

export type Phase95AppliedAdjustment = {
  link: string;
  store: string;
  boost: number;
  reason: string;
};

export type Phase95CommerceMemoryMeta = {
  version: "phase9.5-v1";
  preferenceSignals: Phase95PreferenceSignals;
  inferredPriceTier: Phase95PriceTier;
  inferredBrandAffinity: string | null;
  inferredCategoryAffinity: string | null;
  confidence: number;
  appliedAdjustments: Phase95AppliedAdjustment[];
};

const AGGREGATOR_RX =
  /\b(fruugo|ubuy|wish|temu|aliexpress|dhgate|banggood|alibaba|joom|lightinthebox)\b/i;
const LOW_TRUST = 55;
const HIGH_TRUST = 78;
const MAX_BOOST = 2.4;
const MIN_CONFIDENCE_FOR_BRIEF = 0.72;

const QUERY_FAMILIES: { rx: RegExp; family: string }[] = [
  { rx: /\b(laptop|macbook|notebook|ultrabook)\b/i, family: "laptop" },
  { rx: /\b(headphone|headset|earbuds|airpods|wh-1000)\b/i, family: "audio" },
  { rx: /\b(monitor|display|screen)\b/i, family: "monitor" },
  { rx: /\b(gpu|graphics\s+card|rtx|geforce)\b/i, family: "gpu" },
  { rx: /\b(running\s+shoe|sneaker|trainer)\b/i, family: "footwear" },
  { rx: /\b(iphone|galaxy\s+s\d|pixel\s+\d|smartphone)\b/i, family: "phone" },
  { rx: /\b(standing\s+desk|desk\s+organizer|monitor\s+arm)\b/i, family: "desk_setup" },
];

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function titleHasBrand(title: string, brand: string): boolean {
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(title);
}

function detectQueryFamily(query: string, category: string | null): string | null {
  for (const { rx, family } of QUERY_FAMILIES) {
    if (rx.test(query)) return family;
  }
  if (category && category !== "unknown") return category;
  return null;
}

function inferPriceTier(args: {
  query: string;
  intent: ExtractedSearchIntent;
  canonical?: CanonicalQueryContract;
  queryIntelligence?: QueryIntelligenceMeta;
  session: CommerceSessionMemoryV1;
}): Phase95PriceTier {
  const qiPrice = args.queryIntelligence?.detectedIntent.priceIntent;
  if (qiPrice === "premium") return "premium";
  if (qiPrice === "discount" || qiPrice === "budget") return "budget";
  if (qiPrice === "value") return "value";

  if (args.intent.budgetConstraints.maxPrice != null || args.canonical?.budget.active) return "budget";
  if (
    args.intent.budgetConstraints.bestValue ||
    args.canonical?.intent.primary === "best_value" ||
    args.canonical?.intent.primary === "cheapest_trusted"
  ) {
    return "value";
  }
  if (
    (args.canonical?.intent.premium01 ?? 0) >= 0.56 ||
    args.canonical?.intent.primary === "premium" ||
    /\b(premium|luxury|flagship|pro\s+max)\b/i.test(args.query)
  ) {
    return "premium";
  }
  if (args.session.priceComfortCenter > 0 && args.session.priceComfortSamples >= 2) {
    if (args.session.priceComfortCenter >= 650) return "premium";
    if (args.session.priceComfortCenter <= 180) return "budget";
  }
  return "balanced";
}

function inferRetailerTrustPreference(
  priceTier: Phase95PriceTier,
  session: CommerceSessionMemoryV1
): Phase95RetailerTrustPreference {
  if (session.styleTags.some((t) => /trusted|authentic|official/i.test(t))) return "trusted_first";
  if (priceTier === "budget" || priceTier === "value") return "deal_first";
  if (priceTier === "premium") return "trusted_first";
  return "balanced";
}

export function inferPhase95Preferences(args: {
  query: string;
  intent: ExtractedSearchIntent;
  canonical?: CanonicalQueryContract;
  queryIntelligence?: QueryIntelligenceMeta;
  session?: CommerceSessionMemoryV1;
}): { signals: Phase95PreferenceSignals; confidence: number } {
  const session = args.session ?? EMPTY_COMMERCE_SESSION_MEMORY;
  const category =
    args.canonical?.category && args.canonical.category !== "unknown"
      ? args.canonical.category
      : args.intent.category !== "unknown"
        ? args.intent.category
        : null;

  const queryBrand =
    args.canonical?.brand ??
    args.queryIntelligence?.detectedIntent.brand ??
    args.intent.brand ??
    null;

  const sessionBrandHits = session.preferredBrands.filter(
    (b) => queryBrand === b || new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(args.query)
  );
  const preferredBrand = queryBrand ?? sessionBrandHits[0] ?? session.preferredBrands[0] ?? null;

  const sessionCategoryHits = Object.entries(session.categoryAffinity)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => slug);
  const preferredCategory = category ?? sessionCategoryHits[0] ?? null;

  const priceTier = inferPriceTier({ ...args, session });
  const repeatedQueryFamily = detectQueryFamily(args.query, category);
  const familyRepeats = repeatedQueryFamily ? session.categoryAffinity[repeatedQueryFamily] ?? 0 : 0;

  const premiumIntent01 = clamp01(
    args.canonical?.intent.premium01 ??
      (priceTier === "premium" ? 0.72 : priceTier === "balanced" ? 0.42 : 0.18)
  );
  const budgetIntent01 = clamp01(
    args.canonical?.budget.intent01 ??
      (priceTier === "budget" ? 0.78 : priceTier === "value" ? 0.62 : 0.2)
  );

  let confidence = 0.34;
  if (preferredBrand) confidence += 0.14;
  if (preferredCategory) confidence += 0.1;
  if (priceTier !== "balanced") confidence += 0.1;
  if (session.interactionCount >= 2) confidence += 0.08;
  if (sessionBrandHits.length) confidence += 0.1;
  if (familyRepeats >= 2) confidence += 0.12;
  if (args.queryIntelligence && args.queryIntelligence.confidence >= 0.55) confidence += 0.06;

  return {
    signals: {
      preferredBrand,
      preferredCategory,
      priceTier,
      retailerTrustPreference: inferRetailerTrustPreference(priceTier, session),
      productType:
        args.intent.productType !== "unknown" ? args.intent.productType : args.canonical?.productType ?? null,
      premiumIntent01,
      budgetIntent01,
      repeatedQueryFamily: familyRepeats >= 2 ? repeatedQueryFamily : null,
      sessionBrandHits: sessionBrandHits.slice(0, 4),
      sessionCategoryHits: sessionCategoryHits.slice(0, 4),
    },
    confidence: clamp01(confidence),
  };
}

function isExactSkuContext(
  canonical?: CanonicalQueryContract,
  queryIntelligence?: QueryIntelligenceMeta
): boolean {
  if (queryIntelligence?.detectedIntent.skuIntent === "exact") return true;
  if (canonical?.marketMode === "exact_sku") return true;
  return false;
}

function computePreferenceBoost(
  product: QuantProduct,
  query: string,
  signals: Phase95PreferenceSignals,
  confidence: number
): Phase95AppliedAdjustment | null {
  if (confidence < 0.45) return null;
  if (hardCategoryMismatch(query, product.title)) return null;

  const trust = getStoreTrustScore(product.store);
  if (trust < LOW_TRUST || AGGREGATOR_RX.test(product.store)) return null;

  let boost = 0;
  const reasons: string[] = [];

  if (signals.preferredBrand && titleHasBrand(product.title, signals.preferredBrand)) {
    boost += 0.9 * confidence;
    reasons.push("brand_affinity");
  }

  if (signals.repeatedQueryFamily && product.qiCategory === signals.repeatedQueryFamily) {
    boost += 0.55 * confidence;
    reasons.push("repeated_category");
  } else if (signals.preferredCategory && product.qiCategory === signals.preferredCategory) {
    boost += 0.45 * confidence;
    reasons.push("category_affinity");
  }

  if (signals.retailerTrustPreference === "trusted_first" && trust >= HIGH_TRUST) {
    boost += 0.35 * confidence;
    reasons.push("trusted_retailer");
  }

  if (signals.priceTier === "premium" && product.price >= 350 && trust >= 68) {
    boost += 0.25 * confidence;
    reasons.push("premium_tier");
  } else if (signals.priceTier === "budget" && product.price > 0 && product.price <= 180) {
    boost += 0.2 * confidence;
    reasons.push("budget_tier");
  } else if (signals.priceTier === "value" && trust >= 62) {
    boost += 0.15 * confidence;
    reasons.push("value_tier");
  }

  if (signals.sessionBrandHits.some((b) => titleHasBrand(product.title, b))) {
    boost += 0.35 * confidence;
    reasons.push("session_brand");
  }

  boost = Math.min(MAX_BOOST, boost);
  if (boost < 0.12 || !reasons.length) return null;

  return {
    link: product.link,
    store: product.store,
    boost: Math.round(boost * 100) / 100,
    reason: reasons.slice(0, 3).join("+"),
  };
}

function applyPreferenceRanking(
  products: QuantProduct[],
  query: string,
  signals: Phase95PreferenceSignals,
  confidence: number,
  lockTop1: boolean
): { products: QuantProduct[]; adjustments: Phase95AppliedAdjustment[] } {
  if (products.length < 2 || confidence < 0.45) {
    return { products, adjustments: [] };
  }

  const adjustments: Phase95AppliedAdjustment[] = [];
  const scored = products.map((p, index) => {
    const adj = computePreferenceBoost(p, query, signals, confidence);
    if (adj) adjustments.push(adj);
    return { p, index, boost: adj?.boost ?? 0 };
  });

  if (!adjustments.length) return { products, adjustments: [] };

  const sorted = [...scored].sort((a, b) => {
    const rankA = a.index - a.boost;
    const rankB = b.index - b.boost;
    if (Math.abs(rankA - rankB) > 0.001) return rankA - rankB;
    return a.index - b.index;
  });

  let reordered = sorted.map((x) => x.p);
  const originalTop = products[0]!;

  if (lockTop1 && reordered[0]?.link !== originalTop.link) {
    reordered = [originalTop, ...reordered.filter((p) => p.link !== originalTop.link)];
  }

  const newTopTrust = getStoreTrustScore(reordered[0]?.store ?? "");
  const oldTopTrust = getStoreTrustScore(originalTop.store);
  if (newTopTrust < LOW_TRUST && oldTopTrust >= HIGH_TRUST) {
    return { products, adjustments: [] };
  }

  if (lockTop1) {
    const lowTrustJump = reordered.slice(0, 2).some(
      (p, i) => i > 0 && getStoreTrustScore(p.store) < LOW_TRUST && AGGREGATOR_RX.test(p.store)
    );
    if (lowTrustJump && oldTopTrust >= HIGH_TRUST) {
      return { products, adjustments: [] };
    }
  }

  return {
    products: reordered.map((p, i) => ({ ...p, qiRank: i })),
    adjustments,
  };
}

function enhanceDecisionBrief(
  brief: DecisionBriefDTO | null,
  signals: Phase95PreferenceSignals,
  confidence: number
): DecisionBriefDTO | null {
  if (!brief || confidence < MIN_CONFIDENCE_FOR_BRIEF) return brief;

  const why = [...brief.why];
  const recTitle = brief.recommendation.title;

  if (
    signals.preferredBrand &&
    confidence >= 0.76 &&
    titleHasBrand(recTitle, signals.preferredBrand)
  ) {
    why.push(`Lines up with your ${capitalizeBrand(signals.preferredBrand)} preference in this category.`);
  } else if (signals.repeatedQueryFamily && confidence >= 0.78) {
    why.push("Consistent with your recent searches in this product family.");
  } else if (signals.priceTier === "premium" && confidence >= 0.78) {
    why.push("Matches your premium shopping preference.");
  } else if (
    (signals.priceTier === "budget" || signals.priceTier === "value") &&
    confidence >= 0.78
  ) {
    why.push("Aligned with your value-focused shopping preference.");
  } else if (signals.retailerTrustPreference === "trusted_first" && confidence >= 0.8) {
    const trust = getStoreTrustScore(brief.recommendation.store);
    if (trust >= HIGH_TRUST) {
      why.push("From a retailer that fits your trust preference.");
    }
  }

  return { ...brief, why: why.slice(0, 6) };
}

function capitalizeBrand(brand: string): string {
  if (brand.length <= 3) return brand.toUpperCase();
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export function applyPhase95CommerceMemory(
  products: QuantProduct[],
  query: string,
  options: {
    canonicalQuery?: CanonicalQueryContract;
    sessionMemory?: CommerceSessionMemoryV1;
    queryIntelligence?: QueryIntelligenceMeta;
    intent: ExtractedSearchIntent;
    decisionBrief: DecisionBriefDTO | null;
  }
): {
  products: QuantProduct[];
  meta: Phase95CommerceMemoryMeta;
  decisionBrief: DecisionBriefDTO | null;
} {
  const session = options.sessionMemory ?? EMPTY_COMMERCE_SESSION_MEMORY;
  const { signals, confidence } = inferPhase95Preferences({
    query,
    intent: options.intent,
    canonical: options.canonicalQuery,
    queryIntelligence: options.queryIntelligence,
    session,
  });

  const lockTop1 = isExactSkuContext(options.canonicalQuery, options.queryIntelligence);
  const ranked =
    products.length > 0
      ? applyPreferenceRanking(products, query, signals, confidence, lockTop1)
      : { products, adjustments: [] as Phase95AppliedAdjustment[] };

  const meta: Phase95CommerceMemoryMeta = {
    version: "phase9.5-v1",
    preferenceSignals: signals,
    inferredPriceTier: signals.priceTier,
    inferredBrandAffinity: signals.preferredBrand,
    inferredCategoryAffinity: signals.preferredCategory,
    confidence: Math.round(confidence * 1000) / 1000,
    appliedAdjustments: ranked.adjustments.slice(0, 8),
  };

  const decisionBrief = enhanceDecisionBrief(options.decisionBrief, signals, confidence);

  return {
    products: ranked.products.length ? ranked.products : products,
    meta,
    decisionBrief,
  };
}
