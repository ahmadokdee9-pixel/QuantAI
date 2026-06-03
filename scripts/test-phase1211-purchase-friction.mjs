#!/usr/bin/env node
/**
 * Phase 12.11 — Purchase Friction Engine tests (offline, no network).
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

const VALID_LEVELS = new Set(["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]);

function buildPhase1211Friction(query) {
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
  return buildPurchaseFriction({
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
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.11-v1", `${label} version`);
  assert.ok(VALID_LEVELS.has(meta.frictionLevel), `${label} frictionLevel`);
  assert.ok(meta.frictionScore >= 0 && meta.frictionScore <= 1, `${label} frictionScore`);
  assert.ok(Array.isArray(meta.blockers), `${label} blockers`);
  assert.ok(Array.isArray(meta.hesitationSignals), `${label} hesitationSignals`);
  assert.ok(meta.hesitationSignals.length >= 1, `${label} hesitationSignals non-empty`);
  assert.equal(typeof meta.confidenceTier, "string", `${label} confidenceTier`);
  assert.ok(meta.confidence >= 0 && meta.confidence <= 1, `${label} confidence`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildPurchaseFriction"), "route uses buildPurchaseFriction");
assert.ok(route.includes("purchaseFriction"), "route exposes purchaseFriction meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildPurchaseFriction"), "stabilization checks friction engine");
assert.ok(stabilization.includes("purchaseFriction"), "stabilization checks purchaseFriction meta");

// ── Spec examples ────────────────────────────────────────────────────────────
const replaceVacuum = buildPhase1211Friction("replace broken vacuum");
assertShape(replaceVacuum, "replace vacuum");
assert.equal(replaceVacuum.frictionLevel, "LOW");
assert.ok(replaceVacuum.frictionScore <= 0.4);

const comparePhones = buildPhase1211Friction("compare iphone and samsung");
assertShape(comparePhones, "compare phones");
assert.equal(comparePhones.frictionLevel, "HIGH");
assert.ok(comparePhones.frictionScore >= 0.6);
assert.ok(comparePhones.blockers.includes("comparison_context_active"));

const helpChoose = buildPhase1211Friction("help me choose");
assertShape(helpChoose, "help me choose");
assert.equal(helpChoose.frictionLevel, "VERY_HIGH");
assert.ok(helpChoose.frictionScore >= 0.8);

const gamingLaptop = buildPhase1211Friction("best gaming laptop under 1500");
assertShape(gamingLaptop, "gaming laptop");
assert.equal(gamingLaptop.frictionLevel, "MEDIUM");
assert.ok(gamingLaptop.frictionScore >= 0.4 && gamingLaptop.frictionScore <= 0.6);

const premiumChair = buildPhase1211Friction("premium office chair");
assertShape(premiumChair, "premium chair");
assert.equal(premiumChair.frictionLevel, "LOW");
assert.ok(premiumChair.frictionScore <= 0.4);

// ── Pass-through integrity ───────────────────────────────────────────────────
assert.equal(
  gamingLaptop.confidence,
  buildPhase1211Friction("best gaming laptop under 1500").confidence
);

// ── Deterministic stability ──────────────────────────────────────────────────
const q = "compare iphone and samsung";
assert.deepEqual(buildPhase1211Friction(q), buildPhase1211Friction(q), "deterministic output");

// ── Meta-only guarantee ──────────────────────────────────────────────────────
const engineSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/purchaseFrictionEngine.ts"),
  "utf8"
);
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("localStorage"), "no persistence");
assert.ok(!engineSrc.includes("supabase"), "no database writes");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");

console.log("phase1211-purchase-friction: ok");
