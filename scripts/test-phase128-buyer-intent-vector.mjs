#!/usr/bin/env node
/**
 * Phase 12.8 — Buyer Intent Vector Engine tests (offline, no network).
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

const VALID_DOMINANT = new Set(["value", "premium", "performance", "convenience", "research", "urgency"]);

function buildPhase12IntentVector(query) {
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
  return buildBuyerIntentVector({
    shoppingBrain: bundle.shoppingBrain,
    multiCategory,
    tasteIntelligence,
    lifestyleIntelligence,
    contextIntelligence,
    intentConfidence,
    memoryPreparation,
    buyerModel,
  });
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.8-v1", `${label} version`);
  for (const key of [
    "valueIntent",
    "premiumIntent",
    "performanceIntent",
    "convenienceIntent",
    "researchIntent",
    "urgencyIntent",
    "confidence",
  ]) {
    assert.ok(meta[key] >= 0 && meta[key] <= 1, `${label} ${key}`);
  }
  assert.ok(VALID_DOMINANT.has(meta.dominantIntent), `${label} dominantIntent`);
  assert.equal(typeof meta.confidenceTier, "string", `${label} confidenceTier`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildBuyerIntentVector"), "route uses buildBuyerIntentVector");
assert.ok(route.includes("buyerIntentVector"), "route exposes buyerIntentVector meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildBuyerIntentVector"), "stabilization checks intent vector engine");
assert.ok(stabilization.includes("buyerIntentVector"), "stabilization checks buyerIntentVector meta");

// ── Spec examples ────────────────────────────────────────────────────────────
const gamingLaptop = buildPhase12IntentVector("best gaming laptop under 1500");
assertShape(gamingLaptop, "gaming laptop");
assert.equal(gamingLaptop.dominantIntent, "performance");
assert.ok(gamingLaptop.performanceIntent >= 0.9);
assert.ok(gamingLaptop.valueIntent >= 0.6);
assert.equal(gamingLaptop.confidenceTier, "VERY_HIGH");

const officeChair = buildPhase12IntentVector("premium office chair");
assertShape(officeChair, "office chair");
assert.equal(officeChair.dominantIntent, "premium");
assert.ok(officeChair.premiumIntent >= 0.9);
assert.equal(officeChair.confidenceTier, "VERY_HIGH");

const replaceVacuum = buildPhase12IntentVector("replace broken vacuum");
assertShape(replaceVacuum, "replace vacuum");
assert.equal(replaceVacuum.dominantIntent, "urgency");
assert.ok(replaceVacuum.urgencyIntent >= 0.7);
assert.ok(replaceVacuum.convenienceIntent >= 0.5);

// ── Regression cases ─────────────────────────────────────────────────────────
const giftFather = buildPhase12IntentVector("gift for father");
assertShape(giftFather, "gift father");
assert.equal(giftFather.confidenceTier, "MEDIUM");

const comparePhones = buildPhase12IntentVector("compare iphone and samsung");
assertShape(comparePhones, "compare phones");
assert.equal(comparePhones.dominantIntent, "research");
assert.ok(comparePhones.researchIntent >= 0.5);

const runningShoes = buildPhase12IntentVector("running shoes for marathon");
assertShape(runningShoes, "running shoes");
assert.ok(runningShoes.performanceIntent >= 0.4);

// ── Pass-through integrity ───────────────────────────────────────────────────
assert.equal(gamingLaptop.confidence, buildPhase12IntentVector("best gaming laptop under 1500").confidence);

// ── Deterministic stability ──────────────────────────────────────────────────
const q = "best gaming laptop under 1500";
assert.deepEqual(buildPhase12IntentVector(q), buildPhase12IntentVector(q), "deterministic output");

// ── Meta-only guarantee ──────────────────────────────────────────────────────
const engineSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/buyerIntentVectorEngine.ts"),
  "utf8"
);
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("localStorage"), "no persistence");
assert.ok(!engineSrc.includes("supabase"), "no database writes");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");

console.log("phase128-buyer-intent-vector: ok");
