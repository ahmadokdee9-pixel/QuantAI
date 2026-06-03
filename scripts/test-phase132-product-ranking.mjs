#!/usr/bin/env node
/**
 * Phase 13.2 — Product Ranking Application Layer tests (offline, no network).
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
import { applyProductRanking } from "../lib/ranking/productRankingApplication.ts";

const VALID_TIERS = new Set(["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]);

const MOCK_PRODUCTS = [
  { id: 101, link: "https://store.example/a", qiRank: 0 },
  { id: 102, link: "https://store.example/b", qiRank: 1 },
  { id: 103, link: "https://store.example/c", qiRank: 2 },
];

function buildRankingEngineForQuery(query) {
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
  const rankingSignals = aggregateRankingSignals({
    rankingPreparation,
    brandAffinity,
    productAttributeAffinity,
    reviewCredibility,
    retailerTrust,
    realDiscount,
    valueIntelligence,
  });
  return buildDeterministicRanking(rankingSignals);
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase13.2-v1", `${label} version`);
  assert.ok(meta.rankingScore >= 0 && meta.rankingScore <= 1, `${label} rankingScore`);
  assert.ok(VALID_TIERS.has(meta.rankingTier), `${label} rankingTier`);
  assert.ok(meta.rankingConfidence >= 0 && meta.rankingConfidence <= 1, `${label} rankingConfidence`);
  assert.ok(Array.isArray(meta.rankingReasons), `${label} rankingReasons`);
  assert.ok(Array.isArray(meta.rankingWarnings), `${label} rankingWarnings`);
  assert.ok(Array.isArray(meta.rankingProfile), `${label} rankingProfile`);
}

function assertProfileShape(profile, label) {
  assert.equal(typeof profile.productId, "number", `${label} productId`);
  assert.equal(typeof profile.link, "string", `${label} link`);
  assert.ok(profile.preparedRankingScore >= 0 && profile.preparedRankingScore <= 1, `${label} preparedRankingScore`);
  assert.ok(VALID_TIERS.has(profile.preparedRankingTier), `${label} preparedRankingTier`);
  assert.equal(typeof profile.rankingReady, "boolean", `${label} rankingReady`);
  for (const key of [
    "trustAdjustment",
    "valueAdjustment",
    "buyerFitAdjustment",
    "confidenceAdjustment",
  ]) {
    assert.ok(profile[key] >= 0 && profile[key] <= 1, `${label} ${key}`);
  }
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("applyProductRanking"), "route uses applyProductRanking");
assert.ok(route.includes("productRanking"), "route exposes productRanking meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("applyProductRanking"), "stabilization checks product ranking application");
assert.ok(stabilization.includes("productRanking"), "stabilization checks productRanking meta");

// ── Consumes rankingEngine only ─────────────────────────────────────────────
const appSrc = readFileSync(join(process.cwd(), "lib/ranking/productRankingApplication.ts"), "utf8");
assert.ok(appSrc.includes("RankingEngineMeta"), "application typed against rankingEngine");
assert.ok(!appSrc.includes("@/lib/intelligence/"), "application does not import Phase 12 intelligence");
assert.ok(!appSrc.includes(".sort("), "no sorting mutations");
assert.ok(!appSrc.includes("semanticRerank"), "no ranking execution");
assert.ok(!appSrc.includes("QuantProduct"), "no direct tray mutations");

// ── Direct rankingEngine fixture ─────────────────────────────────────────────
const strongEngine = {
  version: "phase13.1-v1",
  rankingScore: 0.82,
  rankingTier: "HIGH",
  trustWeight: 0.28,
  valueWeight: 0.26,
  buyerFitWeight: 0.24,
  confidenceWeight: 0.22,
  rankingReasons: ["Trust signals are strong across retailer and review posture."],
  rankingWarnings: [],
};

const strongProductRanking = applyProductRanking({
  rankingEngine: strongEngine,
  products: MOCK_PRODUCTS,
});
assertShape(strongProductRanking, "strong product ranking");
assert.equal(strongProductRanking.rankingScore, 0.82);
assert.equal(strongProductRanking.rankingTier, "HIGH");
assert.ok(strongProductRanking.rankingConfidence >= 0.5);
assert.equal(strongProductRanking.rankingProfile.length, 3);
for (const profile of strongProductRanking.rankingProfile) {
  assertProfileShape(profile, "strong profile");
}
assert.ok(strongProductRanking.rankingProfile[0].rankingReady);
assert.ok(
  strongProductRanking.rankingProfile[0].preparedRankingScore >=
    strongProductRanking.rankingProfile[2].preparedRankingScore
);

const weakEngine = {
  version: "phase13.1-v1",
  rankingScore: 0.28,
  rankingTier: "LOW",
  trustWeight: 0.3,
  valueWeight: 0.24,
  buyerFitWeight: 0.22,
  confidenceWeight: 0.24,
  rankingReasons: [],
  rankingWarnings: ["Trust signals are too weak for aggressive ranking.", "Review credibility is low."],
};

const weakProductRanking = applyProductRanking({
  rankingEngine: weakEngine,
  products: MOCK_PRODUCTS,
});
assertShape(weakProductRanking, "weak product ranking");
assert.ok(weakProductRanking.rankingConfidence <= 0.45);
assert.ok(weakProductRanking.rankingProfile.every((profile) => !profile.rankingReady));
assert.equal(weakProductRanking.rankingWarnings.length, 2);

// ── End-to-end via Phase 13.1 engine ─────────────────────────────────────────
const alignedEngine = buildRankingEngineForQuery(
  "buy from official apple store verified purchase best value for money trusted retailer high quality"
);
const alignedProductRanking = applyProductRanking({
  rankingEngine: alignedEngine,
  products: MOCK_PRODUCTS,
});
assertShape(alignedProductRanking, "aligned product ranking");
assert.equal(alignedProductRanking.rankingScore, alignedEngine.rankingScore);
assert.equal(alignedProductRanking.rankingTier, alignedEngine.rankingTier);
assert.deepEqual(alignedProductRanking.rankingReasons, alignedEngine.rankingReasons);
assert.deepEqual(alignedProductRanking.rankingWarnings, alignedEngine.rankingWarnings);
assert.ok(alignedProductRanking.rankingProfile.length === 3);

const conflictingEngine = buildRankingEngineForQuery(
  "best value conflicting signals unknown seller fake reviews overpriced fake sale"
);
const conflictingProductRanking = applyProductRanking({
  rankingEngine: conflictingEngine,
  products: MOCK_PRODUCTS,
});
assertShape(conflictingProductRanking, "conflicting product ranking");
assert.ok(conflictingProductRanking.rankingScore <= 0.4);
assert.ok(conflictingProductRanking.rankingWarnings.length >= 1);

// ── Product order preservation ─────────────────────────────────────────────────
const orderCheck = applyProductRanking({
  rankingEngine: strongEngine,
  products: MOCK_PRODUCTS,
});
assert.deepEqual(
  orderCheck.rankingProfile.map((profile) => profile.productId),
  [101, 102, 103],
  "product order preserved in rankingProfile"
);

// ── Deterministic stability ────────────────────────────────────────────────────
assert.deepEqual(
  applyProductRanking({ rankingEngine: strongEngine, products: MOCK_PRODUCTS }),
  applyProductRanking({ rankingEngine: strongEngine, products: MOCK_PRODUCTS }),
  "deterministic output"
);

console.log("phase132-product-ranking: ok");
