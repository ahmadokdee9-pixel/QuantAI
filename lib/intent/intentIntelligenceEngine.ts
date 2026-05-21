/**
 * Phase 4.0 — Deterministic Intent Intelligence Engine (meta-first; no LLM hot path).
 * Composes canonical query + commerce intent signals into structured shopping intent dimensions.
 */

import type { CanonicalQueryContract, CanonicalQueryLanguage } from "@/lib/search/canonicalQuery";
import { buildCanonicalQuery } from "@/lib/search/canonicalQuery";
import type { SemanticProductCategory } from "@/lib/search/queryUnderstanding";
import { detectUnifiedQueryClass } from "@/lib/taste/unifiedTasteGates";
import {
  INTENT_INTELLIGENCE_META_VERSION,
  isIntentIntelligenceApplyEnabled,
  isIntentIntelligenceMetaEnabled,
} from "@/lib/intent/intentIntelligenceFlags";

export type IntentDimensionSlice = {
  active: boolean;
  strength: number;
  labels: string[];
};

export type IntentIntelligenceDetected = {
  product: IntentDimensionSlice & {
    productType: string | null;
    brand: string | null;
    model: string | null;
    variant: string | null;
  };
  category: IntentDimensionSlice & {
    category: SemanticProductCategory;
    marketMode: string;
    primaryIntent: string;
  };
  budget: IntentDimensionSlice & {
    maxPrice: number | null;
    qualityExpectation: string;
    dealSeeking: boolean;
  };
  taste: IntentDimensionSlice & {
    aestheticDirection: string;
    styleIntents: string[];
    unifiedQueryClass: string | null;
  };
  trust: IntentDimensionSlice & {
    trustedOnly: boolean;
    riskAvoidance: boolean;
    authenticitySensitive: boolean;
    deliveryCare: boolean;
  };
  urgencyComparison: IntentDimensionSlice & {
    urgency: boolean;
    comparison: boolean;
    alternativeSeeking: boolean;
    storeDealHunter: boolean;
  };
  emotional: IntentDimensionSlice & {
    giftOriented: boolean;
    emotionalLanguage: string[];
    safeBuyLanguage: boolean;
  };
};

export type IntentIntelligenceMeta = {
  version: typeof INTENT_INTELLIGENCE_META_VERSION;
  active: boolean;
  confidence: number;
  detectedIntents: IntentIntelligenceDetected;
  detectedIntentLabels: string[];
  languageProfile: CanonicalQueryLanguage;
  applyEnabled: boolean;
  skippedReason?: string;
  latencyMs: number;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function dim(active: boolean, strength: number, labels: string[]): IntentDimensionSlice {
  return {
    active,
    strength: clamp01(strength),
    labels: labels.filter(Boolean).slice(0, 8),
  };
}

function collectLabels(detected: IntentIntelligenceDetected): string[] {
  const out: string[] = [];
  for (const [key, slice] of Object.entries(detected)) {
    if (!slice.active) continue;
    out.push(key);
    out.push(...slice.labels);
  }
  return [...new Set(out.map((x) => x.trim()).filter(Boolean))].slice(0, 24);
}

function computeConfidence(
  detected: IntentIntelligenceDetected,
  categoryKnown: boolean,
  queryLen: number,
  envelope: string,
  hasNamedProduct: boolean,
  budgetMaxPrice: number | null
): number {
  const slices = [
    detected.product,
    detected.category,
    detected.budget,
    detected.taste,
    detected.trust,
    detected.urgencyComparison,
    detected.emotional,
  ];
  const active = slices.filter((s) => s.active);
  if (!active.length) return 0.12;
  const avgStrength = active.reduce((sum, s) => sum + s.strength, 0) / active.length;
  let confidence = clamp01(0.22 + active.length * 0.07 + avgStrength * 0.38);
  if (!categoryKnown) confidence *= 0.78;
  if (queryLen < 8) confidence *= 0.82;
  if (queryLen < 4) confidence *= 0.55;
  const isVague =
    /\b(something|anything|nice for|good for|stuff for|decent)\b/i.test(envelope) &&
    !hasNamedProduct &&
    !detected.product.active;
  if (isVague) confidence *= 0.62;
  if (budgetMaxPrice != null && detected.budget.active) confidence = clamp01(confidence + 0.05);
  if (detected.trust.active && detected.trust.strength >= 0.4) confidence = clamp01(confidence + 0.03);
  return Math.round(confidence * 1000) / 1000;
}

function buildDetectedIntents(canonicalQuery: CanonicalQueryContract): IntentIntelligenceDetected {
  const semantic = canonicalQuery.semantic;
  const commerce = canonicalQuery.commerceIntents;
  const envelope = semantic.envelope ?? canonicalQuery.originalQuery;
  const unifiedClass = detectUnifiedQueryClass(envelope);

  const productLabels: string[] = [];
  if (canonicalQuery.brand) productLabels.push(`brand:${canonicalQuery.brand}`);
  if (canonicalQuery.model) productLabels.push(`model:${canonicalQuery.model}`);
  if (canonicalQuery.variant) productLabels.push(`variant:${canonicalQuery.variant}`);
  const productStrength = clamp01(
    (canonicalQuery.model ? 0.72 : 0) +
      (canonicalQuery.brand ? 0.48 : 0) +
      (semantic.productPurpose.length ? 0.18 : 0) +
      (semantic.usageContext.length ? 0.12 : 0)
  );
  const product = {
    ...dim(productStrength >= 0.35, productStrength, productLabels),
    productType: canonicalQuery.productType !== "unknown" ? canonicalQuery.productType : null,
    brand: canonicalQuery.brand,
    model: canonicalQuery.model,
    variant: canonicalQuery.variant,
  };

  const categoryLabels = [canonicalQuery.category, canonicalQuery.intent.primary, canonicalQuery.marketMode].filter(
    (x) => x && x !== "unknown"
  );
  const categoryStrength = clamp01(
    (canonicalQuery.category !== "unknown" ? 0.62 : 0.14) +
      (canonicalQuery.intent.primary !== "general_search" ? 0.22 : 0) +
      (semantic.productCategory !== "unknown" ? 0.12 : 0)
  );
  const category = {
    ...dim(categoryStrength >= 0.35, categoryStrength, categoryLabels),
    category: canonicalQuery.category,
    marketMode: canonicalQuery.marketMode,
    primaryIntent: canonicalQuery.intent.primary,
  };

  const budgetLabels: string[] = [];
  if (canonicalQuery.budget.active) budgetLabels.push("budget_active");
  if (canonicalQuery.budget.maxPrice != null) budgetLabels.push(`max_price:${canonicalQuery.budget.maxPrice}`);
  if (commerce.dealHunter) budgetLabels.push("deal_hunter");
  if (commerce.explicitBestValue) budgetLabels.push("best_value");
  if (commerce.cheapestTrusted) budgetLabels.push("cheapest_trusted");
  if (/\bbest\b/i.test(envelope)) budgetLabels.push("best_seeking");
  const hasBestSeeking = /\bbest\b/i.test(envelope);
  const budgetStrength = clamp01(
    semantic.budgetIntent01 * 0.55 +
      (canonicalQuery.budget.active ? 0.28 : 0) +
      (commerce.dealHunter ? 0.18 : 0) +
      (commerce.explicitBestValue ? 0.22 : 0) +
      (hasBestSeeking ? 0.24 : 0) +
      (semantic.alternativeIntent.cheaper ? 0.14 : 0)
  );
  const budget = {
    ...dim(budgetStrength >= 0.32 || (hasBestSeeking && canonicalQuery.category !== "unknown"), Math.max(budgetStrength, hasBestSeeking ? 0.36 : 0), budgetLabels),
    maxPrice: canonicalQuery.budget.maxPrice,
    qualityExpectation: semantic.qualityExpectation,
    dealSeeking: commerce.dealHunter || commerce.explicitBestValue || commerce.cheapestTrusted,
  };

  const tasteLabels = [...semantic.styleIntent];
  if (semantic.aestheticDirection !== "neutral") tasteLabels.push(semantic.aestheticDirection);
  if (unifiedClass) tasteLabels.push(`unified:${unifiedClass}`);
  if (commerce.minimalistStyle) tasteLabels.push("minimalist");
  if (commerce.quietLuxury || commerce.luxury) tasteLabels.push("luxury");
  if (commerce.aestheticPremium) tasteLabels.push("aesthetic_premium");
  const tasteStrength = clamp01(
    (semantic.aestheticDirection !== "neutral" ? 0.38 : 0.08) +
      semantic.premiumIntent01 * 0.28 +
      (commerce.taste.hasTasteLayer ? 0.22 : 0) +
      (unifiedClass ? 0.18 : 0) +
      (semantic.styleIntent.length ? Math.min(0.2, semantic.styleIntent.length * 0.06) : 0)
  );
  const taste = {
    ...dim(tasteStrength >= 0.3, tasteStrength, tasteLabels),
    aestheticDirection: semantic.aestheticDirection,
    styleIntents: semantic.styleIntent.slice(0, 8),
    unifiedQueryClass: unifiedClass,
  };

  const trustLabels: string[] = [];
  if (commerce.trustedOnly) trustLabels.push("trusted_only");
  if (commerce.riskAvoidance) trustLabels.push("risk_avoidance");
  if (commerce.deliveryCare) trustLabels.push("delivery_care");
  if (commerce.realDiscountOnly) trustLabels.push("real_discount_only");
  if (/\b(authentic|genuine|original|sealed|official|موثوق|اصل|أصلي|اصلي|آمن)\b/i.test(envelope)) {
    trustLabels.push("authenticity_language");
  }
  const authenticitySensitive =
    commerce.trustedOnly ||
    commerce.riskAvoidance ||
    /\b(authentic|genuine|original|official|trusted|reputable|موثوق|اصل|أصلي|اصلي)\b/i.test(envelope);
  const trustStrength = clamp01(
    (commerce.trustedOnly ? 0.42 : 0) +
      (commerce.riskAvoidance ? 0.38 : 0) +
      (commerce.deliveryCare ? 0.22 : 0) +
      (authenticitySensitive ? 0.2 : 0)
  );
  const trust = {
    ...dim(trustStrength >= 0.28, trustStrength, trustLabels),
    trustedOnly: commerce.trustedOnly,
    riskAvoidance: commerce.riskAvoidance,
    authenticitySensitive,
    deliveryCare: commerce.deliveryCare,
  };

  const urgencyLabels: string[] = [];
  if (semantic.urgency01 >= 0.4) urgencyLabels.push("urgency");
  if (semantic.comparisonIntent || commerce.comparisonIntent) urgencyLabels.push("comparison");
  if (commerce.alternativeSeeking || semantic.alternativeIntent.active) urgencyLabels.push("alternative");
  if (commerce.storeDealHunter) urgencyLabels.push("store_deal_hunter");
  if (commerce.buyNowUrgency) urgencyLabels.push("buy_now");
  const urgencyStrength = clamp01(
    semantic.urgency01 * 0.45 +
      (semantic.comparisonIntent || commerce.comparisonIntent ? 0.32 : 0) +
      (commerce.alternativeSeeking || semantic.alternativeIntent.active ? 0.28 : 0) +
      (commerce.storeDealHunter ? 0.18 : 0) +
      (commerce.buyNowUrgency ? 0.24 : 0)
  );
  const urgencyComparison = {
    ...dim(urgencyStrength >= 0.28, urgencyStrength, urgencyLabels),
    urgency: semantic.urgency01 >= 0.4 || commerce.buyNowUrgency,
    comparison: semantic.comparisonIntent || commerce.comparisonIntent,
    alternativeSeeking: commerce.alternativeSeeking || semantic.alternativeIntent.active,
    storeDealHunter: commerce.storeDealHunter,
  };

  const emotionalLabels: string[] = [];
  if (commerce.giftUse) emotionalLabels.push("gift");
  if (/\b(treat myself|special occasion|worth it|safe buy|no regret|هدية|فخم|مميز)\b/i.test(envelope)) {
    emotionalLabels.push("emotional_buy");
  }
  if (semantic.emotionalIntent01 >= 0.45) emotionalLabels.push("emotional_strength");
  const emotionalStrength = clamp01(
    semantic.emotionalIntent01 * 0.62 +
      (commerce.giftUse ? 0.28 : 0) +
      (semantic.premiumIntent01 >= 0.5 && semantic.budgetIntent01 >= 0.45 ? 0.14 : 0)
  );
  const emotional = {
    ...dim(emotionalStrength >= 0.28, emotionalStrength, emotionalLabels),
    giftOriented: commerce.giftUse || /\b(gift|present|هدية)\b/i.test(envelope),
    emotionalLanguage: emotionalLabels,
    safeBuyLanguage: /\b(safe buy|worth the money|no regret|worth it|موثوق|آمن)\b/i.test(envelope),
  };

  return { product, category, budget, taste, trust, urgencyComparison, emotional };
}

export function computeIntentIntelligence(args: {
  query: string;
  canonicalQuery?: CanonicalQueryContract;
}): IntentIntelligenceMeta {
  const started = Date.now();
  const query = args.query.trim();
  const applyEnabled = isIntentIntelligenceApplyEnabled();

  if (!isIntentIntelligenceMetaEnabled()) {
    return {
      version: INTENT_INTELLIGENCE_META_VERSION,
      active: false,
      confidence: 0,
      detectedIntents: inactiveDetected(),
      detectedIntentLabels: [],
      languageProfile: "unknown",
      applyEnabled,
      skippedReason: "intent_intelligence_disabled",
      latencyMs: Date.now() - started,
    };
  }

  if (!query) {
    return {
      version: INTENT_INTELLIGENCE_META_VERSION,
      active: false,
      confidence: 0,
      detectedIntents: inactiveDetected(),
      detectedIntentLabels: [],
      languageProfile: "unknown",
      applyEnabled,
      skippedReason: "query_empty",
      latencyMs: Date.now() - started,
    };
  }

  if (query.length < 2) {
    return {
      version: INTENT_INTELLIGENCE_META_VERSION,
      active: false,
      confidence: 0,
      detectedIntents: inactiveDetected(),
      detectedIntentLabels: [],
      languageProfile: "unknown",
      applyEnabled,
      skippedReason: "query_too_short",
      latencyMs: Date.now() - started,
    };
  }

  const canonicalQuery = args.canonicalQuery ?? buildCanonicalQuery(query);
  const detectedIntents = buildDetectedIntents(canonicalQuery);
  const detectedIntentLabels = collectLabels(detectedIntents);
  const confidence = computeConfidence(
    detectedIntents,
    canonicalQuery.category !== "unknown",
    query.length,
    canonicalQuery.semantic.envelope ?? query,
    Boolean(canonicalQuery.brand || canonicalQuery.model),
    canonicalQuery.budget.maxPrice
  );

  return {
    version: INTENT_INTELLIGENCE_META_VERSION,
    active: true,
    confidence,
    detectedIntents,
    detectedIntentLabels,
    languageProfile: canonicalQuery.language,
    applyEnabled,
    latencyMs: Date.now() - started,
  };
}

function inactiveDetected(): IntentIntelligenceDetected {
  const empty = dim(false, 0, []);
  return {
    product: { ...empty, productType: null, brand: null, model: null, variant: null },
    category: { ...empty, category: "unknown", marketMode: "broad_discovery", primaryIntent: "general_search" },
    budget: { ...empty, maxPrice: null, qualityExpectation: "balanced", dealSeeking: false },
    taste: { ...empty, aestheticDirection: "neutral", styleIntents: [], unifiedQueryClass: null },
    trust: { ...empty, trustedOnly: false, riskAvoidance: false, authenticitySensitive: false, deliveryCare: false },
    urgencyComparison: {
      ...empty,
      urgency: false,
      comparison: false,
      alternativeSeeking: false,
      storeDealHunter: false,
    },
    emotional: { ...empty, giftOriented: false, emotionalLanguage: [], safeBuyLanguage: false },
  };
}

export { isIntentIntelligenceMetaEnabled, isIntentIntelligenceApplyEnabled };
