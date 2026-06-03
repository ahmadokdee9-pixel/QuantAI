#!/usr/bin/env node
/**
 * Phase 12.14 — Brand Affinity Engine tests (offline, no network).
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

const VALID_LEVELS = new Set(["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]);

function buildPhase1214BrandAffinity(query) {
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
  return buildBrandAffinity({
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
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.14-v1", `${label} version`);
  assert.ok(VALID_LEVELS.has(meta.affinityLevel), `${label} affinityLevel`);
  assert.ok(meta.affinityScore >= 0 && meta.affinityScore <= 1, `${label} affinityScore`);
  assert.ok(Array.isArray(meta.preferredBrandSignals), `${label} preferredBrandSignals`);
  assert.ok(meta.brandLoyaltyScore >= 0 && meta.brandLoyaltyScore <= 1, `${label} brandLoyaltyScore`);
  assert.ok(meta.premiumBrandBias >= 0 && meta.premiumBrandBias <= 1, `${label} premiumBrandBias`);
  assert.ok(meta.valueBrandBias >= 0 && meta.valueBrandBias <= 1, `${label} valueBrandBias`);
  assert.equal(typeof meta.confidenceTier, "string", `${label} confidenceTier`);
  assert.ok(meta.confidence >= 0 && meta.confidence <= 1, `${label} confidence`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildBrandAffinity"), "route uses buildBrandAffinity");
assert.ok(route.includes("brandAffinity"), "route exposes brandAffinity meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildBrandAffinity"), "stabilization checks brand affinity engine");
assert.ok(stabilization.includes("brandAffinity"), "stabilization checks brandAffinity meta");

// ── Spec examples ────────────────────────────────────────────────────────────
const premiumApple = buildPhase1214BrandAffinity("premium apple macbook pro");
assertShape(premiumApple, "premium apple buyer");
assert.equal(premiumApple.affinityLevel, "HIGH");
assert.ok(premiumApple.affinityScore >= 0.65);
assert.ok(premiumApple.premiumBrandBias >= 0.5);
assert.ok(premiumApple.preferredBrandSignals.includes("brand_apple"));
assert.ok(premiumApple.valueBrandBias < premiumApple.premiumBrandBias);

const budgetLaptop = buildPhase1214BrandAffinity("budget laptop under 500");
assertShape(budgetLaptop, "budget laptop buyer");
assert.equal(budgetLaptop.affinityLevel, "LOW");
assert.ok(budgetLaptop.affinityScore <= 0.4);
assert.ok(budgetLaptop.valueBrandBias >= 0.45);
assert.ok(budgetLaptop.valueBrandBias > budgetLaptop.premiumBrandBias);

const compareShopper = buildPhase1214BrandAffinity("compare iphone and samsung");
assertShape(compareShopper, "comparison shopper");
assert.equal(compareShopper.affinityLevel, "MEDIUM");
assert.ok(compareShopper.affinityScore >= 0.4 && compareShopper.affinityScore <= 0.6);
assert.ok(compareShopper.preferredBrandSignals.includes("comparison_mode"));

const urgentReplacement = buildPhase1214BrandAffinity("replace broken refrigerator now");
assertShape(urgentReplacement, "urgent replacement");
assert.ok(urgentReplacement.affinityScore <= 0.4);
assert.ok(urgentReplacement.preferredBrandSignals.includes("urgency_reduced_loyalty"));
assert.ok(urgentReplacement.brandLoyaltyScore <= 0.35);

// ── Pass-through integrity ───────────────────────────────────────────────────
assert.equal(
  premiumApple.confidence,
  buildPhase1214BrandAffinity("premium apple macbook pro").confidence
);

// ── Deterministic stability ──────────────────────────────────────────────────
const q = "compare iphone and samsung";
assert.deepEqual(buildPhase1214BrandAffinity(q), buildPhase1214BrandAffinity(q), "deterministic output");

// ── Meta-only guarantee ──────────────────────────────────────────────────────
const engineSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/brandAffinityEngine.ts"),
  "utf8"
);
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("localStorage"), "no persistence");
assert.ok(!engineSrc.includes("supabase"), "no database writes");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");

console.log("phase1214-brand-affinity: ok");
