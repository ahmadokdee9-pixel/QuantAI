#!/usr/bin/env node
/**
 * Phase 12.19 — Value Intelligence Engine tests (offline, no network).
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

const VALID_LEVELS = new Set(["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]);

function buildPhase1219ValueIntelligence(query) {
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
  return buildValueIntelligence({
    query,
    buyerModel,
    shopperPsychology,
    dealSensitivity,
    productAttributeAffinity,
    retailerTrust,
    reviewCredibility,
    realDiscount,
  });
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.19-v1", `${label} version`);
  assert.ok(VALID_LEVELS.has(meta.valueLevel), `${label} valueLevel`);
  assert.ok(meta.valueScore >= 0 && meta.valueScore <= 1, `${label} valueScore`);
  for (const key of [
    "priceToQualitySignal",
    "priceToPerformanceSignal",
    "longTermValueSignal",
    "ownershipCostSignal",
    "replacementValueSignal",
  ]) {
    assert.ok(meta[key] >= 0 && meta[key] <= 1, `${label} ${key}`);
  }
  assert.ok(Array.isArray(meta.riskFlags), `${label} riskFlags`);
  assert.equal(typeof meta.confidenceTier, "string", `${label} confidenceTier`);
  assert.ok(meta.confidence >= 0 && meta.confidence <= 1, `${label} confidence`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildValueIntelligence"), "route uses buildValueIntelligence");
assert.ok(route.includes("valueIntelligence"), "route exposes valueIntelligence meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildValueIntelligence"), "stabilization checks value intelligence engine");
assert.ok(stabilization.includes("valueIntelligence"), "stabilization checks valueIntelligence meta");

// ── Spec examples ────────────────────────────────────────────────────────────
const highValue = buildPhase1219ValueIntelligence(
  "best value for money built to last low maintenance buy it for life long lasting"
);
assertShape(highValue, "high long-term value");
assert.ok(
  highValue.valueLevel === "HIGH" || highValue.valueLevel === "VERY_HIGH",
  "strong value should be HIGH or VERY_HIGH"
);
assert.ok(highValue.valueScore >= 0.72);
assert.ok(highValue.priceToQualitySignal >= 0.5);
assert.ok(highValue.longTermValueSignal >= 0.5);
assert.ok(highValue.replacementValueSignal >= 0.5);
assert.ok(highValue.ownershipCostSignal >= 0.5);

const overpricedWeak = buildPhase1219ValueIntelligence(
  "overpriced weak quality for price poor durability short lifecycle disposable product"
);
assertShape(overpricedWeak, "overpriced weak quality");
assert.ok(
  overpricedWeak.valueLevel === "VERY_LOW" || overpricedWeak.valueLevel === "LOW",
  "overpriced weak product should be VERY_LOW or LOW"
);
assert.ok(overpricedWeak.valueScore <= 0.4);
assert.ok(overpricedWeak.riskFlags.includes("overpriced_risk"));
assert.ok(overpricedWeak.riskFlags.includes("weak_quality_for_price"));
assert.ok(overpricedWeak.riskFlags.includes("poor_durability"));

const performanceValue = buildPhase1219ValueIntelligence(
  "high performance for the price gaming laptop specs for the price"
);
assertShape(performanceValue, "performance value");
assert.ok(performanceValue.priceToPerformanceSignal >= 0.55);
assert.ok(performanceValue.valueScore >= 0.55);
assert.ok(
  performanceValue.valueLevel === "MEDIUM" ||
    performanceValue.valueLevel === "HIGH" ||
    performanceValue.valueLevel === "VERY_HIGH"
);

const highOwnership = buildPhase1219ValueIntelligence(
  "expensive maintenance high running cost costly repairs short lifecycle"
);
assertShape(highOwnership, "high ownership cost");
assert.ok(highOwnership.valueScore <= 0.45);
assert.ok(highOwnership.ownershipCostSignal <= 0.35);
assert.ok(highOwnership.riskFlags.includes("high_ownership_cost"));
assert.ok(highOwnership.riskFlags.includes("short_lifecycle_risk"));

// ── Pass-through integrity ───────────────────────────────────────────────────
const passThroughQuery =
  "best value for money built to last low maintenance buy it for life long lasting";
const passThrough = buildPhase1219ValueIntelligence(passThroughQuery);
assert.equal(highValue.confidenceTier, passThrough.confidenceTier);
assert.equal(highValue.confidence, passThrough.confidence);

// ── Deterministic stability ──────────────────────────────────────────────────
assert.deepEqual(
  buildPhase1219ValueIntelligence(passThroughQuery),
  buildPhase1219ValueIntelligence(passThroughQuery),
  "deterministic output"
);

// ── Meta-only guarantee ──────────────────────────────────────────────────────
const engineSrc = readFileSync(join(process.cwd(), "lib/intelligence/valueIntelligenceEngine.ts"), "utf8");
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("localStorage"), "no persistence");
assert.ok(!engineSrc.includes("supabase"), "no database writes");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");
assert.ok(!engineSrc.includes("getStoreTrustScore"), "no post-search retailer scoring");

console.log("phase1219-value-intelligence: ok");
