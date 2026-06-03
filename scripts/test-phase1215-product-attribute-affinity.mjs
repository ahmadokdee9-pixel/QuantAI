#!/usr/bin/env node
/**
 * Phase 12.15 — Product Attribute Affinity Engine tests (offline, no network).
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

const VALID_LEVELS = new Set(["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]);
const VALID_ATTRIBUTES = new Set([
  "performance",
  "quality",
  "design",
  "simplicity",
  "premium",
  "durability",
  "portability",
  "innovation",
]);

function buildPhase1215AttributeAffinity(query) {
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
  return buildProductAttributeAffinity({
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
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.15-v1", `${label} version`);
  assert.ok(VALID_LEVELS.has(meta.attributeLevel), `${label} attributeLevel`);
  assert.ok(VALID_ATTRIBUTES.has(meta.dominantAttribute), `${label} dominantAttribute`);
  for (const key of [
    "performanceAffinity",
    "qualityAffinity",
    "designAffinity",
    "simplicityAffinity",
    "premiumAffinity",
    "durabilityAffinity",
    "portabilityAffinity",
    "innovationAffinity",
  ]) {
    assert.ok(meta[key] >= 0 && meta[key] <= 1, `${label} ${key}`);
  }
  assert.ok(Array.isArray(meta.supportingSignals), `${label} supportingSignals`);
  assert.ok(meta.supportingSignals.length >= 1, `${label} supportingSignals non-empty`);
  assert.equal(typeof meta.confidenceTier, "string", `${label} confidenceTier`);
  assert.ok(meta.confidence >= 0 && meta.confidence <= 1, `${label} confidence`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildProductAttributeAffinity"), "route uses buildProductAttributeAffinity");
assert.ok(route.includes("productAttributeAffinity"), "route exposes productAttributeAffinity meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(
  stabilization.includes("buildProductAttributeAffinity"),
  "stabilization checks product attribute affinity engine"
);
assert.ok(
  stabilization.includes("productAttributeAffinity"),
  "stabilization checks productAttributeAffinity meta"
);

// ── Spec examples ────────────────────────────────────────────────────────────
const gamingLaptop = buildPhase1215AttributeAffinity("best gaming laptop");
assertShape(gamingLaptop, "gaming laptop");
assert.equal(gamingLaptop.dominantAttribute, "performance");
assert.ok(gamingLaptop.performanceAffinity >= 0.9);
assert.ok(gamingLaptop.supportingSignals.includes("performance_language"));

const premiumChair = buildPhase1215AttributeAffinity("premium office chair");
assertShape(premiumChair, "premium office chair");
assert.equal(premiumChair.dominantAttribute, "premium");
assert.ok(premiumChair.premiumAffinity >= 0.85);
assert.ok(premiumChair.supportingSignals.includes("premium_language"));

const travelLaptop = buildPhase1215AttributeAffinity("lightweight laptop for travel");
assertShape(travelLaptop, "travel laptop");
assert.equal(travelLaptop.dominantAttribute, "portability");
assert.ok(travelLaptop.portabilityAffinity >= 0.9);
assert.ok(travelLaptop.supportingSignals.includes("portability_language"));

const beginnerCamera = buildPhase1215AttributeAffinity("simple camera for beginners");
assertShape(beginnerCamera, "beginner camera");
assert.equal(beginnerCamera.dominantAttribute, "simplicity");
assert.ok(beginnerCamera.simplicityAffinity >= 0.85);
assert.ok(beginnerCamera.supportingSignals.includes("simplicity_language"));

// ── Pass-through integrity ───────────────────────────────────────────────────
assert.equal(
  gamingLaptop.confidence,
  buildPhase1215AttributeAffinity("best gaming laptop").confidence
);

// ── Deterministic stability ──────────────────────────────────────────────────
const q = "best gaming laptop";
assert.deepEqual(
  buildPhase1215AttributeAffinity(q),
  buildPhase1215AttributeAffinity(q),
  "deterministic output"
);

// ── Meta-only guarantee ──────────────────────────────────────────────────────
const engineSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/productAttributeAffinityEngine.ts"),
  "utf8"
);
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("localStorage"), "no persistence");
assert.ok(!engineSrc.includes("supabase"), "no database writes");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");

console.log("phase1215-product-attribute-affinity: ok");
