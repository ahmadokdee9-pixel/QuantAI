#!/usr/bin/env node
/**
 * Phase 12.7 — Universal Buyer Model Engine tests (offline, no network).
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

const VALID_BUYER_TYPES = new Set([
  "performance_buyer",
  "premium_buyer",
  "value_buyer",
  "business_buyer",
  "creator_buyer",
  "family_buyer",
  "student_buyer",
  "professional_buyer",
  "gamer_buyer",
  "research_buyer",
  "general_buyer",
]);

function buildPhase12BuyerModel(query) {
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
  return buildUniversalBuyerModel({
    shoppingBrain: bundle.shoppingBrain,
    multiCategory,
    tasteIntelligence,
    lifestyleIntelligence,
    contextIntelligence,
    intentConfidence,
    memoryPreparation,
  });
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.7-v1", `${label} version`);
  assert.ok(VALID_BUYER_TYPES.has(meta.buyerType), `${label} buyerType`);
  assert.ok(Array.isArray(meta.categoryAffinity), `${label} categoryAffinity`);
  assert.ok(Array.isArray(meta.tasteAffinity), `${label} tasteAffinity`);
  assert.ok(Array.isArray(meta.lifestyleAffinity), `${label} lifestyleAffinity`);
  assert.ok(Array.isArray(meta.contextAffinity), `${label} contextAffinity`);
  assert.equal(typeof meta.confidenceTier, "string", `${label} confidenceTier`);
  assert.ok(meta.readinessScore >= 0 && meta.readinessScore <= 1, `${label} readinessScore`);
  assert.ok(meta.confidence >= 0 && meta.confidence <= 1, `${label} confidence`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildUniversalBuyerModel"), "route uses buildUniversalBuyerModel");
assert.ok(route.includes("buyerModel"), "route exposes buyerModel meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildUniversalBuyerModel"), "stabilization checks buyer model engine");
assert.ok(stabilization.includes("buyerModel"), "stabilization checks buyerModel meta");

// ── Spec example ─────────────────────────────────────────────────────────────
const gamingLaptop = buildPhase12BuyerModel("best gaming laptop under 1500");
assertShape(gamingLaptop, "gaming laptop");
assert.equal(gamingLaptop.buyerType, "gamer_buyer");
assert.deepEqual(gamingLaptop.categoryAffinity, ["electronics", "laptop"]);
assert.ok(gamingLaptop.tasteAffinity.includes("gaming"));
assert.ok(gamingLaptop.tasteAffinity.includes("performance"));
assert.ok(gamingLaptop.lifestyleAffinity.includes("gamer"));
assert.equal(gamingLaptop.confidenceTier, "VERY_HIGH");
assert.equal(gamingLaptop.readinessScore, 1);
assert.ok(gamingLaptop.confidence >= 0.9);

// ── Regression cases ─────────────────────────────────────────────────────────
const officeChair = buildPhase12BuyerModel("premium office chair");
assertShape(officeChair, "office chair");
assert.ok(["premium_buyer", "business_buyer", "professional_buyer"].includes(officeChair.buyerType));
assert.ok(officeChair.categoryAffinity.includes("office"));

const giftFather = buildPhase12BuyerModel("gift for father");
assertShape(giftFather, "gift father");
assert.equal(giftFather.buyerType, "family_buyer");
assert.equal(giftFather.confidenceTier, "MEDIUM");

const replaceVacuum = buildPhase12BuyerModel("replace broken vacuum");
assertShape(replaceVacuum, "replace vacuum");
assert.ok(replaceVacuum.contextAffinity.includes("replacement"));

const comparePhones = buildPhase12BuyerModel("compare iphone and samsung");
assertShape(comparePhones, "compare phones");
assert.equal(comparePhones.buyerType, "research_buyer");
assert.ok(comparePhones.contextAffinity.includes("comparison"));

const runningShoes = buildPhase12BuyerModel("running shoes for marathon");
assertShape(runningShoes, "running shoes");
assert.ok(["performance_buyer", "value_buyer", "general_buyer"].includes(runningShoes.buyerType));

const proCamera = buildPhase12BuyerModel("professional camera for work");
assertShape(proCamera, "pro camera");
assert.equal(proCamera.buyerType, "professional_buyer");

// ── Pass-through integrity (no new confidence logic) ─────────────────────────
assert.equal(gamingLaptop.confidenceTier, buildPhase12BuyerModel("best gaming laptop under 1500").confidenceTier);
assert.equal(gamingLaptop.readinessScore, buildPhase12BuyerModel("best gaming laptop under 1500").readinessScore);

// ── Deterministic stability ──────────────────────────────────────────────────
const q = "best gaming laptop under 1500";
assert.deepEqual(buildPhase12BuyerModel(q), buildPhase12BuyerModel(q), "deterministic output");

// ── Meta-only guarantee ──────────────────────────────────────────────────────
const engineSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/universalBuyerModelEngine.ts"),
  "utf8"
);
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("localStorage"), "no persistence");
assert.ok(!engineSrc.includes("supabase"), "no database writes");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");

console.log("phase127-buyer-model: ok");
