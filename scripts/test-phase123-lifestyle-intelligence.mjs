#!/usr/bin/env node
/**
 * Phase 12.3 — Lifestyle Intelligence Engine tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildQueryIntelligence } from "../lib/intelligence/queryIntelligence.ts";
import { buildMultiCategoryIntelligence } from "../lib/intelligence/multiCategoryIntelligence.ts";
import { buildTasteIntelligence } from "../lib/intelligence/tasteIntelligenceEngine.ts";
import { buildLifestyleIntelligence } from "../lib/intelligence/lifestyleIntelligenceEngine.ts";

const VALID_LIFESTYLES = new Set([
  "student",
  "professional",
  "business",
  "creator",
  "gamer",
  "traveler",
  "parent",
  "fitness",
  "home_owner",
  "outdoor",
  "luxury_buyer",
  "budget_buyer",
  "general",
]);

const VALID_USE_CASES = new Set([
  "work",
  "study",
  "gaming",
  "travel",
  "home",
  "sport",
  "creative_work",
  "family",
  "daily_use",
  "gift",
  "upgrade",
  "replacement",
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
  return buildLifestyleIntelligence({
    query,
    shoppingBrain: bundle.shoppingBrain,
    queryIntelligence: bundle.meta,
    multiCategory,
    tasteIntelligence,
  });
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.3-v1", `${label} version`);
  assert.ok(VALID_LIFESTYLES.has(meta.lifestyleIntent), `${label} lifestyleIntent`);
  assert.ok(VALID_USE_CASES.has(meta.useCaseIntent), `${label} useCaseIntent`);
  assert.ok(meta.confidence >= 0 && meta.confidence <= 1, `${label} confidence`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildLifestyleIntelligence"), "route uses buildLifestyleIntelligence");
assert.ok(route.includes("lifestyleIntelligence"), "route exposes lifestyleIntelligence meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildLifestyleIntelligence"), "stabilization checks lifestyle engine");
assert.ok(stabilization.includes("lifestyleIntelligence"), "stabilization checks lifestyleIntelligence meta");

// ── Required query coverage ───────────────────────────────────────────────────
const studentLaptop = classify("best laptop for students under 1000");
assertShape(studentLaptop, "student laptop");
assert.equal(studentLaptop.lifestyleIntent, "student");
assert.equal(studentLaptop.useCaseIntent, "study");
assert.ok(studentLaptop.confidence >= 0.85);

const gamingKeyboard = classify("gaming keyboard for competitive fps");
assertShape(gamingKeyboard, "gaming keyboard");
assert.equal(gamingKeyboard.lifestyleIntent, "gamer");
assert.equal(gamingKeyboard.useCaseIntent, "gaming");
assert.ok(gamingKeyboard.confidence >= 0.88);

const officeChair = classify("premium office chair for business workspace");
assertShape(officeChair, "office chair");
assert.ok(["business", "professional", "luxury_buyer"].includes(officeChair.lifestyleIntent));
assert.equal(officeChair.useCaseIntent, "work");
assert.ok(officeChair.confidence >= 0.85);

const travelBackpack = classify("travel backpack for digital nomad");
assertShape(travelBackpack, "travel backpack");
assert.equal(travelBackpack.lifestyleIntent, "traveler");
assert.equal(travelBackpack.useCaseIntent, "travel");
assert.ok(travelBackpack.confidence >= 0.88);

const runningShoes = classify("running shoes for marathon training");
assertShape(runningShoes, "running shoes");
assert.equal(runningShoes.lifestyleIntent, "fitness");
assert.equal(runningShoes.useCaseIntent, "sport");
assert.ok(runningShoes.confidence >= 0.85);

const kidsTablet = classify("safe tablet for kids");
assertShape(kidsTablet, "kids tablet");
assert.equal(kidsTablet.lifestyleIntent, "parent");
assert.equal(kidsTablet.useCaseIntent, "family");
assert.ok(kidsTablet.confidence >= 0.85);

const creatorCamera = classify("camera for content creator");
assertShape(creatorCamera, "creator camera");
assert.equal(creatorCamera.lifestyleIntent, "creator");
assert.equal(creatorCamera.useCaseIntent, "creative_work");
assert.ok(creatorCamera.confidence >= 0.88);

const apartmentVacuum = classify("cheap vacuum for small apartment");
assertShape(apartmentVacuum, "apartment vacuum");
assert.ok(["budget_buyer", "home_owner"].includes(apartmentVacuum.lifestyleIntent));
assert.equal(apartmentVacuum.useCaseIntent, "home");
assert.ok(apartmentVacuum.confidence >= 0.8);

// ── Deterministic stability ──────────────────────────────────────────────────
const q = "gaming keyboard for competitive fps";
assert.deepEqual(classify(q), classify(q), "deterministic output");

// ── Meta-only guarantee ──────────────────────────────────────────────────────
const engineSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/lifestyleIntelligenceEngine.ts"),
  "utf8"
);
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");

console.log("phase123-lifestyle-intelligence: ok");
