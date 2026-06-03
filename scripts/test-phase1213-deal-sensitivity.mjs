#!/usr/bin/env node
/**
 * Phase 12.13 — Deal Sensitivity Engine tests (offline, no network).
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

const VALID_LEVELS = new Set(["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]);

function buildPhase1213DealSensitivity(query) {
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
  return buildDealSensitivity({
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
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.13-v1", `${label} version`);
  assert.ok(VALID_LEVELS.has(meta.sensitivityLevel), `${label} sensitivityLevel`);
  assert.ok(meta.sensitivityScore >= 0 && meta.sensitivityScore <= 1, `${label} sensitivityScore`);
  for (const key of ["priceFocus", "discountFocus", "valueFocus", "premiumTolerance"]) {
    assert.ok(meta[key] >= 0 && meta[key] <= 1, `${label} ${key}`);
  }
  assert.ok(Array.isArray(meta.signals), `${label} signals`);
  assert.ok(meta.signals.length >= 1, `${label} signals non-empty`);
  assert.equal(typeof meta.confidenceTier, "string", `${label} confidenceTier`);
  assert.ok(meta.confidence >= 0 && meta.confidence <= 1, `${label} confidence`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildDealSensitivity"), "route uses buildDealSensitivity");
assert.ok(route.includes("dealSensitivity"), "route exposes dealSensitivity meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildDealSensitivity"), "stabilization checks deal sensitivity engine");
assert.ok(stabilization.includes("dealSensitivity"), "stabilization checks dealSensitivity meta");

// ── Spec examples ────────────────────────────────────────────────────────────
const monitorUnder200 = buildPhase1213DealSensitivity("best monitor under 200");
assertShape(monitorUnder200, "monitor under 200");
assert.equal(monitorUnder200.sensitivityLevel, "VERY_HIGH");
assert.ok(monitorUnder200.sensitivityScore >= 0.8);
assert.ok(monitorUnder200.priceFocus >= 0.5);

const cheapChair = buildPhase1213DealSensitivity("cheap office chair");
assertShape(cheapChair, "cheap office chair");
assert.equal(cheapChair.sensitivityLevel, "VERY_HIGH");
assert.ok(cheapChair.sensitivityScore >= 0.8);
assert.ok(cheapChair.signals.includes("high_deal_language"));

const bestValueLaptop = buildPhase1213DealSensitivity("best value laptop");
assertShape(bestValueLaptop, "best value laptop");
assert.equal(bestValueLaptop.sensitivityLevel, "HIGH");
assert.ok(bestValueLaptop.sensitivityScore >= 0.6 && bestValueLaptop.sensitivityScore <= 0.85);
assert.ok(bestValueLaptop.valueFocus >= 0.5);

const premiumChair = buildPhase1213DealSensitivity("premium office chair");
assertShape(premiumChair, "premium office chair");
assert.equal(premiumChair.sensitivityLevel, "LOW");
assert.ok(premiumChair.sensitivityScore <= 0.4);
assert.ok(premiumChair.premiumTolerance >= 0.4);

const proCamera = buildPhase1213DealSensitivity("professional camera for work");
assertShape(proCamera, "professional camera");
assert.equal(proCamera.sensitivityLevel, "VERY_LOW");
assert.ok(proCamera.sensitivityScore <= 0.2);

const replaceFridge = buildPhase1213DealSensitivity("replace broken refrigerator now");
assertShape(replaceFridge, "replace refrigerator");
assert.equal(replaceFridge.sensitivityLevel, "VERY_LOW");
assert.ok(replaceFridge.sensitivityScore <= 0.2);
assert.ok(replaceFridge.signals.includes("urgency_reduces_deal_focus"));

// ── Pass-through integrity ───────────────────────────────────────────────────
assert.equal(
  monitorUnder200.confidence,
  buildPhase1213DealSensitivity("best monitor under 200").confidence
);

// ── Deterministic stability ──────────────────────────────────────────────────
const q = "cheap office chair";
assert.deepEqual(buildPhase1213DealSensitivity(q), buildPhase1213DealSensitivity(q), "deterministic output");

// ── Meta-only guarantee ──────────────────────────────────────────────────────
const engineSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/dealSensitivityEngine.ts"),
  "utf8"
);
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("localStorage"), "no persistence");
assert.ok(!engineSrc.includes("supabase"), "no database writes");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");

console.log("phase1213-deal-sensitivity: ok");
