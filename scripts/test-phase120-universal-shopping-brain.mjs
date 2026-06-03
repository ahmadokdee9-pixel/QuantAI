#!/usr/bin/env node
/**
 * Phase 12.0 — Universal Shopping Brain tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildQueryIntelligence } from "../lib/intelligence/queryIntelligence.ts";
import { buildUniversalShoppingBrain } from "../lib/intelligence/universalShoppingBrain.ts";
import { buildPhase94QueryIntelligence } from "../lib/search/phase94QueryIntelligence.ts";

const VALID_CATEGORIES = new Set([
  "electronics",
  "fashion",
  "home",
  "garden",
  "sports",
  "automotive",
  "beauty",
  "toys",
  "books",
  "general",
]);

const VALID_PURCHASE = new Set([
  "research",
  "compare",
  "buy_now",
  "best_value",
  "premium",
  "gift",
  "replacement",
]);

const VALID_URGENCY = new Set(["low", "medium", "high"]);
const VALID_VALUE = new Set(["savings", "balanced", "premium"]);
const VALID_QUALITY = new Set(["basic", "standard", "high", "luxury"]);

function assertBrainShape(brain, label) {
  assert.equal(brain.version, "phase12.0-v1", `${label} version`);
  assert.ok(VALID_CATEGORIES.has(brain.categoryIntent), `${label} categoryIntent`);
  assert.ok(VALID_PURCHASE.has(brain.purchaseIntent), `${label} purchaseIntent`);
  assert.ok(VALID_URGENCY.has(brain.urgencyIntent), `${label} urgencyIntent`);
  assert.ok(VALID_VALUE.has(brain.valueIntent), `${label} valueIntent`);
  assert.ok(VALID_QUALITY.has(brain.qualityIntent), `${label} qualityIntent`);
  assert.ok(brain.premiumIntent >= 0 && brain.premiumIntent <= 1, `${label} premiumIntent`);
  assert.equal(typeof brain.budgetIntent.active, "boolean", `${label} budgetIntent.active`);
  assert.ok(brain.confidence >= 0 && brain.confidence <= 1, `${label} confidence`);
}

function bundle(query) {
  return buildQueryIntelligence(query);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildQueryIntelligence"), "route uses buildQueryIntelligence");
assert.ok(route.includes("shoppingBrain"), "route exposes shoppingBrain meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildQueryIntelligence"), "stabilization checks buildQueryIntelligence");
assert.ok(stabilization.includes("shoppingBrain"), "stabilization checks shoppingBrain meta");

// ── Bundle wiring ────────────────────────────────────────────────────────────
const wired = bundle("best laptop under 1000");
assert.equal(wired.meta.version, "phase9.4-v1");
assertBrainShape(wired.shoppingBrain, "bundle");

// ── Spec test cases ──────────────────────────────────────────────────────────
const laptop = bundle("best laptop under 1000");
assertBrainShape(laptop.shoppingBrain, "laptop");
assert.equal(laptop.shoppingBrain.categoryIntent, "electronics");
assert.equal(laptop.shoppingBrain.purchaseIntent, "best_value");
assert.equal(laptop.shoppingBrain.valueIntent, "savings");
assert.equal(laptop.shoppingBrain.budgetIntent.active, true);
assert.equal(laptop.shoppingBrain.budgetIntent.maxPrice, 1000);

const monitor = bundle("cheap gaming monitor");
assertBrainShape(monitor.shoppingBrain, "monitor");
assert.equal(monitor.shoppingBrain.categoryIntent, "electronics");
assert.equal(monitor.shoppingBrain.purchaseIntent, "best_value");
assert.equal(monitor.shoppingBrain.valueIntent, "savings");
assert.equal(monitor.shoppingBrain.qualityIntent, "basic");

const chair = bundle("premium office chair");
assertBrainShape(chair.shoppingBrain, "chair");
assert.equal(chair.shoppingBrain.categoryIntent, "home");
assert.equal(chair.shoppingBrain.purchaseIntent, "premium");
assert.equal(chair.shoppingBrain.valueIntent, "premium");
assert.ok(chair.shoppingBrain.premiumIntent >= 0.5);

const garden = bundle("best garden tools");
assertBrainShape(garden.shoppingBrain, "garden");
assert.equal(garden.shoppingBrain.categoryIntent, "garden");
assert.ok(["research", "best_value"].includes(garden.shoppingBrain.purchaseIntent));

const vacuum = bundle("replace my old vacuum");
assertBrainShape(vacuum.shoppingBrain, "vacuum");
assert.equal(vacuum.shoppingBrain.categoryIntent, "home");
assert.equal(vacuum.shoppingBrain.purchaseIntent, "replacement");
assert.equal(vacuum.shoppingBrain.urgencyIntent, "medium");

const gift = bundle("gift for father");
assertBrainShape(gift.shoppingBrain, "gift");
assert.equal(gift.shoppingBrain.purchaseIntent, "gift");
assert.equal(gift.shoppingBrain.categoryIntent, "general");

// ── Standalone brain accepts optional Phase 9.4 meta ───────────────────────────
const phase94 = buildPhase94QueryIntelligence("compare airpods pro vs airpods 4");
const compareBrain = buildUniversalShoppingBrain("compare airpods pro vs airpods 4", phase94.meta);
assert.equal(compareBrain.purchaseIntent, "compare");
assert.equal(compareBrain.categoryIntent, "electronics");

// ── Products unchanged guarantee (meta-only) ─────────────────────────────────
assert.ok(
  !readFileSync(join(process.cwd(), "lib/intelligence/universalShoppingBrain.ts"), "utf8").includes(
    "products"
  ),
  "shopping brain is query-only"
);

console.log("phase120-universal-shopping-brain: ok");
