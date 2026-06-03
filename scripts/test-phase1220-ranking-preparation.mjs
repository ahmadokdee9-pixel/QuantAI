#!/usr/bin/env node
/**
 * Phase 12.20 — Ranking Intelligence Preparation Layer tests (offline, no network).
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

const VALID_LEVELS = new Set(["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]);

function buildPhase1220RankingPreparation(query) {
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
  return buildRankingPreparation({
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
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.20-v1", `${label} version`);
  assert.ok(VALID_LEVELS.has(meta.rankingReadinessLevel), `${label} rankingReadinessLevel`);
  assert.ok(meta.rankingReadinessScore >= 0 && meta.rankingReadinessScore <= 1, `${label} rankingReadinessScore`);
  for (const key of [
    "qualitySignal",
    "trustSignal",
    "valueSignal",
    "buyerFitSignal",
    "confidenceSignal",
  ]) {
    assert.ok(meta[key] >= 0 && meta[key] <= 1, `${label} ${key}`);
  }
  assert.ok(Array.isArray(meta.rankingStrength), `${label} rankingStrength`);
  assert.ok(Array.isArray(meta.rankingWeaknesses), `${label} rankingWeaknesses`);
  assert.equal(typeof meta.confidenceTier, "string", `${label} confidenceTier`);
  assert.ok(meta.confidence >= 0 && meta.confidence <= 1, `${label} confidence`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildRankingPreparation"), "route uses buildRankingPreparation");
assert.ok(route.includes("rankingPreparation"), "route exposes rankingPreparation meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildRankingPreparation"), "stabilization checks ranking preparation engine");
assert.ok(stabilization.includes("rankingPreparation"), "stabilization checks rankingPreparation meta");

// ── Spec examples ────────────────────────────────────────────────────────────
const highReadiness = buildPhase1220RankingPreparation(
  "buy from official apple store verified purchase best value for money trusted retailer high quality"
);
assertShape(highReadiness, "high ranking readiness");
assert.ok(
  highReadiness.rankingReadinessLevel === "HIGH" || highReadiness.rankingReadinessLevel === "VERY_HIGH",
  "aligned stack should be HIGH or VERY_HIGH"
);
assert.ok(highReadiness.rankingReadinessScore >= 0.68);
assert.ok(highReadiness.trustSignal >= 0.55);
assert.ok(highReadiness.valueSignal >= 0.5);
assert.ok(highReadiness.rankingStrength.length >= 2);
assert.ok(!highReadiness.rankingWeaknesses.includes("conflicting_signals"));

const weakTrust = buildPhase1220RankingPreparation(
  "cheap laptop deal from unknown seller fake reviews overpriced weak quality"
);
assertShape(weakTrust, "weak trust stack");
assert.ok(
  weakTrust.rankingReadinessLevel === "VERY_LOW" || weakTrust.rankingReadinessLevel === "LOW",
  "weak trust should be VERY_LOW or LOW"
);
assert.ok(weakTrust.rankingReadinessScore <= 0.4);
assert.ok(weakTrust.trustSignal <= 0.45);
assert.ok(weakTrust.rankingWeaknesses.includes("weak_trust_signal"));
assert.ok(
  weakTrust.rankingWeaknesses.includes("low_review_credibility") ||
    weakTrust.rankingWeaknesses.includes("unknown_seller_trust_gap")
);

const conflicting = buildPhase1220RankingPreparation(
  "best value conflicting signals unknown seller fake reviews overpriced"
);
assertShape(conflicting, "conflicting signals");
assert.ok(conflicting.rankingReadinessScore <= 0.35);
assert.ok(conflicting.rankingWeaknesses.includes("conflicting_signals"));

const buyerFit = buildPhase1220RankingPreparation(
  "gaming laptop performance buyer perfect fit matches my needs high quality"
);
assertShape(buyerFit, "strong buyer fit");
assert.ok(buyerFit.buyerFitSignal >= 0.45);
assert.ok(buyerFit.rankingReadinessScore >= 0.45);

// ── Pass-through integrity ───────────────────────────────────────────────────
const passThroughQuery =
  "buy from official apple store verified purchase best value for money trusted retailer high quality";
const passThrough = buildPhase1220RankingPreparation(passThroughQuery);
assert.equal(highReadiness.confidenceTier, passThrough.confidenceTier);
assert.equal(highReadiness.confidence, passThrough.confidence);

// ── Deterministic stability ──────────────────────────────────────────────────
assert.deepEqual(
  buildPhase1220RankingPreparation(passThroughQuery),
  buildPhase1220RankingPreparation(passThroughQuery),
  "deterministic output"
);

// ── Meta-only guarantee ──────────────────────────────────────────────────────
const engineSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/rankingPreparationEngine.ts"),
  "utf8"
);
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("localStorage"), "no persistence");
assert.ok(!engineSrc.includes("supabase"), "no database writes");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");
assert.ok(!engineSrc.includes("semanticRerank"), "no ranking execution");
assert.ok(!engineSrc.includes("getStoreTrustScore"), "no post-search retailer scoring");

console.log("phase1220-ranking-preparation: ok");
