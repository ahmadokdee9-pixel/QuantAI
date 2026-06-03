#!/usr/bin/env node
/**
 * Phase 13.0 — Ranking Signals Aggregator tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildQueryIntelligence } from "../lib/intelligence/queryIntelligence.ts";
import { buildMultiCategoryIntelligence } from "../lib/intelligence/multiCategoryIntelligence.ts";
import { buildTasteIntelligence } from "../lib/intelligence/tasteIntelligenceEngine.ts";
import { buildLifestyleIntelligence } from "../lib/intelligence/lifestyleIntelligenceEngine.ts";
import { buildContextIntelligence } from "../lib/intelligence/contextIntelligenceEngine.ts";
import { buildIntentConfidence } from "../lib/intelligence/intentConfidenceEngine.ts";
import { buildMemoryPreparation } from "../lib/intelligence/memoryPreparationEngine.ts";
import { buildUniversalBuyerModel } from "../lib/intelligence/universalBuyerModelEngine.ts";
import { buildBuyerIntentVector } from "../lib/intelligence/buyerIntentVectorEngine.ts";
import { buildShopperPsychology } from "../lib/intelligence/shopperPsychologyEngine.ts";
import { buildDecisionReadiness } from "../lib/intelligence/decisionReadinessEngine.ts";
import { buildPurchaseFriction } from "../lib/intelligence/purchaseFrictionEngine.ts";
import { buildConversionProbability } from "../lib/intelligence/conversionProbabilityEngine.ts";
import { buildDealSensitivity } from "../lib/intelligence/dealSensitivityEngine.ts";
import { buildBrandAffinity } from "../lib/intelligence/brandAffinityEngine.ts";
import { buildProductAttributeAffinity } from "../lib/intelligence/productAttributeAffinityEngine.ts";
import { buildRetailerTrust } from "../lib/intelligence/retailerTrustEngine.ts";
import { buildReviewCredibility } from "../lib/intelligence/reviewCredibilityEngine.ts";
import { buildRealDiscount } from "../lib/intelligence/realDiscountEngine.ts";
import { buildValueIntelligence } from "../lib/intelligence/valueIntelligenceEngine.ts";
import { buildRankingPreparation } from "../lib/intelligence/rankingPreparationEngine.ts";
import { aggregateRankingSignals } from "../lib/ranking/rankingSignalsAggregator.ts";

const WEIGHT_KEYS = [
  "buyerFit",
  "trust",
  "value",
  "quality",
  "confidence",
  "brandAffinity",
  "productAttributeAffinity",
  "reviewCredibility",
  "retailerTrust",
  "realDiscount",
  "valueIntelligence",
];

function buildPhase130RankingSignals(query) {
  const bundle = buildQueryIntelligence(query);
  const multiCategory = buildMultiCategoryIntelligence({
    query,
    shoppingBrain: bundle.shoppingBrain,
    queryIntelligence: bundle.meta,
  });
  const tasteIntelligence = buildTasteIntelligence({
    query,
    shoppingBrain: bundle.shoppingBrain,
    queryIntelligence: bundle.meta,
    multiCategory,
  });
  const lifestyleIntelligence = buildLifestyleIntelligence({
    query,
    shoppingBrain: bundle.shoppingBrain,
    queryIntelligence: bundle.meta,
    multiCategory,
    tasteIntelligence,
  });
  const contextIntelligence = buildContextIntelligence({
    query,
    shoppingBrain: bundle.shoppingBrain,
    queryIntelligence: bundle.meta,
    multiCategory,
    tasteIntelligence,
    lifestyleIntelligence,
  });
  const intentConfidence = buildIntentConfidence({
    query,
    shoppingBrain: bundle.shoppingBrain,
    multiCategory,
    tasteIntelligence,
    lifestyleIntelligence,
    contextIntelligence,
  });
  const memoryPreparation = buildMemoryPreparation({
    shoppingBrain: bundle.shoppingBrain,
    multiCategory,
    tasteIntelligence,
    lifestyleIntelligence,
    contextIntelligence,
    intentConfidence,
  });
  const buyerModel = buildUniversalBuyerModel({
    shoppingBrain: bundle.shoppingBrain,
    multiCategory,
    tasteIntelligence,
    lifestyleIntelligence,
    contextIntelligence,
    intentConfidence,
    memoryPreparation,
  });
  const buyerIntentVector = buildBuyerIntentVector({
    shoppingBrain: bundle.shoppingBrain,
    multiCategory,
    tasteIntelligence,
    lifestyleIntelligence,
    contextIntelligence,
    intentConfidence,
    memoryPreparation,
    buyerModel,
  });
  const shopperPsychology = buildShopperPsychology({
    shoppingBrain: bundle.shoppingBrain,
    multiCategory,
    tasteIntelligence,
    lifestyleIntelligence,
    contextIntelligence,
    intentConfidence,
    memoryPreparation,
    buyerModel,
    buyerIntentVector,
  });
  const decisionReadiness = buildDecisionReadiness({
    shoppingBrain: bundle.shoppingBrain,
    multiCategory,
    tasteIntelligence,
    lifestyleIntelligence,
    contextIntelligence,
    intentConfidence,
    memoryPreparation,
    buyerModel,
    buyerIntentVector,
    shopperPsychology,
  });
  const purchaseFriction = buildPurchaseFriction({
    shoppingBrain: bundle.shoppingBrain,
    multiCategory,
    tasteIntelligence,
    lifestyleIntelligence,
    contextIntelligence,
    intentConfidence,
    memoryPreparation,
    buyerModel,
    buyerIntentVector,
    shopperPsychology,
    decisionReadiness,
  });
  const conversionProbability = buildConversionProbability({
    shoppingBrain: bundle.shoppingBrain,
    multiCategory,
    tasteIntelligence,
    lifestyleIntelligence,
    contextIntelligence,
    intentConfidence,
    memoryPreparation,
    buyerModel,
    buyerIntentVector,
    shopperPsychology,
    decisionReadiness,
    purchaseFriction,
  });
  const dealSensitivity = buildDealSensitivity({
    query,
    shoppingBrain: bundle.shoppingBrain,
    multiCategory,
    tasteIntelligence,
    lifestyleIntelligence,
    contextIntelligence,
    intentConfidence,
    memoryPreparation,
    buyerModel,
    buyerIntentVector,
    shopperPsychology,
    decisionReadiness,
    purchaseFriction,
    conversionProbability,
  });
  const brandAffinity = buildBrandAffinity({
    query,
    buyerModel,
    buyerIntentVector,
    shopperPsychology,
    decisionReadiness,
    purchaseFriction,
    conversionProbability,
    dealSensitivity,
    tasteIntelligence,
    lifestyleIntelligence,
  });
  const productAttributeAffinity = buildProductAttributeAffinity({
    query,
    shoppingBrain: bundle.shoppingBrain,
    buyerModel,
    buyerIntentVector,
    shopperPsychology,
    contextIntelligence,
    tasteIntelligence,
    lifestyleIntelligence,
    brandAffinity,
  });
  const retailerTrust = buildRetailerTrust({
    query,
    buyerModel,
    shopperPsychology,
    contextIntelligence,
    intentConfidence,
    dealSensitivity,
    brandAffinity,
    productAttributeAffinity,
  });
  const reviewCredibility = buildReviewCredibility({
    query,
    buyerModel,
    shopperPsychology,
    contextIntelligence,
    intentConfidence,
    productAttributeAffinity,
    retailerTrust,
  });
  const realDiscount = buildRealDiscount({
    query,
    buyerModel,
    shopperPsychology,
    dealSensitivity,
    productAttributeAffinity,
    retailerTrust,
    reviewCredibility,
  });
  const valueIntelligence = buildValueIntelligence({
    query,
    buyerModel,
    shopperPsychology,
    dealSensitivity,
    productAttributeAffinity,
    retailerTrust,
    reviewCredibility,
    realDiscount,
  });
  const rankingPreparation = buildRankingPreparation({
    query,
    buyerModel,
    buyerIntentVector,
    shopperPsychology,
    intentConfidence,
    decisionReadiness,
    brandAffinity,
    productAttributeAffinity,
    retailerTrust,
    reviewCredibility,
    valueIntelligence,
  });
  return aggregateRankingSignals({
    rankingPreparation,
    brandAffinity,
    productAttributeAffinity,
    reviewCredibility,
    retailerTrust,
    realDiscount,
    valueIntelligence,
  });
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase13.0-v1", `${label} version`);
  assert.ok(meta.rankingSignalScore >= 0 && meta.rankingSignalScore <= 1, `${label} rankingSignalScore`);
  assert.equal(typeof meta.signalWeights, "object", `${label} signalWeights`);
  for (const key of WEIGHT_KEYS) {
    assert.ok(meta.signalWeights[key] >= 0 && meta.signalWeights[key] <= 1, `${label} weight ${key}`);
  }
  const weightSum = WEIGHT_KEYS.reduce((sum, key) => sum + meta.signalWeights[key], 0);
  assert.ok(Math.abs(weightSum - 1) <= 0.02, `${label} signalWeights sum ~1 (${weightSum})`);
  assert.ok(Array.isArray(meta.signalConflicts), `${label} signalConflicts`);
  assert.ok(Array.isArray(meta.signalStrengths), `${label} signalStrengths`);
  assert.ok(Array.isArray(meta.signalWeaknesses), `${label} signalWeaknesses`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("aggregateRankingSignals"), "route uses aggregateRankingSignals");
assert.ok(route.includes("rankingSignals"), "route exposes rankingSignals meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("aggregateRankingSignals"), "stabilization checks ranking signals aggregator");
assert.ok(stabilization.includes("rankingSignals"), "stabilization checks rankingSignals meta");

// ── Spec examples ────────────────────────────────────────────────────────────
const alignedStack = buildPhase130RankingSignals(
  "buy from official apple store verified purchase best value for money trusted retailer high quality"
);
assertShape(alignedStack, "aligned ranking signals");
assert.ok(alignedStack.rankingSignalScore >= 0.62);
assert.ok(alignedStack.signalStrengths.length >= 3);
assert.ok(!alignedStack.signalConflicts.includes("preparation_signal_conflict"));
assert.ok(alignedStack.signalWeights.trust > 0);
assert.ok(alignedStack.signalWeights.value > 0);

const weakTrust = buildPhase130RankingSignals(
  "cheap laptop deal from unknown seller fake reviews overpriced weak quality"
);
assertShape(weakTrust, "weak trust ranking signals");
assert.ok(weakTrust.rankingSignalScore <= 0.45);
assert.ok(weakTrust.signalWeaknesses.includes("weak_trust_signal"));
assert.ok(
  weakTrust.signalWeaknesses.includes("low_review_credibility") ||
    weakTrust.signalWeaknesses.includes("low_retailer_trust")
);

const conflicting = buildPhase130RankingSignals(
  "best value conflicting signals unknown seller fake reviews overpriced fake sale"
);
assertShape(conflicting, "conflicting ranking signals");
assert.ok(conflicting.rankingSignalScore <= 0.4);
assert.ok(conflicting.signalConflicts.length >= 1);
assert.ok(
  conflicting.signalConflicts.includes("preparation_signal_conflict") ||
    conflicting.signalConflicts.includes("preparation_value_trust_gap") ||
    conflicting.signalConflicts.includes("value_intelligence_vs_trust")
);

const performanceBuyer = buildPhase130RankingSignals(
  "gaming laptop performance for the price perfect fit matches my needs high quality"
);
assertShape(performanceBuyer, "performance buyer signals");
assert.ok(performanceBuyer.rankingSignalScore >= 0.5);
assert.ok(performanceBuyer.signalWeights.buyerFit > 0);
assert.ok(performanceBuyer.signalWeights.productAttributeAffinity > 0);

// ── Deterministic stability ──────────────────────────────────────────────────
const q =
  "buy from official apple store verified purchase best value for money trusted retailer high quality";
assert.deepEqual(buildPhase130RankingSignals(q), buildPhase130RankingSignals(q), "deterministic output");

// ── Read-only guarantee ──────────────────────────────────────────────────────
const aggregatorSrc = readFileSync(
  join(process.cwd(), "lib/ranking/rankingSignalsAggregator.ts"),
  "utf8"
);
assert.ok(!aggregatorSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!aggregatorSrc.includes("localStorage"), "no persistence");
assert.ok(!aggregatorSrc.includes("supabase"), "no database writes");
assert.ok(!aggregatorSrc.includes(".sort("), "no sorting mutations");
assert.ok(!aggregatorSrc.includes("semanticRerank"), "no ranking execution");
assert.ok(!aggregatorSrc.includes("merchantDiversityRerank"), "no reranking mutations");

console.log("phase130-ranking-signals: ok");
