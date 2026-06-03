#!/usr/bin/env node
/**
 * Phase 12.5 — Intent Confidence Engine tests (offline, no network).
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

const VALID_TIERS = new Set(["VERY_HIGH", "HIGH", "MEDIUM", "LOW", "UNCERTAIN"]);

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
  return buildIntentConfidence({
    query,
    shoppingBrain: bundle.shoppingBrain,
    multiCategory,
    tasteIntelligence,
    lifestyleIntelligence,
    contextIntelligence,
  });
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.5-v1", `${label} version`);
  assert.ok(meta.overallConfidence >= 0 && meta.overallConfidence <= 1, `${label} overallConfidence`);
  assert.ok(meta.categoryConfidence >= 0 && meta.categoryConfidence <= 1, `${label} categoryConfidence`);
  assert.ok(meta.tasteConfidence >= 0 && meta.tasteConfidence <= 1, `${label} tasteConfidence`);
  assert.ok(meta.lifestyleConfidence >= 0 && meta.lifestyleConfidence <= 1, `${label} lifestyleConfidence`);
  assert.ok(meta.contextConfidence >= 0 && meta.contextConfidence <= 1, `${label} contextConfidence`);
  assert.ok(VALID_TIERS.has(meta.confidenceTier), `${label} confidenceTier`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildIntentConfidence"), "route uses buildIntentConfidence");
assert.ok(route.includes("intentConfidence"), "route exposes intentConfidence meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildIntentConfidence"), "stabilization checks intent confidence engine");
assert.ok(stabilization.includes("intentConfidence"), "stabilization checks intentConfidence meta");

// ── Spec examples ────────────────────────────────────────────────────────────
const gamingLaptop = buildPhase12Stack("best gaming laptop under 1500");
assertShape(gamingLaptop, "gaming laptop");
assert.equal(gamingLaptop.confidenceTier, "VERY_HIGH");
assert.ok(gamingLaptop.overallConfidence >= 0.9);

const giftFather = buildPhase12Stack("gift for father");
assertShape(giftFather, "gift for father");
assert.equal(giftFather.confidenceTier, "MEDIUM");

const somethingNice = buildPhase12Stack("something nice");
assertShape(somethingNice, "something nice");
assert.equal(somethingNice.confidenceTier, "LOW");

const helpChoose = buildPhase12Stack("help me choose");
assertShape(helpChoose, "help me choose");
assert.equal(helpChoose.confidenceTier, "UNCERTAIN");

// ── Regression cases ─────────────────────────────────────────────────────────
const officeChair = buildPhase12Stack("premium office chair");
assertShape(officeChair, "premium office chair");
assert.ok(["VERY_HIGH", "HIGH"].includes(officeChair.confidenceTier));

const replaceVacuum = buildPhase12Stack("replace broken vacuum");
assertShape(replaceVacuum, "replace broken vacuum");
assert.ok(["VERY_HIGH", "HIGH", "MEDIUM"].includes(replaceVacuum.confidenceTier));

const comparePhones = buildPhase12Stack("compare iphone and samsung");
assertShape(comparePhones, "compare phones");
assert.ok(["VERY_HIGH", "HIGH"].includes(comparePhones.confidenceTier));

// ── Layer passthrough integrity ──────────────────────────────────────────────
assert.ok(gamingLaptop.categoryConfidence > 0, "category confidence propagated");
assert.ok(gamingLaptop.lifestyleConfidence > 0, "lifestyle confidence propagated");
assert.ok(gamingLaptop.contextConfidence > 0, "context confidence propagated");

// ── Deterministic stability ──────────────────────────────────────────────────
const q = "best gaming laptop under 1500";
assert.deepEqual(buildPhase12Stack(q), buildPhase12Stack(q), "deterministic output");

// ── Meta-only guarantee ──────────────────────────────────────────────────────
const engineSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/intentConfidenceEngine.ts"),
  "utf8"
);
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");

console.log("phase125-intent-confidence: ok");
