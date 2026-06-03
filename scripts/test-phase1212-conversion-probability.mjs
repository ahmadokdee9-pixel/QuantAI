#!/usr/bin/env node
/**
 * Phase 12.12 — Conversion Probability Engine tests (offline, no network).
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

const VALID_BANDS = new Set(["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]);

function buildPhase1212Conversion(query) {
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
  return buildConversionProbability({
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
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.12-v1", `${label} version`);
  assert.ok(VALID_BANDS.has(meta.probabilityBand), `${label} probabilityBand`);
  assert.ok(meta.probabilityScore >= 0 && meta.probabilityScore <= 1, `${label} probabilityScore`);
  assert.ok(Array.isArray(meta.drivers), `${label} drivers`);
  assert.ok(Array.isArray(meta.blockers), `${label} blockers`);
  assert.equal(typeof meta.readinessStatus, "string", `${label} readinessStatus`);
  assert.equal(typeof meta.frictionLevel, "string", `${label} frictionLevel`);
  assert.equal(typeof meta.confidenceTier, "string", `${label} confidenceTier`);
  assert.ok(meta.confidence >= 0 && meta.confidence <= 1, `${label} confidence`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildConversionProbability"), "route uses buildConversionProbability");
assert.ok(route.includes("conversionProbability"), "route exposes conversionProbability meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(
  stabilization.includes("buildConversionProbability"),
  "stabilization checks conversion probability engine"
);
assert.ok(
  stabilization.includes("conversionProbability"),
  "stabilization checks conversionProbability meta"
);

// ── Spec examples ────────────────────────────────────────────────────────────
const replaceVacuum = buildPhase1212Conversion("replace broken vacuum");
assertShape(replaceVacuum, "replace vacuum");
assert.equal(replaceVacuum.probabilityBand, "VERY_HIGH");
assert.ok(replaceVacuum.probabilityScore >= 0.8);
assert.equal(replaceVacuum.readinessStatus, "READY_TO_BUY");
assert.equal(replaceVacuum.frictionLevel, "LOW");
assert.ok(replaceVacuum.drivers.includes("ready_to_buy_readiness"));

const premiumChair = buildPhase1212Conversion("premium office chair");
assertShape(premiumChair, "premium chair");
assert.equal(premiumChair.probabilityBand, "HIGH");
assert.ok(premiumChair.probabilityScore >= 0.65 && premiumChair.probabilityScore <= 0.85);
assert.ok(premiumChair.drivers.includes("premium_certainty"));

const gamingLaptop = buildPhase1212Conversion("best gaming laptop under 1500");
assertShape(gamingLaptop, "gaming laptop");
assert.equal(gamingLaptop.probabilityBand, "MEDIUM");
assert.ok(gamingLaptop.probabilityScore >= 0.4 && gamingLaptop.probabilityScore <= 0.6);
assert.equal(gamingLaptop.readinessStatus, "NEEDS_RESEARCH");

const comparePhones = buildPhase1212Conversion("compare iphone and samsung");
assertShape(comparePhones, "compare phones");
assert.equal(comparePhones.probabilityBand, "LOW");
assert.ok(comparePhones.probabilityScore <= 0.4);
assert.equal(comparePhones.readinessStatus, "NEEDS_COMPARE");
assert.ok(comparePhones.blockers.includes("comparison_decision_pending"));

const helpChoose = buildPhase1212Conversion("help me choose");
assertShape(helpChoose, "help me choose");
assert.equal(helpChoose.probabilityBand, "VERY_LOW");
assert.ok(helpChoose.probabilityScore <= 0.2);
assert.ok(helpChoose.blockers.includes("uncertain_shopping_intent"));

// ── Pass-through integrity ───────────────────────────────────────────────────
assert.equal(
  gamingLaptop.confidence,
  buildPhase1212Conversion("best gaming laptop under 1500").confidence
);

// ── Deterministic stability ──────────────────────────────────────────────────
const q = "compare iphone and samsung";
assert.deepEqual(buildPhase1212Conversion(q), buildPhase1212Conversion(q), "deterministic output");

// ── Meta-only guarantee ──────────────────────────────────────────────────────
const engineSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/conversionProbabilityEngine.ts"),
  "utf8"
);
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("localStorage"), "no persistence");
assert.ok(!engineSrc.includes("supabase"), "no database writes");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");

console.log("phase1212-conversion-probability: ok");
