#!/usr/bin/env node
/**
 * Phase 12.2 — Taste Intelligence Engine tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildQueryIntelligence } from "../lib/intelligence/queryIntelligence.ts";
import { buildMultiCategoryIntelligence } from "../lib/intelligence/multiCategoryIntelligence.ts";
import { buildTasteIntelligence } from "../lib/intelligence/tasteIntelligenceEngine.ts";

const VALID_STYLES = new Set([
  "minimal",
  "modern",
  "professional",
  "executive",
  "luxury",
  "premium",
  "gaming",
  "sporty",
  "family",
  "creative",
  "elegant",
  "performance",
  "business",
  "casual",
]);

function classify(query) {
  const bundle = buildQueryIntelligence(query);
  const multiCategory = buildMultiCategoryIntelligence({
    query,
    shoppingBrain: bundle.shoppingBrain,
    queryIntelligence: bundle.meta,
  });
  return buildTasteIntelligence({
    query,
    shoppingBrain: bundle.shoppingBrain,
    queryIntelligence: bundle.meta,
    multiCategory,
  });
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.2-v1", `${label} version`);
  assert.ok(VALID_STYLES.has(meta.styleIntent), `${label} styleIntent`);
  assert.equal(typeof meta.aestheticIntent, "string", `${label} aestheticIntent`);
  assert.equal(typeof meta.personalityIntent, "string", `${label} personalityIntent`);
  assert.ok(meta.premiumAffinity >= 0 && meta.premiumAffinity <= 1, `${label} premiumAffinity`);
  assert.ok(meta.confidence >= 0 && meta.confidence <= 1, `${label} confidence`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildTasteIntelligence"), "route uses buildTasteIntelligence");
assert.ok(route.includes("tasteIntelligence"), "route exposes tasteIntelligence meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildTasteIntelligence"), "stabilization checks taste engine");
assert.ok(stabilization.includes("tasteIntelligence"), "stabilization checks tasteIntelligence meta");

// ── Spec examples ────────────────────────────────────────────────────────────
const minimalChair = classify("minimal office chair");
assertShape(minimalChair, "minimal office chair");
assert.equal(minimalChair.styleIntent, "minimal");
assert.equal(minimalChair.aestheticIntent, "modern");
assert.equal(minimalChair.confidence, 1);

const luxuryWatch = classify("luxury watch");
assertShape(luxuryWatch, "luxury watch");
assert.equal(luxuryWatch.styleIntent, "luxury");
assert.equal(luxuryWatch.premiumAffinity, 1);

const professionalMonitor = classify("professional monitor");
assertShape(professionalMonitor, "professional monitor");
assert.equal(professionalMonitor.styleIntent, "professional");
assert.equal(professionalMonitor.personalityIntent, "business");

const gamingKeyboard = classify("gaming keyboard");
assertShape(gamingKeyboard, "gaming keyboard");
assert.equal(gamingKeyboard.styleIntent, "gaming");
assert.equal(gamingKeyboard.personalityIntent, "performance");

const elegantHandbag = classify("elegant handbag");
assertShape(elegantHandbag, "elegant handbag");
assert.equal(elegantHandbag.styleIntent, "elegant");
assert.equal(elegantHandbag.aestheticIntent, "luxury");

// ── Deterministic stability ──────────────────────────────────────────────────
const q = "minimal office chair";
assert.deepEqual(classify(q), classify(q), "deterministic output");

// ── Meta-only guarantee ──────────────────────────────────────────────────────
const engineSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/tasteIntelligenceEngine.ts"),
  "utf8"
);
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");

console.log("phase122-taste-intelligence: ok");
