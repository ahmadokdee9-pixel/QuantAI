#!/usr/bin/env node
/**
 * Phase 12.9 — Shopper Psychology Engine tests (offline, no network).
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

const VALID_PSYCHOLOGY = new Set([
  "rational",
  "emotional",
  "premium",
  "value",
  "research",
  "convenience",
  "urgency",
]);

function buildPhase12Psychology(query) {
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
  return buildShopperPsychology({
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
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.9-v1", `${label} version`);
  assert.ok(VALID_PSYCHOLOGY.has(meta.primaryPsychology), `${label} primaryPsychology`);
  for (const key of ["rational", "emotional", "premium", "value", "research", "convenience", "urgency"]) {
    assert.ok(meta.psychologyScores[key] >= 0 && meta.psychologyScores[key] <= 1, `${label} ${key}`);
  }
  assert.equal(typeof meta.confidenceTier, "string", `${label} confidenceTier`);
  assert.ok(meta.confidence >= 0 && meta.confidence <= 1, `${label} confidence`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildShopperPsychology"), "route uses buildShopperPsychology");
assert.ok(route.includes("shopperPsychology"), "route exposes shopperPsychology meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildShopperPsychology"), "stabilization checks psychology engine");
assert.ok(stabilization.includes("shopperPsychology"), "stabilization checks shopperPsychology meta");

// ── Spec examples ────────────────────────────────────────────────────────────
const gamingLaptop = buildPhase12Psychology("best gaming laptop under 1500");
assertShape(gamingLaptop, "gaming laptop");
assert.equal(gamingLaptop.primaryPsychology, "rational");
assert.ok(gamingLaptop.psychologyScores.research >= 0.9);
assert.equal(gamingLaptop.confidenceTier, "VERY_HIGH");

const officeChair = buildPhase12Psychology("premium office chair");
assertShape(officeChair, "office chair");
assert.equal(officeChair.primaryPsychology, "premium");
assert.equal(officeChair.psychologyScores.premium, 1);
assert.equal(officeChair.confidenceTier, "VERY_HIGH");

const giftFather = buildPhase12Psychology("gift for father");
assertShape(giftFather, "gift father");
assert.equal(giftFather.primaryPsychology, "emotional");
assert.ok(giftFather.psychologyScores.emotional >= 0.9);
assert.equal(giftFather.confidenceTier, "MEDIUM");

const replaceVacuum = buildPhase12Psychology("replace broken vacuum");
assertShape(replaceVacuum, "replace vacuum");
assert.equal(replaceVacuum.primaryPsychology, "urgency");
assert.equal(replaceVacuum.psychologyScores.urgency, 1);
assert.equal(replaceVacuum.confidenceTier, "VERY_HIGH");

const cheapMonitor = buildPhase12Psychology("cheap monitor deal");
assertShape(cheapMonitor, "cheap monitor deal");
assert.equal(cheapMonitor.primaryPsychology, "value");
assert.ok(cheapMonitor.psychologyScores.value >= 0.9);

// ── Comparison boosts rational ───────────────────────────────────────────────
const comparePhones = buildPhase12Psychology("compare iphone and samsung");
assertShape(comparePhones, "compare phones");
assert.ok(comparePhones.psychologyScores.rational >= 0.7);

// ── Pass-through integrity ───────────────────────────────────────────────────
assert.equal(gamingLaptop.confidence, buildPhase12Psychology("best gaming laptop under 1500").confidence);

// ── Deterministic stability ──────────────────────────────────────────────────
const q = "best gaming laptop under 1500";
assert.deepEqual(buildPhase12Psychology(q), buildPhase12Psychology(q), "deterministic output");

// ── Meta-only guarantee ──────────────────────────────────────────────────────
const engineSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/shopperPsychologyEngine.ts"),
  "utf8"
);
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("localStorage"), "no persistence");
assert.ok(!engineSrc.includes("supabase"), "no database writes");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");

console.log("phase129-shopper-psychology: ok");
