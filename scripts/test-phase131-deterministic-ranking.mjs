#!/usr/bin/env node
/**
 * Phase 13.1 — Deterministic Ranking Engine tests (offline, no network).
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
import { buildDeterministicRanking } from "../lib/ranking/deterministicRankingEngine.ts";

const VALID_TIERS = new Set(["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]);
const BLEND_KEYS = ["trustWeight", "valueWeight", "buyerFitWeight", "confidenceWeight"];

function buildRankingSignalsForQuery(query) {
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

function buildPhase131DeterministicRanking(query) {
  return buildDeterministicRanking(buildRankingSignalsForQuery(query));
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase13.1-v1", `${label} version`);
  assert.ok(meta.rankingScore >= 0 && meta.rankingScore <= 1, `${label} rankingScore`);
  assert.ok(VALID_TIERS.has(meta.rankingTier), `${label} rankingTier`);
  for (const key of BLEND_KEYS) {
    assert.ok(meta[key] >= 0 && meta[key] <= 1, `${label} ${key}`);
  }
  const blendSum = BLEND_KEYS.reduce((sum, key) => sum + meta[key], 0);
  assert.ok(Math.abs(blendSum - 1) <= 0.02, `${label} blend weights sum ~1 (${blendSum})`);
  assert.ok(Array.isArray(meta.rankingReasons), `${label} rankingReasons`);
  assert.ok(Array.isArray(meta.rankingWarnings), `${label} rankingWarnings`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildDeterministicRanking"), "route uses buildDeterministicRanking");
assert.ok(route.includes("rankingEngine"), "route exposes rankingEngine meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildDeterministicRanking"), "stabilization checks deterministic ranking engine");
assert.ok(stabilization.includes("rankingEngine"), "stabilization checks rankingEngine meta");

// ── Consumes rankingSignals only ─────────────────────────────────────────────
const engineSrc = readFileSync(
  join(process.cwd(), "lib/ranking/deterministicRankingEngine.ts"),
  "utf8"
);
assert.ok(engineSrc.includes("RankingSignalsMeta"), "engine typed against rankingSignals");
assert.ok(!engineSrc.includes("@/lib/intelligence/"), "engine does not import Phase 12 intelligence directly");
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("localStorage"), "no persistence");
assert.ok(!engineSrc.includes("supabase"), "no database writes");
assert.ok(!engineSrc.includes(".sort("), "no sorting mutations");
assert.ok(!engineSrc.includes("semanticRerank"), "no ranking execution");

// ── Direct rankingSignals fixture ────────────────────────────────────────────
const strongFixture = buildDeterministicRanking({
  version: "phase13.0-v1",
  rankingSignalScore: 0.82,
  signalWeights: {
    buyerFit: 0.11,
    trust: 0.18,
    value: 0.16,
    quality: 0.1,
    confidence: 0.12,
    brandAffinity: 0.07,
    productAttributeAffinity: 0.09,
    reviewCredibility: 0.07,
    retailerTrust: 0.05,
    realDiscount: 0.03,
    valueIntelligence: 0.02,
  },
  signalConflicts: [],
  signalStrengths: [
    "aligned_ranking_signal_stack",
    "strong_trust_signal",
    "strong_value_signal",
    "strong_confidence_signal",
  ],
  signalWeaknesses: [],
});
assertShape(strongFixture, "strong fixture");
assert.ok(strongFixture.rankingScore >= 0.7);
assert.equal(strongFixture.rankingTier, "HIGH");
assert.ok(strongFixture.rankingReasons.length >= 1);
assert.equal(strongFixture.rankingWarnings.length, 0);

const weakFixture = buildDeterministicRanking({
  version: "phase13.0-v1",
  rankingSignalScore: 0.28,
  signalWeights: {
    buyerFit: 0.1,
    trust: 0.2,
    value: 0.14,
    quality: 0.1,
    confidence: 0.1,
    brandAffinity: 0.08,
    productAttributeAffinity: 0.1,
    reviewCredibility: 0.08,
    retailerTrust: 0.06,
    realDiscount: 0.02,
    valueIntelligence: 0.02,
  },
  signalConflicts: ["preparation_signal_conflict", "preparation_value_trust_gap"],
  signalStrengths: [],
  signalWeaknesses: ["weak_trust_signal", "low_review_credibility", "weak_value_signal"],
});
assertShape(weakFixture, "weak fixture");
assert.ok(weakFixture.rankingScore <= 0.35);
assert.ok(weakFixture.rankingTier === "VERY_LOW" || weakFixture.rankingTier === "LOW");
assert.ok(weakFixture.rankingWarnings.length >= 2);

// ── End-to-end spec examples ─────────────────────────────────────────────────
const alignedStack = buildPhase131DeterministicRanking(
  "buy from official apple store verified purchase best value for money trusted retailer high quality"
);
assertShape(alignedStack, "aligned ranking engine");
assert.ok(alignedStack.rankingScore >= 0.65);
assert.ok(
  alignedStack.rankingTier === "HIGH" || alignedStack.rankingTier === "VERY_HIGH",
  "aligned stack should rank HIGH or VERY_HIGH"
);
assert.ok(alignedStack.trustWeight > 0.2);
assert.ok(alignedStack.rankingReasons.length >= 1);

const weakTrust = buildPhase131DeterministicRanking(
  "cheap laptop deal from unknown seller fake reviews overpriced weak quality"
);
assertShape(weakTrust, "weak trust ranking engine");
assert.ok(weakTrust.rankingScore <= 0.4);
assert.ok(
  weakTrust.rankingTier === "VERY_LOW" || weakTrust.rankingTier === "LOW",
  "weak trust should rank VERY_LOW or LOW"
);
assert.ok(weakTrust.rankingWarnings.length >= 1);

const conflicting = buildPhase131DeterministicRanking(
  "best value conflicting signals unknown seller fake reviews overpriced fake sale"
);
assertShape(conflicting, "conflicting ranking engine");
assert.ok(conflicting.rankingScore <= 0.38);
assert.ok(conflicting.rankingWarnings.length >= 1);

const buyerFit = buildPhase131DeterministicRanking(
  "gaming laptop performance for the price perfect fit matches my needs high quality"
);
assertShape(buyerFit, "buyer fit ranking engine");
assert.ok(buyerFit.rankingScore >= 0.45);
assert.ok(buyerFit.buyerFitWeight >= 0.15);

// ── Deterministic stability ────────────────────────────────────────────────────
const q =
  "buy from official apple store verified purchase best value for money trusted retailer high quality";
assert.deepEqual(
  buildPhase131DeterministicRanking(q),
  buildPhase131DeterministicRanking(q),
  "deterministic output"
);

console.log("phase131-deterministic-ranking: ok");
