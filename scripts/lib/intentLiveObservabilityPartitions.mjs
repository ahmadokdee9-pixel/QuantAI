/**
 * P4.4 — Shared live observability trays (production canary simulation).
 */

import { buildCanonicalQuery } from "../../lib/search/canonicalQuery.ts";
import { semanticRerankSearchResults } from "../../lib/search/semanticReranker.ts";
import { computeIntentIntelligence } from "../../lib/intent/intentIntelligenceEngine.ts";
import { buildIntentApplyMeta } from "../../lib/intent/intentApply.ts";
import { buildIntentProductionApplyMeta } from "../../lib/intent/intentProductionApply.ts";
import { buildIntentObservabilityMeta } from "../../lib/intent/intentObservability.ts";
import {
  INTENT_OBS_INSTABILITY_CEILING,
  INTENT_OBS_LATENCY_BUDGET_MS,
  INTENT_OBS_MAX_DRIFT,
  INTENT_OBS_SUPPRESSION_RATE_MAX,
} from "../../lib/intent/intentObservabilityFlags.ts";
import { INTENT_APPLY_MAX_DELTA } from "../../lib/intent/intentIntelligenceFlags.ts";
import { buildVerticalTasteShadowMeta } from "../../lib/taste/verticalTasteShadow.ts";
import { computeUnifiedTasteSignals } from "../../lib/taste/unifiedTasteIdentity.ts";
import { isUnifiedTasteApplyEnabled } from "../../lib/taste/unifiedTasteFlags.ts";

export const INTENT_LIVE_PARTITIONS = [
  {
    id: "prod_trust_fragrance",
    query: "authentic ysl libre trusted seller only",
    products: [
      { title: "YSL Libre EDP 90ml Authentic", store: "Douglas", price: 95, link: "d1", extensions: [], rating: 4.2 },
      { title: "Inspired by Libre Clone Oil", store: "Temu Deals", price: 12, link: "t1", extensions: [], rating: 4.2 },
      { title: "Yves Saint Laurent Libre 90ml", store: "Notino", price: 92, link: "n1", extensions: [], rating: 4.2 },
    ],
  },
  {
    id: "prod_budget_laptop",
    query: "cheap but good laptop under 500 trusted seller",
    products: [
      { title: "Lenovo IdeaPad Slim 3 Laptop", store: "Coolblue", price: 449, link: "bl1", extensions: [], rating: 4.2 },
      { title: "Laptop 90% Off Hurry Buy", store: "Temu Deals", price: 89, link: "tm1", extensions: [], rating: 4.2 },
      { title: "ASUS Vivobook 15", store: "Bol.com", price: 479, link: "bol1", extensions: [], rating: 4.2 },
    ],
  },
  {
    id: "prod_compare_phones",
    query: "compare iphone 15 vs samsung s24 trusted",
    products: [
      { title: "Apple iPhone 15 128GB", store: "Coolblue", price: 799, link: "ip1", extensions: [], rating: 4.2 },
      { title: "Samsung Galaxy S24", store: "Bol.com", price: 749, link: "sg1", extensions: [], rating: 4.2 },
      { title: "iPhone Clone Hurry Buy", store: "Temu Deals", price: 89, link: "tm2", extensions: [], rating: 4.2 },
    ],
  },
  {
    id: "prod_urgent_delivery",
    query: "low risk delivery trusted shipping laptop need it this week",
    products: [
      { title: "Dell XPS 13 Insured Shipping", store: "Dell", price: 899, link: "dell1", extensions: [], rating: 4.2 },
      { title: "Laptop Hurry Buy Selling Fast", store: "Temu Deals", price: 199, link: "tm3", extensions: [], rating: 4.2 },
      { title: "HP Pavilion Track Shipping", store: "Amazon.nl", price: 649, link: "amz1", extensions: [], rating: 4.2 },
    ],
  },
  {
    id: "prod_mixed_arabic_shoes",
    query: "جزمة مثل nike vomero بس ارخص trusted",
    products: [
      { title: "Nike Vomero Premium", store: "Nike", price: 140, link: "nk1", extensions: [], rating: 4.2 },
      { title: "Nike Vomero Style Budget", store: "Temu Deals", price: 29, link: "tm4", extensions: [], rating: 4.2 },
      { title: "Nike Air Zoom Vomero 16", store: "Bol.com", price: 125, link: "bol2", extensions: [], rating: 4.2 },
    ],
  },
];

export function trayLinks(products) {
  return products.map((p) => p.link || p.title).join("|");
}

/** Run one partition through full observability stack. */
export function observeIntentPartition(part, env = {}) {
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    INTENT_INTELLIGENCE_APPLY_ENABLED: process.env.INTENT_INTELLIGENCE_APPLY_ENABLED,
    INTENT_INTELLIGENCE_PROD_APPLY: process.env.INTENT_INTELLIGENCE_PROD_APPLY,
    INTENT_INTELLIGENCE_CANARY_APPLY: process.env.INTENT_INTELLIGENCE_CANARY_APPLY,
    TASTE_UNIFIED_APPLY_ENABLED: process.env.TASTE_UNIFIED_APPLY_ENABLED,
    TASTE_GRAMMAR_ENABLED: process.env.TASTE_GRAMMAR_ENABLED,
    TASTE_FRAGRANCE_GRAMMAR_ENABLED: process.env.TASTE_FRAGRANCE_GRAMMAR_ENABLED,
    TASTE_FURNITURE_GRAMMAR_ENABLED: process.env.TASTE_FURNITURE_GRAMMAR_ENABLED,
  };

  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }

  const canonical = buildCanonicalQuery(part.query);
  const products = [...part.products];
  const preLinks = products.map((p) => p.link);

  const intent = computeIntentIntelligence({ query: part.query, canonicalQuery: canonical });

  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "false";
  const offRanked = semanticRerankSearchResults(products, part.query, canonical);

  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = env.INTENT_INTELLIGENCE_APPLY_ENABLED ?? "true";
  const runA = semanticRerankSearchResults(products, part.query, canonical);
  const runB = semanticRerankSearchResults(products, part.query, canonical);
  const rankingStable = trayLinks(runA) === trayLinks(runB);

  const intentApply = buildIntentApplyMeta({
    query: part.query,
    canonicalQuery: canonical,
    products: runA,
    preOrderLinks: preLinks,
  });
  const intentProductionApply = buildIntentProductionApplyMeta({ intentApply });
  const observability = buildIntentObservabilityMeta({
    query: part.query,
    canonicalQuery: canonical,
    intentIntelligence: intent,
    intentApply,
    intentProductionApply,
    products: runA,
    preOrderLinks: preLinks,
    rankingStable,
  });

  const shadow = buildVerticalTasteShadowMeta({ query: part.query, canonicalQuery: canonical, products: runA });
  const unified = computeUnifiedTasteSignals({
    query: part.query,
    canonicalQuery: canonical,
    products: runA,
    tasteGrammarShadow: shadow,
  });

  let drift = 0;
  const offTop = offRanked.slice(0, 3).map((p) => p.link);
  const onTop = runA.slice(0, 3).map((p) => p.link);
  for (let i = 0; i < Math.min(offTop.length, onTop.length); i += 1) {
    if (offTop[i] !== onTop[i]) drift += 1;
  }

  for (const [k, v] of Object.entries(prev)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }

  return {
    id: part.id,
    query: part.query,
    drift,
    offLinks: trayLinks(offRanked),
    onLinks: trayLinks(runA),
    intent,
    intentApply,
    intentProductionApply,
    observability,
    shadow,
    unified,
    rankingStable,
  };
}

export function aggregateObservabilityMetrics(rows) {
  const n = rows.length || 1;
  const confidenceDistribution = { low: 0, medium: 0, high: 0 };
  let totalDelta = 0;
  let totalSuppression = 0;
  let trustHits = 0;
  let comparisonHits = 0;
  let rollbackEvents = 0;
  const allWarnings = [];

  for (const row of rows) {
    const o = row.observability;
    confidenceDistribution.low += o.confidenceDistribution.low;
    confidenceDistribution.medium += o.confidenceDistribution.medium;
    confidenceDistribution.high += o.confidenceDistribution.high;
    totalDelta += o.avgDelta;
    totalSuppression += o.suppressionRate;
    trustHits += o.trustActivationRate;
    comparisonHits += o.comparisonActivationRate;
    rollbackEvents += o.rollbackEvents;
    allWarnings.push(...o.instabilityWarnings);
  }

  return {
    sampleCount: rows.length,
    confidenceDistribution,
    avgDelta: Math.round((totalDelta / n) * 100) / 100,
    suppressionRate: Math.round((totalSuppression / n) * 1000) / 1000,
    trustActivationRate: Math.round((trustHits / n) * 1000) / 1000,
    comparisonActivationRate: Math.round((comparisonHits / n) * 1000) / 1000,
    rollbackEvents,
    instabilityWarningCount: allWarnings.length,
    uniqueWarnings: [...new Set(allWarnings)],
  };
}

export function checkLiveObservabilityMetrics(row, agg = null) {
  const o = row.observability;
  const issues = [];

  if (row.drift > INTENT_OBS_MAX_DRIFT) issues.push("excessive_drift");
  if (!row.rankingStable) issues.push("unstable_rerank");
  if (o.crossLayerContamination || isUnifiedTasteApplyEnabled()) issues.push("cross_layer_contamination");
  if (row.shadow?.applyEnabled) issues.push("p2_apply_leak");
  if (row.unified?.meta?.applyEnabled) issues.push("p3_apply_leak");
  if (o.overSuppression) issues.push("over_suppression");
  if (o.avgDelta > INTENT_APPLY_MAX_DELTA) issues.push("delta_over_cap");
  if (o.instabilityWarnings.length > INTENT_OBS_INSTABILITY_CEILING) issues.push("instability_ceiling");
  if (o.latencyMs > INTENT_OBS_LATENCY_BUDGET_MS) issues.push("latency_budget");
  if (o.rollbackWarning && process.env.NODE_ENV === "production" && !process.env.INTENT_INTELLIGENCE_PROD_APPLY) {
    issues.push("rollback_auto_warning");
  }

  if (agg && agg.suppressionRate > INTENT_OBS_SUPPRESSION_RATE_MAX) issues.push("aggregate_suppression_anomaly");

  return { pass: issues.length === 0, issues };
}
