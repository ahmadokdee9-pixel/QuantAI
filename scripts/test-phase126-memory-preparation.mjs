#!/usr/bin/env node
/**
 * Phase 12.6 — Memory Preparation Engine tests (offline, no network).
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

function buildPhase12Stack(query) {
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
  return buildMemoryPreparation({
    shoppingBrain: bundle.shoppingBrain,
    multiCategory,
    tasteIntelligence,
    lifestyleIntelligence,
    contextIntelligence,
    intentConfidence,
  });
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.6-v1", `${label} version`);
  assert.ok(Array.isArray(meta.buyerProfile.categoryAffinity), `${label} categoryAffinity`);
  assert.ok(Array.isArray(meta.buyerProfile.tasteProfile), `${label} tasteProfile`);
  assert.ok(Array.isArray(meta.buyerProfile.lifestyleProfile), `${label} lifestyleProfile`);
  assert.ok(Array.isArray(meta.buyerProfile.contextProfile), `${label} contextProfile`);
  assert.equal(typeof meta.buyerProfile.confidenceTier, "string", `${label} confidenceTier`);
  assert.ok(meta.readinessScore >= 0 && meta.readinessScore <= 1, `${label} readinessScore`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildMemoryPreparation"), "route uses buildMemoryPreparation");
assert.ok(route.includes("memoryPreparation"), "route exposes memoryPreparation meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildMemoryPreparation"), "stabilization checks memory prep engine");
assert.ok(stabilization.includes("memoryPreparation"), "stabilization checks memoryPreparation meta");

// ── Regression cases ─────────────────────────────────────────────────────────
const gamingLaptop = buildPhase12Stack("best gaming laptop under 1500");
assertShape(gamingLaptop, "gaming laptop");
assert.ok(gamingLaptop.buyerProfile.categoryAffinity.includes("electronics"));
assert.ok(gamingLaptop.buyerProfile.categoryAffinity.includes("laptop"));
assert.ok(gamingLaptop.buyerProfile.tasteProfile.includes("gaming"));
assert.equal(gamingLaptop.buyerProfile.confidenceTier, "VERY_HIGH");
assert.ok(gamingLaptop.readinessScore >= 0.9);

const officeChair = buildPhase12Stack("premium office chair");
assertShape(officeChair, "office chair");
assert.ok(officeChair.buyerProfile.categoryAffinity.includes("office"));
assert.ok(officeChair.buyerProfile.tasteProfile.includes("premium"));

const giftFather = buildPhase12Stack("gift for father");
assertShape(giftFather, "gift father");
assert.ok(giftFather.buyerProfile.categoryAffinity.includes("general"));
assert.ok(giftFather.buyerProfile.contextProfile.includes("gift"));
assert.equal(giftFather.buyerProfile.confidenceTier, "MEDIUM");

const replaceVacuum = buildPhase12Stack("replace broken vacuum");
assertShape(replaceVacuum, "replace vacuum");
assert.ok(replaceVacuum.buyerProfile.contextProfile.includes("replacement"));
assert.ok(replaceVacuum.buyerProfile.categoryAffinity.includes("home"));

const comparePhones = buildPhase12Stack("compare iphone and samsung");
assertShape(comparePhones, "compare phones");
assert.ok(comparePhones.buyerProfile.contextProfile.includes("comparison"));
assert.equal(comparePhones.buyerProfile.confidenceTier, "VERY_HIGH");

const runningShoes = buildPhase12Stack("running shoes for marathon");
assertShape(runningShoes, "running shoes");
assert.ok(runningShoes.buyerProfile.categoryAffinity.includes("sports"));
assert.ok(runningShoes.buyerProfile.lifestyleProfile.includes("fitness"));

const proCamera = buildPhase12Stack("professional camera for work");
assertShape(proCamera, "pro camera");
assert.ok(proCamera.buyerProfile.lifestyleProfile.includes("professional"));
assert.ok(proCamera.buyerProfile.lifestyleProfile.includes("work"));

// ── Deterministic stability ──────────────────────────────────────────────────
const q = "best gaming laptop under 1500";
assert.deepEqual(buildPhase12Stack(q), buildPhase12Stack(q), "deterministic output");

// ── No persistence guarantee ─────────────────────────────────────────────────
const engineSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/memoryPreparationEngine.ts"),
  "utf8"
);
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("localStorage"), "no browser persistence");
assert.ok(!engineSrc.includes("supabase"), "no database writes");
assert.ok(!/\b(writeFile|insert\(|upsert\(|saveMemory)\b/.test(engineSrc), "no persistence APIs");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");

console.log("phase126-memory-preparation: ok");
