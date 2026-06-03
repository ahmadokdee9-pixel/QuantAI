#!/usr/bin/env node
/**
 * Phase 12.16 — Retailer Trust Intelligence Engine tests (offline, no network).
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

const VALID_LEVELS = new Set(["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]);

function buildPhase1216RetailerTrust(query) {
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
  return buildRetailerTrust({
    query,
    buyerModel,
    shopperPsychology,
    contextIntelligence,
    intentConfidence,
    dealSensitivity,
    brandAffinity,
    productAttributeAffinity,
  });
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.16-v1", `${label} version`);
  assert.ok(VALID_LEVELS.has(meta.trustLevel), `${label} trustLevel`);
  assert.ok(meta.trustScore >= 0 && meta.trustScore <= 1, `${label} trustScore`);
  for (const key of [
    "retailerAgeSignal",
    "reviewSignal",
    "reputationSignal",
    "fulfillmentSignal",
    "returnPolicySignal",
  ]) {
    assert.ok(meta[key] >= 0 && meta[key] <= 1, `${label} ${key}`);
  }
  assert.ok(Array.isArray(meta.riskFlags), `${label} riskFlags`);
  assert.equal(typeof meta.confidenceTier, "string", `${label} confidenceTier`);
  assert.ok(meta.confidence >= 0 && meta.confidence <= 1, `${label} confidence`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildRetailerTrust"), "route uses buildRetailerTrust");
assert.ok(route.includes("retailerTrust"), "route exposes retailerTrust meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildRetailerTrust"), "stabilization checks retailer trust engine");
assert.ok(stabilization.includes("retailerTrust"), "stabilization checks retailerTrust meta");

// ── Spec examples ────────────────────────────────────────────────────────────
const officialApple = buildPhase1216RetailerTrust("buy from official apple store");
assertShape(officialApple, "official apple store");
assert.equal(officialApple.trustLevel, "VERY_HIGH");
assert.ok(officialApple.trustScore >= 0.85);
assert.ok(officialApple.retailerAgeSignal >= 0.5);
assert.ok(officialApple.reputationSignal >= 0.4);

const trustedReturn = buildPhase1216RetailerTrust("trusted retailer monitor with good return policy");
assertShape(trustedReturn, "trusted return policy");
assert.equal(trustedReturn.trustLevel, "HIGH");
assert.ok(trustedReturn.trustScore >= 0.65);
assert.ok(trustedReturn.returnPolicySignal >= 0.5);
assert.ok(trustedReturn.reviewSignal >= 0.4 || trustedReturn.reputationSignal >= 0.5);

const unknownSeller = buildPhase1216RetailerTrust("cheap laptop deal from unknown seller");
assertShape(unknownSeller, "unknown seller deal");
assert.ok(unknownSeller.trustScore <= 0.4);
assert.ok(unknownSeller.riskFlags.includes("unknown_seller_risk"));

const urgentReplacement = buildPhase1216RetailerTrust("replace broken vacuum with fast delivery");
assertShape(urgentReplacement, "urgent replacement delivery");
assert.ok(urgentReplacement.fulfillmentSignal >= 0.7);
assert.ok(urgentReplacement.trustScore >= 0.5);

// ── Pass-through integrity ───────────────────────────────────────────────────
assert.equal(
  officialApple.confidence,
  buildPhase1216RetailerTrust("buy from official apple store").confidence
);

// ── Deterministic stability ──────────────────────────────────────────────────
const q = "trusted retailer monitor with good return policy";
assert.deepEqual(buildPhase1216RetailerTrust(q), buildPhase1216RetailerTrust(q), "deterministic output");

// ── Meta-only guarantee ──────────────────────────────────────────────────────
const engineSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/retailerTrustEngine.ts"),
  "utf8"
);
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("localStorage"), "no persistence");
assert.ok(!engineSrc.includes("supabase"), "no database writes");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");
assert.ok(!engineSrc.includes("getStoreTrustScore"), "no post-search retailer scoring");

console.log("phase1216-retailer-trust: ok");
