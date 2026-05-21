/**
 * Phase 4.1 — Bounded intent-to-ranking bridge (low-risk dimensions only).
 * Applies trust, budget, comparison, and urgency suppression — never taste/emotional.
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { QuantProduct } from "@/lib/shoppingScore";
import { assessStructuredProductIdentity } from "@/lib/intelligence/productIdentity";
import type { IntentIntelligenceMeta } from "@/lib/intent/intentIntelligenceEngine";
import { computeIntentIntelligence } from "@/lib/intent/intentIntelligenceEngine";
import {
  INTENT_APPLY_CONFIDENCE_MIN,
  INTENT_APPLY_COHERENCE_MIN,
  INTENT_APPLY_MAX_DELTA,
  INTENT_APPLY_PRESTIGE_MIN,
  INTENT_APPLY_VERSION,
  isIntentIntelligenceApplyEnabled,
} from "@/lib/intent/intentIntelligenceFlags";
import { getMarketplaceSellerRiskTier, getStoreTrustScore } from "@/lib/retailTrust";
import { computeUnifiedTasteSignals } from "@/lib/taste/unifiedTasteIdentity";
import { unifiedListingHardSuppressed } from "@/lib/taste/unifiedTasteGates";

export type IntentApplyDimension = "trust" | "budget" | "comparison" | "urgency";

export type IntentApplyMeta = {
  version: typeof INTENT_APPLY_VERSION;
  applied: boolean;
  applyEnabled: boolean;
  dimensionsUsed: IntentApplyDimension[];
  deltaApplied: number;
  suppressionEvents: number;
  driftCount: number;
  integrityPass: boolean;
  latencyMs: number;
  skippedReason?: string;
};

const INTENT_SUPPRESSION_RX =
  /\b(fake discount|inflated price|was \$|was £|was €|90% off|clearance scam|only 2 left|hurry buy|selling fast|almost gone|limited stock act now|hot deal must buy|must have today|flash sale ends|countdown deal)\b/i;

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function listingText(product: QuantProduct): string {
  return `${product.title} ${product.store} ${Array.isArray(product.extensions) ? product.extensions.join(" ") : ""}`.toLowerCase();
}

export function intentListingHardSuppressed(
  product: QuantProduct,
  intent: IntentIntelligenceMeta,
  canonicalQuery?: CanonicalQueryContract
): boolean {
  const text = listingText(product);
  if (INTENT_SUPPRESSION_RX.test(text)) return true;
  if (getMarketplaceSellerRiskTier(product.store, product.title) === "high") return true;
  if (/\b(inspired by|dupe|clone|replica|fake)\b/i.test(text)) return true;
  if (intent.detectedIntents.trust.active && unifiedListingHardSuppressed(product.title, [])) return true;
  if (canonicalQuery?.budget.maxPrice != null && product.price > canonicalQuery.budget.maxPrice * 1.35) {
    if (/\b(too good to be true|90% off|was \$|was £)\b/i.test(text)) return true;
  }
  return false;
}

function hasApplicableLowRiskDimension(intent: IntentIntelligenceMeta): boolean {
  const { trust, budget, urgencyComparison } = intent.detectedIntents;
  return (
    trust.active ||
    budget.active ||
    urgencyComparison.comparison ||
    urgencyComparison.urgency ||
    urgencyComparison.alternativeSeeking ||
    urgencyComparison.storeDealHunter
  );
}

function tasteOrEmotionalOnly(intent: IntentIntelligenceMeta): boolean {
  const { taste, emotional, trust, budget, urgencyComparison } = intent.detectedIntents;
  const lowRisk = hasApplicableLowRiskDimension(intent);
  return (taste.active || emotional.active) && !lowRisk;
}

export function isIntentApplyEligible(args: {
  intent: IntentIntelligenceMeta;
  canonicalQuery: CanonicalQueryContract;
  products?: QuantProduct[];
}): { eligible: boolean; integrityPass: boolean; skippedReason?: string } {
  const { intent, canonicalQuery, products = [] } = args;

  if (!isIntentIntelligenceApplyEnabled()) {
    return { eligible: false, integrityPass: true, skippedReason: "apply_disabled" };
  }
  if (!intent.active) {
    return { eligible: false, integrityPass: true, skippedReason: "intent_inactive" };
  }
  if (intent.confidence < INTENT_APPLY_CONFIDENCE_MIN) {
    return { eligible: false, integrityPass: true, skippedReason: "low_confidence" };
  }
  if (canonicalQuery.category === "unknown") {
    return { eligible: false, integrityPass: true, skippedReason: "no_category_coherence" };
  }
  if (tasteOrEmotionalOnly(intent)) {
    return { eligible: false, integrityPass: true, skippedReason: "taste_emotional_only_blocked" };
  }
  if (!hasApplicableLowRiskDimension(intent)) {
    return { eligible: false, integrityPass: true, skippedReason: "no_low_risk_dimension" };
  }

  const signals = computeUnifiedTasteSignals({
    query: canonicalQuery.originalQuery,
    canonicalQuery,
    products,
  });
  if (signals.meta.active) {
    if (signals.meta.coherenceScore < INTENT_APPLY_COHERENCE_MIN) {
      return { eligible: false, integrityPass: false, skippedReason: "low_institutional_coherence" };
    }
    if (signals.meta.prestigeIntegrity < INTENT_APPLY_PRESTIGE_MIN) {
      return { eligible: false, integrityPass: false, skippedReason: "prestige_integrity_fail" };
    }
  }

  const integrityPass = signals.meta.active
    ? signals.meta.coherenceScore >= INTENT_APPLY_COHERENCE_MIN &&
      signals.meta.prestigeIntegrity >= INTENT_APPLY_PRESTIGE_MIN
    : true;

  if (!integrityPass) {
    return { eligible: false, integrityPass: false, skippedReason: "institutional_integrity_fail" };
  }

  return { eligible: true, integrityPass: true };
}

export function computeIntentApplyDelta(args: {
  product: QuantProduct;
  canonicalQuery: CanonicalQueryContract;
  intent: IntentIntelligenceMeta;
  medianPrice: number;
  products?: QuantProduct[];
}): { delta: number; dimensionsUsed: IntentApplyDimension[]; suppressed: boolean } {
  const { product, canonicalQuery, intent, medianPrice, products = [] } = args;
  const eligibility = isIntentApplyEligible({ intent, canonicalQuery, products });
  if (!eligibility.eligible) {
    return { delta: 0, dimensionsUsed: [], suppressed: false };
  }

  const suppressed = intentListingHardSuppressed(product, intent, canonicalQuery);
  if (suppressed) {
    return { delta: -INTENT_APPLY_MAX_DELTA, dimensionsUsed: ["trust"], suppressed: true };
  }

  const { trust, budget, urgencyComparison } = intent.detectedIntents;
  const dimensionsUsed: IntentApplyDimension[] = [];
  let delta = 0;

  if (trust.active) {
    dimensionsUsed.push("trust");
    const storeTrust = getStoreTrustScore(product.store);
    const risk = getMarketplaceSellerRiskTier(product.store, product.title);
    if (risk === "high" || storeTrust < 52) {
      delta -= INTENT_APPLY_MAX_DELTA;
    } else if (trust.riskAvoidance && risk === "medium") {
      delta -= 2;
    } else if (storeTrust >= 82 && (trust.trustedOnly || trust.authenticitySensitive)) {
      delta += 2;
    } else if (storeTrust >= 70) {
      delta += 1;
    }
  }

  if (budget.active && delta > -INTENT_APPLY_MAX_DELTA) {
    dimensionsUsed.push("budget");
    const maxPrice = canonicalQuery.budget.maxPrice ?? budget.maxPrice;
    if (maxPrice != null && product.price > 0) {
      if (product.price <= maxPrice * 0.98) delta += 2;
      else if (product.price > maxPrice * 1.08) delta -= 2;
    } else if (medianPrice > 0 && product.price > 0 && budget.dealSeeking) {
      const under = (medianPrice - product.price) / medianPrice;
      if (under > 0.08) delta += 1.5;
      else if (under < -0.15) delta -= 1;
    }
  }

  if (
    (urgencyComparison.comparison || urgencyComparison.alternativeSeeking) &&
    delta > -INTENT_APPLY_MAX_DELTA
  ) {
    dimensionsUsed.push("comparison");
    const structured = assessStructuredProductIdentity({ product, canonicalQuery });
    if (structured.relation === "exact_product") delta += 2;
    else if (structured.relation === "same_product_family" || structured.relation === "variant") delta += 1.5;
    else if (structured.relation === "compatible_item" || structured.relation === "wrong_product") delta -= 2;
  }

  if (urgencyComparison.urgency && delta > -INTENT_APPLY_MAX_DELTA) {
    dimensionsUsed.push("urgency");
    const text = listingText(product);
    if (INTENT_SUPPRESSION_RX.test(text)) {
      delta -= INTENT_APPLY_MAX_DELTA;
    }
  }

  const uniqueDims = [...new Set(dimensionsUsed)] as IntentApplyDimension[];
  return {
    delta: clamp(Math.round(delta * 10) / 10, -INTENT_APPLY_MAX_DELTA, INTENT_APPLY_MAX_DELTA),
    dimensionsUsed: uniqueDims,
    suppressed: false,
  };
}

/** Stable partition: intent-suppressed listings sink when apply gates pass. */
export function stabilizeIntentHardSuppressionOrder(args: {
  query: string;
  canonicalQuery: CanonicalQueryContract;
  products: QuantProduct[];
  intent: IntentIntelligenceMeta;
}): QuantProduct[] {
  const { canonicalQuery, products, intent } = args;
  if (!isIntentIntelligenceApplyEnabled() || products.length <= 1) return products;

  const eligibility = isIntentApplyEligible({ intent, canonicalQuery, products });
  if (!eligibility.eligible) return products;

  const clean: QuantProduct[] = [];
  const suppressed: QuantProduct[] = [];
  for (const p of products) {
    if (intentListingHardSuppressed(p, intent, canonicalQuery)) suppressed.push(p);
    else clean.push(p);
  }
  if (!suppressed.length) return products;
  return [...clean, ...suppressed].map((p, i) => ({ ...p, qiRank: i }));
}

export function buildIntentApplyMeta(args: {
  query: string;
  canonicalQuery: CanonicalQueryContract;
  products: QuantProduct[];
  preOrderLinks?: string[];
}): IntentApplyMeta {
  const started = Date.now();
  const { query, canonicalQuery, products, preOrderLinks = [] } = args;
  const applyEnabled = isIntentIntelligenceApplyEnabled();
  const intent = computeIntentIntelligence({ query, canonicalQuery });
  const eligibility = isIntentApplyEligible({ intent, canonicalQuery, products });

  if (!eligibility.eligible) {
    return {
      version: INTENT_APPLY_VERSION,
      applied: false,
      applyEnabled,
      dimensionsUsed: [],
      deltaApplied: 0,
      suppressionEvents: 0,
      driftCount: 0,
      integrityPass: eligibility.integrityPass,
      latencyMs: Date.now() - started,
      skippedReason: eligibility.skippedReason,
    };
  }

  const prices = products.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b);
  const medianPrice = prices[Math.floor(prices.length / 2)] ?? 0;

  const top = products.slice(0, 5);
  let deltaMax = 0;
  let suppressionEvents = 0;
  const dimensionsUsed = new Set<IntentApplyDimension>();

  for (const p of top) {
    const result = computeIntentApplyDelta({ product: p, canonicalQuery, intent, medianPrice });
    deltaMax = Math.max(deltaMax, Math.abs(result.delta));
    if (result.suppressed) suppressionEvents += 1;
    for (const d of result.dimensionsUsed) dimensionsUsed.add(d);
  }

  const postLinks = top.map((p) => p.link || p.title);
  const preLinks = preOrderLinks.slice(0, 5);
  let driftCount = 0;
  for (let i = 0; i < Math.min(preLinks.length, postLinks.length); i += 1) {
    if (preLinks[i] !== postLinks[i]) driftCount += 1;
  }

  return {
    version: INTENT_APPLY_VERSION,
    applied: true,
    applyEnabled,
    dimensionsUsed: [...dimensionsUsed],
    deltaApplied: deltaMax,
    suppressionEvents,
    driftCount,
    integrityPass: eligibility.integrityPass,
    latencyMs: Date.now() - started,
  };
}

export {
  INTENT_APPLY_MAX_DELTA,
  isIntentIntelligenceApplyEnabled,
};
