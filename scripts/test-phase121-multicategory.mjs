#!/usr/bin/env node
/**
 * Phase 12.1 — Multi-Category Intelligence tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildQueryIntelligence } from "../lib/intelligence/queryIntelligence.ts";
import { buildMultiCategoryIntelligence } from "../lib/intelligence/multiCategoryIntelligence.ts";

const VALID_CATEGORIES = new Set([
  "electronics",
  "fashion",
  "home",
  "garden",
  "beauty",
  "automotive",
  "sports",
  "toys",
  "books",
  "office",
  "pets",
  "health",
  "general",
]);

function classify(query) {
  const bundle = buildQueryIntelligence(query);
  return buildMultiCategoryIntelligence({
    query,
    shoppingBrain: bundle.shoppingBrain,
    queryIntelligence: bundle.meta,
  });
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.1-v1", `${label} version`);
  assert.ok(VALID_CATEGORIES.has(meta.category), `${label} category`);
  assert.equal(typeof meta.subcategory, "string", `${label} subcategory`);
  assert.ok(meta.subcategory.length >= 2, `${label} subcategory length`);
  assert.ok(meta.confidence >= 0 && meta.confidence <= 1, `${label} confidence`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildMultiCategoryIntelligence"), "route uses buildMultiCategoryIntelligence");
assert.ok(route.includes("multiCategory"), "route exposes multiCategory meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildMultiCategoryIntelligence"), "stabilization checks engine");
assert.ok(stabilization.includes("multiCategory"), "stabilization checks multiCategory meta");

// ── Spec examples ────────────────────────────────────────────────────────────
const gamingLaptop = classify("best gaming laptop under 1500");
assertShape(gamingLaptop, "gaming laptop");
assert.equal(gamingLaptop.category, "electronics");
assert.equal(gamingLaptop.subcategory, "laptop");
assert.ok(gamingLaptop.confidence >= 0.9);

const runningShoes = classify("best running shoes for men");
assertShape(runningShoes, "running shoes");
assert.equal(runningShoes.category, "sports");
assert.equal(runningShoes.subcategory, "running-shoes");
assert.ok(runningShoes.confidence >= 0.9);

const officeChair = classify("modern office chair");
assertShape(officeChair, "office chair");
assert.equal(officeChair.category, "office");
assert.equal(officeChair.subcategory, "chair");
assert.ok(officeChair.confidence >= 0.9);

const gardenTools = classify("garden tools");
assertShape(gardenTools, "garden tools");
assert.equal(gardenTools.category, "garden");
assert.equal(gardenTools.subcategory, "tools");
assert.ok(gardenTools.confidence >= 0.88);

const giftMother = classify("gift for mother");
assertShape(giftMother, "gift for mother");
assert.equal(giftMother.category, "general");
assert.equal(giftMother.subcategory, "gift");
assert.ok(giftMother.confidence >= 0.65 && giftMother.confidence <= 0.75);

// ── Regression suite ─────────────────────────────────────────────────────────
const carVacuum = classify("car vacuum");
assertShape(carVacuum, "car vacuum");
assert.equal(carVacuum.category, "automotive");
assert.equal(carVacuum.subcategory, "car-vacuum");
assert.ok(carVacuum.confidence >= 0.85);

const giftFather = classify("gift for father");
assertShape(giftFather, "gift for father");
assert.equal(giftFather.category, "general");
assert.equal(giftFather.subcategory, "gift");

// ── Deterministic stability ──────────────────────────────────────────────────
const q = "best gaming laptop under 1500";
const a = classify(q);
const b = classify(q);
assert.deepEqual(a, b, "deterministic output");

// ── Meta-only guarantee ──────────────────────────────────────────────────────
const engineSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/multiCategoryIntelligence.ts"),
  "utf8"
);
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");

console.log("phase121-multicategory: ok");
