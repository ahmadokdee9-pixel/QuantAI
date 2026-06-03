#!/usr/bin/env node
/**
 * Phase 12.4 — Context Intelligence Engine tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildQueryIntelligence } from "../lib/intelligence/queryIntelligence.ts";
import { buildMultiCategoryIntelligence } from "../lib/intelligence/multiCategoryIntelligence.ts";
import { buildTasteIntelligence } from "../lib/intelligence/tasteIntelligenceEngine.ts";
import { buildLifestyleIntelligence } from "../lib/intelligence/lifestyleIntelligenceEngine.ts";
import { buildContextIntelligence } from "../lib/intelligence/contextIntelligenceEngine.ts";

const VALID_PURCHASE = new Set([
  "first_purchase",
  "upgrade",
  "replacement",
  "research",
  "gift",
  "comparison",
  "bulk_purchase",
  "subscription",
  "general",
]);

const VALID_URGENCY = new Set(["low", "medium", "high", "emergency"]);
const VALID_LIFECYCLE = new Set([
  "new_user",
  "active_user",
  "power_user",
  "professional",
  "enterprise",
  "general",
]);

function classify(query) {
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
  return buildContextIntelligence({
    query,
    shoppingBrain: bundle.shoppingBrain,
    queryIntelligence: bundle.meta,
    multiCategory,
    tasteIntelligence,
    lifestyleIntelligence,
  });
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.4-v1", `${label} version`);
  assert.ok(VALID_PURCHASE.has(meta.purchaseContext), `${label} purchaseContext`);
  assert.ok(VALID_URGENCY.has(meta.urgencyContext), `${label} urgencyContext`);
  assert.ok(VALID_LIFECYCLE.has(meta.lifecycleContext), `${label} lifecycleContext`);
  assert.ok(meta.confidence >= 0 && meta.confidence <= 1, `${label} confidence`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildContextIntelligence"), "route uses buildContextIntelligence");
assert.ok(route.includes("contextIntelligence"), "route exposes contextIntelligence meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildContextIntelligence"), "stabilization checks context engine");
assert.ok(stabilization.includes("contextIntelligence"), "stabilization checks contextIntelligence meta");

// ── Regression cases ─────────────────────────────────────────────────────────
const firstLaptop = classify("first laptop for college");
assertShape(firstLaptop, "first laptop");
assert.equal(firstLaptop.purchaseContext, "first_purchase");
assert.equal(firstLaptop.lifecycleContext, "new_user");
assert.ok(["low", "medium"].includes(firstLaptop.urgencyContext));

const replaceVacuum = classify("replace broken vacuum");
assertShape(replaceVacuum, "replace vacuum");
assert.equal(replaceVacuum.purchaseContext, "replacement");
assert.ok(["medium", "high"].includes(replaceVacuum.urgencyContext));

const urgentCharger = classify("urgent phone charger");
assertShape(urgentCharger, "urgent charger");
assert.ok(["high", "emergency"].includes(urgentCharger.urgencyContext));

const upgradeMonitor = classify("upgrade my gaming monitor");
assertShape(upgradeMonitor, "upgrade monitor");
assert.equal(upgradeMonitor.purchaseContext, "upgrade");
assert.ok(["active_user", "power_user"].includes(upgradeMonitor.lifecycleContext));

const comparePhones = classify("compare iphone and samsung");
assertShape(comparePhones, "compare phones");
assert.equal(comparePhones.purchaseContext, "comparison");

const giftFather = classify("gift for father");
assertShape(giftFather, "gift father");
assert.equal(giftFather.purchaseContext, "gift");

const bulkChairs = classify("buy office chairs for company");
assertShape(bulkChairs, "bulk chairs");
assert.equal(bulkChairs.purchaseContext, "bulk_purchase");
assert.equal(bulkChairs.lifecycleContext, "enterprise");

const proCamera = classify("professional camera for work");
assertShape(proCamera, "pro camera");
assert.ok(["research", "first_purchase", "general"].includes(proCamera.purchaseContext));
assert.equal(proCamera.lifecycleContext, "professional");
assert.ok(proCamera.confidence >= 0.8);

// ── Deterministic stability ──────────────────────────────────────────────────
const q = "replace broken vacuum";
assert.deepEqual(classify(q), classify(q), "deterministic output");

// ── Meta-only guarantee ──────────────────────────────────────────────────────
const engineSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/contextIntelligenceEngine.ts"),
  "utf8"
);
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");

console.log("phase124-context-intelligence: ok");
