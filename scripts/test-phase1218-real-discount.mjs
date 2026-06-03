#!/usr/bin/env node
/**
 * Phase 12.18 — Real Discount Intelligence Engine tests (offline, no network).
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

const VALID_LEVELS = new Set(["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]);

function buildPhase1218RealDiscount(query) {
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
  return buildRealDiscount({
    query,
    buyerModel,
    shopperPsychology,
    dealSensitivity,
    productAttributeAffinity,
    retailerTrust,
    reviewCredibility,
  });
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.18-v1", `${label} version`);
  assert.ok(VALID_LEVELS.has(meta.discountLevel), `${label} discountLevel`);
  assert.ok(meta.discountScore >= 0 && meta.discountScore <= 1, `${label} discountScore`);
  for (const key of [
    "priceDropSignal",
    "historicalPriceSignal",
    "valueGainSignal",
    "fakeDiscountRisk",
    "urgencyDiscountSignal",
  ]) {
    assert.ok(meta[key] >= 0 && meta[key] <= 1, `${label} ${key}`);
  }
  assert.ok(Array.isArray(meta.riskFlags), `${label} riskFlags`);
  assert.equal(typeof meta.confidenceTier, "string", `${label} confidenceTier`);
  assert.ok(meta.confidence >= 0 && meta.confidence <= 1, `${label} confidence`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildRealDiscount"), "route uses buildRealDiscount");
assert.ok(route.includes("realDiscount"), "route exposes realDiscount meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildRealDiscount"), "stabilization checks real discount engine");
assert.ok(stabilization.includes("realDiscount"), "stabilization checks realDiscount meta");

// ── Spec examples ────────────────────────────────────────────────────────────
const genuineDeal = buildPhase1218RealDiscount(
  "significant price drop trusted retailer genuine discount historical low best value"
);
assertShape(genuineDeal, "genuine trusted discount");
assert.ok(
  genuineDeal.discountLevel === "HIGH" || genuineDeal.discountLevel === "VERY_HIGH",
  "genuine deal should be HIGH or VERY_HIGH"
);
assert.ok(genuineDeal.discountScore >= 0.68);
assert.ok(genuineDeal.priceDropSignal >= 0.5);
assert.ok(genuineDeal.valueGainSignal >= 0.4);
assert.ok(genuineDeal.fakeDiscountRisk <= 0.35);

const fakeSale = buildPhase1218RealDiscount(
  "fake sale inflated original price fake discount suspicious markdown"
);
assertShape(fakeSale, "fake inflated sale");
assert.equal(fakeSale.discountLevel, "VERY_LOW");
assert.ok(fakeSale.discountScore <= 0.2);
assert.ok(fakeSale.fakeDiscountRisk >= 0.55);
assert.ok(fakeSale.riskFlags.includes("fake_discount_risk"));
assert.ok(fakeSale.riskFlags.includes("inflated_reference_price"));
assert.ok(fakeSale.riskFlags.includes("suspicious_sale_pattern"));

const urgencyOnly = buildPhase1218RealDiscount(
  "limited time only hurry ends today flash sale countdown act now"
);
assertShape(urgencyOnly, "urgency-only marketing");
assert.ok(urgencyOnly.discountScore <= 0.4);
assert.ok(
  urgencyOnly.discountLevel === "VERY_LOW" || urgencyOnly.discountLevel === "LOW",
  "urgency-only should be VERY_LOW or LOW"
);
assert.ok(urgencyOnly.urgencyDiscountSignal >= 0.45);
assert.ok(urgencyOnly.riskFlags.includes("artificial_urgency"));

const weakValue = buildPhase1218RealDiscount("cheap monitor deal weak value improvement minimal savings");
assertShape(weakValue, "weak value gain");
assert.ok(weakValue.discountScore <= 0.45);
assert.ok(weakValue.valueGainSignal <= 0.35 || weakValue.riskFlags.includes("weak_value_gain"));

// ── Pass-through integrity ───────────────────────────────────────────────────
const passThroughQuery =
  "significant price drop trusted retailer genuine discount historical low best value";
const passThrough = buildPhase1218RealDiscount(passThroughQuery);
assert.equal(genuineDeal.confidenceTier, passThrough.confidenceTier);
assert.equal(genuineDeal.confidence, passThrough.confidence);

// ── Deterministic stability ──────────────────────────────────────────────────
const q = passThroughQuery;
assert.deepEqual(buildPhase1218RealDiscount(q), buildPhase1218RealDiscount(q), "deterministic output");

// ── Meta-only guarantee ──────────────────────────────────────────────────────
const engineSrc = readFileSync(join(process.cwd(), "lib/intelligence/realDiscountEngine.ts"), "utf8");
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("localStorage"), "no persistence");
assert.ok(!engineSrc.includes("supabase"), "no database writes");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");
assert.ok(!engineSrc.includes("getStoreTrustScore"), "no post-search retailer scoring");

console.log("phase1218-real-discount: ok");
