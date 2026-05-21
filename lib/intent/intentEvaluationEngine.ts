/**
 * P4.6 — Production intelligence evaluation & decision-quality analytics (meta-only).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { QuantProduct } from "@/lib/shoppingScore";
import { assessStructuredProductIdentity } from "@/lib/intelligence/productIdentity";
import type { IntentApplyMeta, IntentApplyDimension } from "@/lib/intent/intentApply";
import { computeIntentApplyDelta, intentListingHardSuppressed } from "@/lib/intent/intentApply";
import type { IntentCanaryMeta } from "@/lib/intent/intentCanaryController";
import type { IntentIntelligenceMeta } from "@/lib/intent/intentIntelligenceEngine";
import type { IntentObservabilityMeta } from "@/lib/intent/intentObservability";
import { INTENT_OBS_MAX_DRIFT } from "@/lib/intent/intentObservabilityFlags";
import type { IntentProductionApplyMeta } from "@/lib/intent/intentProductionApply";
import { INTENT_APPLY_CONFIDENCE_MIN, INTENT_APPLY_MAX_DELTA } from "@/lib/intent/intentIntelligenceFlags";
import { getMarketplaceSellerRiskTier, getStoreTrustScore } from "@/lib/retailTrust";
import {
  INTENT_EVALUATION_VERSION,
  isIntentEvaluationEnabled,
} from "@/lib/intent/intentEvaluationFlags";

export type IntentEvaluationDimensions = {
  trustQuality: number;
  rankingQuality: number;
  comparisonAccuracy: number;
  suppressionEffectiveness: number;
  budgetAlignment: number;
  merchantIntegrity: number;
  userIntentAlignment: number;
};

export type IntentProductionAnalytics = {
  baselineVsApplyDelta: number;
  rankingWinRate: number;
  trustedMerchantRetention: number;
  suppressionPrecision: number;
  driftQualityScore: number;
  canaryOutcomeScore: number;
};

export type IntentDecisionExplainability = {
  whyBoosted: string[];
  whySuppressed: string[];
  whyStable: string[];
  appliedDimensions: string[];
  skippedDimensions: string[];
  rollbackContext: string | null;
};

export type IntentQualityMonitors = {
  lowConfidenceApplyWarning: boolean;
  excessiveSuppressionWarning: boolean;
  trustMismatchWarning: boolean;
  unstableRankingWarning: boolean;
  merchantDiversityWarning: boolean;
};

export type IntentEvaluationAggregation = {
  topPerformingDimensions: string[];
  lowestQualityTrays: string[];
  driftHeatmap: Record<string, number>;
  suppressionClusters: string[];
  trustRiskPatterns: string[];
};

export type IntentEvaluationMeta = {
  version: typeof INTENT_EVALUATION_VERSION;
  active: boolean;
  dimensions: IntentEvaluationDimensions;
  analytics: IntentProductionAnalytics;
  explainability: IntentDecisionExplainability;
  monitors: IntentQualityMonitors;
  aggregation: IntentEvaluationAggregation;
  qualityScore: number;
  integrityScore: number;
  trustScore: number;
  stabilityScore: number;
  explanationCompleteness: number;
  latencyMs: number;
};

const ALL_APPLY_DIMENSIONS: IntentApplyDimension[] = ["trust", "budget", "comparison", "urgency"];

const RISK_RX = /\b(inspired by|dupe|clone|hurry buy|temu|only 2 left|fake discount)\b/i;

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function listingText(p: QuantProduct): string {
  return `${p.title} ${p.store}`.toLowerCase();
}

function isTrustedStore(store: string): boolean {
  return getStoreTrustScore(store) >= 70;
}

function isRiskListing(p: QuantProduct): boolean {
  return getMarketplaceSellerRiskTier(p.store, p.title) === "high" || RISK_RX.test(listingText(p));
}

function scoreTrustQuality(products: QuantProduct[], intent: IntentIntelligenceMeta): number {
  const top = products.slice(0, 3);
  if (!top.length) return 50;
  let score = 55;
  const trustedTop = top.filter((p) => isTrustedStore(p.store)).length;
  const riskTop = top.filter((p) => isRiskListing(p)).length;
  score += trustedTop * 12;
  score -= riskTop * 22;
  if (intent.detectedIntents.trust.active && trustedTop >= 1) score += 10;
  if (riskTop === 0) score += 8;
  return clampScore(score);
}

function scoreRankingQuality(driftCount: number, rankingStable: boolean): number {
  const cappedDrift = Math.min(driftCount, INTENT_OBS_MAX_DRIFT);
  let score = 92 - cappedDrift * 10;
  if (!rankingStable) score -= 25;
  return clampScore(score);
}

function scoreComparisonAccuracy(
  products: QuantProduct[],
  intent: IntentIntelligenceMeta,
  canonicalQuery: CanonicalQueryContract
): number {
  const uc = intent.detectedIntents.urgencyComparison;
  if (!uc.comparison && !uc.alternativeSeeking) return 72;
  const top = products.slice(0, 3);
  let hits = 0;
  for (const p of top) {
    const rel = assessStructuredProductIdentity({ product: p, canonicalQuery }).relation;
    if (rel === "exact_product" || rel === "same_product_family" || rel === "variant") hits += 1;
  }
  return clampScore(50 + hits * 16);
}

function scoreSuppressionEffectiveness(
  products: QuantProduct[],
  intent: IntentIntelligenceMeta,
  intentApply: IntentApplyMeta,
  canonicalQuery: CanonicalQueryContract
): number {
  if (!intentApply.applied || intentApply.suppressionEvents === 0) return intentApply.applied ? 70 : 65;
  let justified = 0;
  let total = 0;
  for (const p of products.slice(0, 5)) {
    const suppressed = intentListingHardSuppressed(p, intent, canonicalQuery);
    if (suppressed || isRiskListing(p)) {
      total += 1;
      if (suppressed && isRiskListing(p)) justified += 1;
      else if (suppressed) justified += 0.85;
    }
  }
  const precision = total > 0 ? justified / Math.max(intentApply.suppressionEvents, 1) : 0.8;
  return clampScore(55 + precision * 40);
}

function scoreBudgetAlignment(
  products: QuantProduct[],
  intent: IntentIntelligenceMeta,
  canonicalQuery: CanonicalQueryContract
): number {
  if (!intent.detectedIntents.budget.active) return 70;
  const max = canonicalQuery.budget.maxPrice ?? intent.detectedIntents.budget.maxPrice;
  if (max == null) return 68;
  const top = products.slice(0, 3).filter((p) => p.price > 0);
  if (!top.length) return 50;
  const aligned = top.filter((p) => p.price <= max * 1.05).length;
  return clampScore(45 + (aligned / top.length) * 50);
}

function scoreMerchantIntegrity(products: QuantProduct[]): number {
  const stores = new Set(products.slice(0, 5).map((p) => p.store.trim().toLowerCase()).filter(Boolean));
  let score = 60 + Math.min(stores.size, 4) * 8;
  const top = products[0];
  if (top && getMarketplaceSellerRiskTier(top.store, top.title) === "high") score -= 20;
  return clampScore(score);
}

function scoreUserIntentAlignment(intent: IntentIntelligenceMeta, intentApply: IntentApplyMeta): number {
  let score = 40 + intent.confidence * 45;
  if (intentApply.applied) score += 12;
  if (intentApply.skippedReason) score -= 8;
  const activeDims = [
    intent.detectedIntents.trust.active,
    intent.detectedIntents.budget.active,
    intent.detectedIntents.urgencyComparison.comparison,
    intent.detectedIntents.urgencyComparison.urgency,
  ].filter(Boolean).length;
  score += activeDims * 3;
  return clampScore(score);
}

function computeProductionAnalytics(args: {
  products: QuantProduct[];
  preOrderLinks: string[];
  intent: IntentIntelligenceMeta;
  intentApply: IntentApplyMeta;
  observability: IntentObservabilityMeta;
  canary: IntentCanaryMeta;
  canonicalQuery: CanonicalQueryContract;
}): IntentProductionAnalytics {
  const { products, preOrderLinks, intent, intentApply, observability, canary, canonicalQuery } = args;
  const postLinks = products.slice(0, 5).map((p) => p.link || p.title);
  const preLinks = preOrderLinks.slice(0, 5);

  let positionDelta = 0;
  let wins = 0;
  let comparisons = 0;
  let trustedKept = 0;
  let trustedBaseline = 0;

  for (let i = 0; i < Math.min(postLinks.length, preLinks.length); i += 1) {
    const prePos = preLinks.indexOf(postLinks[i]!);
    if (prePos >= 0) {
      positionDelta += Math.abs(i - prePos);
      comparisons += 1;
      if (prePos > i) wins += 1;
    }
    const p = products[i];
    if (p && preLinks.includes(p.link)) {
      if (isTrustedStore(p.store)) trustedBaseline += 1;
      if (isTrustedStore(p.store)) trustedKept += 1;
    }
  }

  const baselineVsApplyDelta = intentApply.driftCount || Math.min(positionDelta, INTENT_OBS_MAX_DRIFT);
  const rankingWinRate =
    comparisons > 0 ? Math.round((wins / comparisons) * 1000) / 10 : intentApply.applied ? 50 : 0;
  const trustedMerchantRetention =
    trustedBaseline > 0 ? Math.round((trustedKept / trustedBaseline) * 1000) / 10 : 100;

  let suppressionJustified = 0;
  for (const p of products.slice(0, 5)) {
    if (intentListingHardSuppressed(p, intent, canonicalQuery) && isRiskListing(p)) {
      suppressionJustified += 1;
    }
  }
  const suppressionPrecision =
    intentApply.suppressionEvents > 0
      ? Math.round((suppressionJustified / intentApply.suppressionEvents) * 1000) / 10
      : 100;

  const driftQualityScore = clampScore(100 - (observability.driftCount / INTENT_OBS_MAX_DRIFT) * 35);
  const canaryOutcomeScore = clampScore(
    (canary.canaryHealthScore + canary.activationQualityScore + canary.rollbackReadinessScore) / 3
  );

  return {
    baselineVsApplyDelta,
    rankingWinRate,
    trustedMerchantRetention,
    suppressionPrecision,
    driftQualityScore,
    canaryOutcomeScore,
  };
}

function buildExplainability(args: {
  products: QuantProduct[];
  intent: IntentIntelligenceMeta;
  intentApply: IntentApplyMeta;
  observability: IntentObservabilityMeta;
  canary: IntentCanaryMeta;
  productionApply: IntentProductionApplyMeta;
  canonicalQuery: CanonicalQueryContract;
  medianPrice: number;
}): IntentDecisionExplainability {
  const { products, intent, intentApply, observability, canary, productionApply, canonicalQuery, medianPrice } =
    args;
  const whyBoosted: string[] = [];
  const whySuppressed: string[] = [];
  const whyStable: string[] = [];

  for (const p of products.slice(0, 3)) {
    const result = computeIntentApplyDelta({
      product: p,
      canonicalQuery,
      intent,
      medianPrice,
      products,
    });
    if (result.delta > 0) {
      whyBoosted.push(`${p.store}: +${result.delta} (${result.dimensionsUsed.join(",") || "signal"})`);
    }
    if (result.suppressed || intentListingHardSuppressed(p, intent, canonicalQuery)) {
      whySuppressed.push(`${p.title.slice(0, 40)}: trust/risk suppression`);
    }
  }

  if (intentApply.driftCount === 0) {
    whyStable.push("Top-5 order unchanged after bounded intent apply");
  } else {
    whyStable.push(`Controlled drift=${intentApply.driftCount} within cap=${INTENT_OBS_MAX_DRIFT}`);
  }
  if (observability.rankingStable) whyStable.push("Rerank deterministic across repeated passes");

  const appliedDimensions = [...intentApply.dimensionsUsed];
  const skippedDimensions = ALL_APPLY_DIMENSIONS.filter((d) => !appliedDimensions.includes(d));

  let rollbackContext: string | null = null;
  if (productionApply.blockedInProduction) {
    rollbackContext = "production:blocked_without_opt_in";
  } else if (canary.rollbackReason) {
    rollbackContext = `canary:${canary.rollbackReason}`;
  } else if (observability.rollbackWarning) {
    rollbackContext = "observability:rollback_warning";
  } else if (!intentApply.applyEnabled) {
    rollbackContext = "apply:master_switch_off";
  }

  return {
    whyBoosted: whyBoosted.slice(0, 5),
    whySuppressed: whySuppressed.slice(0, 5),
    whyStable: whyStable.slice(0, 4),
    appliedDimensions,
    skippedDimensions,
    rollbackContext,
  };
}

function buildMonitors(args: {
  intent: IntentIntelligenceMeta;
  intentApply: IntentApplyMeta;
  observability: IntentObservabilityMeta;
  products: QuantProduct[];
}): IntentQualityMonitors {
  const { intent, intentApply, observability, products } = args;
  const stores = new Set(products.slice(0, 5).map((p) => p.store.toLowerCase()));
  const topRisk = products.slice(0, 2).some((p) => isRiskListing(p));
  const trustIntent = intent.detectedIntents.trust.active;

  return {
    lowConfidenceApplyWarning: intentApply.applied && intent.confidence < INTENT_APPLY_CONFIDENCE_MIN + 0.02,
    excessiveSuppressionWarning: observability.overSuppression,
    trustMismatchWarning: trustIntent && topRisk,
    unstableRankingWarning: !observability.rankingStable || observability.driftCount > INTENT_OBS_MAX_DRIFT,
    merchantDiversityWarning: stores.size < 2 && products.length >= 3,
  };
}

function buildTrayAggregation(args: {
  dimensions: IntentEvaluationDimensions;
  driftCount: number;
  products: QuantProduct[];
  trayId?: string;
}): IntentEvaluationAggregation {
  const { dimensions, driftCount, products, trayId } = args;
  const dimEntries = Object.entries(dimensions) as [string, number][];
  dimEntries.sort((a, b) => b[1] - a[1]);
  const topPerformingDimensions = dimEntries.slice(0, 3).map(([k]) => k);

  const suppressionClusters: string[] = [];
  const trustRiskPatterns: string[] = [];
  for (const p of products.slice(0, 5)) {
    if (RISK_RX.test(listingText(p))) suppressionClusters.push(p.store.slice(0, 24));
    if (getMarketplaceSellerRiskTier(p.store, p.title) !== "low") {
      trustRiskPatterns.push(`${getMarketplaceSellerRiskTier(p.store, p.title)}:${p.store.slice(0, 20)}`);
    }
  }

  return {
    topPerformingDimensions,
    lowestQualityTrays: trayId && dimensions.rankingQuality < 60 ? [trayId] : [],
    driftHeatmap: { tray: driftCount, top5: Math.min(driftCount, 5) },
    suppressionClusters: [...new Set(suppressionClusters)].slice(0, 4),
    trustRiskPatterns: [...new Set(trustRiskPatterns)].slice(0, 4),
  };
}

function explanationCompleteness(explain: IntentDecisionExplainability): number {
  let n = 0;
  if (explain.whyBoosted.length) n += 1;
  if (explain.whySuppressed.length) n += 1;
  if (explain.whyStable.length) n += 1;
  if (explain.appliedDimensions.length) n += 1;
  if (explain.skippedDimensions.length) n += 1;
  if (explain.rollbackContext != null) n += 1;
  return clampScore((n / 6) * 100);
}

export function buildIntentEvaluationMeta(args: {
  query: string;
  trayId?: string;
  canonicalQuery: CanonicalQueryContract;
  intentIntelligence: IntentIntelligenceMeta;
  intentApply: IntentApplyMeta;
  intentProductionApply: IntentProductionApplyMeta;
  intentObservability: IntentObservabilityMeta;
  intentCanary: IntentCanaryMeta;
  products: QuantProduct[];
  preOrderLinks?: string[];
  rankingStable?: boolean;
}): IntentEvaluationMeta {
  const started = Date.now();
  const {
    canonicalQuery,
    intentIntelligence,
    intentApply,
    intentProductionApply,
    intentObservability,
    intentCanary,
    products,
    preOrderLinks = [],
    rankingStable = true,
  } = args;

  if (!isIntentEvaluationEnabled()) {
    return {
      version: INTENT_EVALUATION_VERSION,
      active: false,
      dimensions: {
        trustQuality: 0,
        rankingQuality: 0,
        comparisonAccuracy: 0,
        suppressionEffectiveness: 0,
        budgetAlignment: 0,
        merchantIntegrity: 0,
        userIntentAlignment: 0,
      },
      analytics: {
        baselineVsApplyDelta: 0,
        rankingWinRate: 0,
        trustedMerchantRetention: 0,
        suppressionPrecision: 0,
        driftQualityScore: 0,
        canaryOutcomeScore: 0,
      },
      explainability: {
        whyBoosted: [],
        whySuppressed: [],
        whyStable: [],
        appliedDimensions: [],
        skippedDimensions: ALL_APPLY_DIMENSIONS,
        rollbackContext: "evaluation_disabled",
      },
      monitors: {
        lowConfidenceApplyWarning: false,
        excessiveSuppressionWarning: false,
        trustMismatchWarning: false,
        unstableRankingWarning: false,
        merchantDiversityWarning: false,
      },
      aggregation: {
        topPerformingDimensions: [],
        lowestQualityTrays: [],
        driftHeatmap: {},
        suppressionClusters: [],
        trustRiskPatterns: [],
      },
      qualityScore: 0,
      integrityScore: 0,
      trustScore: 0,
      stabilityScore: 0,
      explanationCompleteness: 0,
      latencyMs: Date.now() - started,
    };
  }

  const prices = products.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b);
  const medianPrice = prices[Math.floor(prices.length / 2)] ?? 0;

  const dimensions: IntentEvaluationDimensions = {
    trustQuality: scoreTrustQuality(products, intentIntelligence),
    rankingQuality: scoreRankingQuality(intentApply.driftCount, rankingStable),
    comparisonAccuracy: scoreComparisonAccuracy(products, intentIntelligence, canonicalQuery),
    suppressionEffectiveness: scoreSuppressionEffectiveness(
      products,
      intentIntelligence,
      intentApply,
      canonicalQuery
    ),
    budgetAlignment: scoreBudgetAlignment(products, intentIntelligence, canonicalQuery),
    merchantIntegrity: scoreMerchantIntegrity(products),
    userIntentAlignment: scoreUserIntentAlignment(intentIntelligence, intentApply),
  };

  const analytics = computeProductionAnalytics({
    products,
    preOrderLinks,
    intent: intentIntelligence,
    intentApply,
    observability: intentObservability,
    canary: intentCanary,
    canonicalQuery,
  });

  const explainability = buildExplainability({
    products,
    intent: intentIntelligence,
    intentApply,
    observability: intentObservability,
    canary: intentCanary,
    productionApply: intentProductionApply,
    canonicalQuery,
    medianPrice,
  });

  const monitors = buildMonitors({
    intent: intentIntelligence,
    intentApply,
    observability: intentObservability,
    products,
  });

  const aggregation = buildTrayAggregation({
    dimensions,
    driftCount: intentApply.driftCount,
    products,
    trayId: args.trayId,
  });

  const qualityScore = clampScore(
    (dimensions.trustQuality * 0.2 +
      dimensions.rankingQuality * 0.18 +
      dimensions.suppressionEffectiveness * 0.14 +
      dimensions.userIntentAlignment * 0.16 +
      analytics.driftQualityScore * 0.16 +
      analytics.canaryOutcomeScore * 0.16) /
      1
  );

  const integrityScore = clampScore(
    intentObservability.integrityPass ? 88 - intentObservability.instabilityWarnings.length * 6 : 52
  );
  const trustScore = clampScore((dimensions.trustQuality + analytics.trustedMerchantRetention) / 2);
  const stabilityScore = clampScore(
    (dimensions.rankingQuality + analytics.driftQualityScore + (rankingStable ? 12 : 0)) / 1.12
  );
  const explCompleteness = explanationCompleteness(explainability);

  return {
    version: INTENT_EVALUATION_VERSION,
    active: intentIntelligence.active,
    dimensions,
    analytics,
    explainability,
    monitors,
    aggregation,
    qualityScore,
    integrityScore,
    trustScore,
    stabilityScore,
    explanationCompleteness: explCompleteness,
    latencyMs: Date.now() - started,
  };
}

/** Multi-tray aggregation for validation scripts. */
export function aggregateIntentEvaluations(
  rows: { trayId: string; evaluation: IntentEvaluationMeta }[]
): IntentEvaluationAggregation {
  const dimSums: Record<string, number> = {};
  const driftHeatmap: Record<string, number> = {};
  const suppressionClusters = new Set<string>();
  const trustRiskPatterns = new Set<string>();
  const lowest: { id: string; score: number }[] = [];

  for (const row of rows) {
    for (const [k, v] of Object.entries(row.evaluation.dimensions)) {
      dimSums[k] = (dimSums[k] ?? 0) + v;
    }
    driftHeatmap[row.trayId] = row.evaluation.analytics.baselineVsApplyDelta;
    for (const c of row.evaluation.aggregation.suppressionClusters) suppressionClusters.add(c);
    for (const t of row.evaluation.aggregation.trustRiskPatterns) trustRiskPatterns.add(t);
    lowest.push({ id: row.trayId, score: row.evaluation.qualityScore });
  }

  lowest.sort((a, b) => a.score - b.score);
  const topPerformingDimensions = Object.entries(dimSums)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  return {
    topPerformingDimensions,
    lowestQualityTrays: lowest.slice(0, 2).map((x) => x.id),
    driftHeatmap,
    suppressionClusters: [...suppressionClusters].slice(0, 8),
    trustRiskPatterns: [...trustRiskPatterns].slice(0, 8),
  };
}

export { isIntentEvaluationEnabled };
