#!/usr/bin/env node
/**
 * Phase 12.17 — Review Credibility Intelligence Engine tests (offline, no network).
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
import { buildDecisionReadiness } from "../lib/intelligence/decisionReadinessEngine.ts";
import { buildPurchaseFriction } from "../lib/intelligence/purchaseFrictionEngine.ts";
import { buildConversionProbability } from "../lib/intelligence/conversionProbabilityEngine.ts";
import { buildDealSensitivity } from "../lib/intelligence/dealSensitivityEngine.ts";
import { buildBrandAffinity } from "../lib/intelligence/brandAffinityEngine.ts";
import { buildProductAttributeAffinity } from "../lib/intelligence/productAttributeAffinityEngine.ts";
import { buildRetailerTrust } from "../lib/intelligence/retailerTrustEngine.ts";
import { buildReviewCredibility } from "../lib/intelligence/reviewCredibilityEngine.ts";

const VALID_LEVELS = new Set(["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]);

function buildPhase1217ReviewCredibility(query) {
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
  const shopperPsychology = buildShopperPsychology({
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
  const decisionReadiness = buildDecisionReadiness({
    shoppingBrain: bundle.shoppingBrain,
    multiCategory,
    tasteIntelligence,
    lifestyleIntelligence,
    contextIntelligence,
    intentConfidence,
    memoryPreparation,
    buyerModel,
    buyerIntentVector,
    shopperPsychology,
  });
  const purchaseFriction = buildPurchaseFriction({
    shoppingBrain: bundle.shoppingBrain,
    multiCategory,
    tasteIntelligence,
    lifestyleIntelligence,
    contextIntelligence,
    intentConfidence,
    memoryPreparation,
    buyerModel,
    buyerIntentVector,
    shopperPsychology,
    decisionReadiness,
  });
  const conversionProbability = buildConversionProbability({
    shoppingBrain: bundle.shoppingBrain,
    multiCategory,
    tasteIntelligence,
    lifestyleIntelligence,
    contextIntelligence,
    intentConfidence,
    memoryPreparation,
    buyerModel,
    buyerIntentVector,
    shopperPsychology,
    decisionReadiness,
    purchaseFriction,
  });
  const dealSensitivity = buildDealSensitivity({
    query,
    shoppingBrain: bundle.shoppingBrain,
    multiCategory,
    tasteIntelligence,
    lifestyleIntelligence,
    contextIntelligence,
    intentConfidence,
    memoryPreparation,
    buyerModel,
    buyerIntentVector,
    shopperPsychology,
    decisionReadiness,
    purchaseFriction,
    conversionProbability,
  });
  const brandAffinity = buildBrandAffinity({
    query,
    buyerModel,
    buyerIntentVector,
    shopperPsychology,
    decisionReadiness,
    purchaseFriction,
    conversionProbability,
    dealSensitivity,
    tasteIntelligence,
    lifestyleIntelligence,
  });
  const productAttributeAffinity = buildProductAttributeAffinity({
    query,
    shoppingBrain: bundle.shoppingBrain,
    buyerModel,
    buyerIntentVector,
    shopperPsychology,
    contextIntelligence,
    tasteIntelligence,
    lifestyleIntelligence,
    brandAffinity,
  });
  const retailerTrust = buildRetailerTrust({
    query,
    buyerModel,
    shopperPsychology,
    contextIntelligence,
    intentConfidence,
    dealSensitivity,
    brandAffinity,
    productAttributeAffinity,
  });
  return buildReviewCredibility({
    query,
    buyerModel,
    shopperPsychology,
    contextIntelligence,
    intentConfidence,
    productAttributeAffinity,
    retailerTrust,
  });
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.17-v1", `${label} version`);
  assert.ok(VALID_LEVELS.has(meta.credibilityLevel), `${label} credibilityLevel`);
  assert.ok(meta.credibilityScore >= 0 && meta.credibilityScore <= 1, `${label} credibilityScore`);
  for (const key of [
    "ratingConsistencySignal",
    "reviewVolumeSignal",
    "sentimentConsistencySignal",
    "suspiciousPatternSignal",
    "verificationSignal",
  ]) {
    assert.ok(meta[key] >= 0 && meta[key] <= 1, `${label} ${key}`);
  }
  assert.ok(Array.isArray(meta.riskFlags), `${label} riskFlags`);
  assert.equal(typeof meta.confidenceTier, "string", `${label} confidenceTier`);
  assert.ok(meta.confidence >= 0 && meta.confidence <= 1, `${label} confidence`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildReviewCredibility"), "route uses buildReviewCredibility");
assert.ok(route.includes("reviewCredibility"), "route exposes reviewCredibility meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildReviewCredibility"), "stabilization checks review credibility engine");
assert.ok(stabilization.includes("reviewCredibility"), "stabilization checks reviewCredibility meta");

// ── Spec examples ────────────────────────────────────────────────────────────
const verifiedBalanced = buildPhase1217ReviewCredibility(
  "verified purchase balanced reviews consistent ratings detailed reviews"
);
assertShape(verifiedBalanced, "verified balanced reviews");
assert.ok(
  verifiedBalanced.credibilityLevel === "HIGH" || verifiedBalanced.credibilityLevel === "VERY_HIGH",
  "verified balanced should be HIGH or VERY_HIGH"
);
assert.ok(verifiedBalanced.credibilityScore >= 0.68);
assert.ok(verifiedBalanced.verificationSignal >= 0.5);
assert.ok(verifiedBalanced.ratingConsistencySignal >= 0.5);

const fakeSpike = buildPhase1217ReviewCredibility("fake reviews review spike bought reviews");
assertShape(fakeSpike, "fake review spike");
assert.equal(fakeSpike.credibilityLevel, "VERY_LOW");
assert.ok(fakeSpike.credibilityScore <= 0.2);
assert.ok(fakeSpike.suspiciousPatternSignal >= 0.55);
assert.ok(fakeSpike.riskFlags.includes("fake_review_risk"));
assert.ok(fakeSpike.riskFlags.includes("review_spike_risk"));

const highVolume = buildPhase1217ReviewCredibility(
  "top rated headphones thousands of reviews long review history"
);
assertShape(highVolume, "high review volume");
assert.ok(highVolume.reviewVolumeSignal >= 0.55);
assert.ok(highVolume.credibilityScore >= 0.55);
assert.ok(
  highVolume.credibilityLevel === "MEDIUM" ||
    highVolume.credibilityLevel === "HIGH" ||
    highVolume.credibilityLevel === "VERY_HIGH"
);

const suspiciousPerfect = buildPhase1217ReviewCredibility(
  "all 5 star too good to be true perfect rating only extreme ratings"
);
assertShape(suspiciousPerfect, "suspicious perfect ratings");
assert.ok(suspiciousPerfect.credibilityScore <= 0.4);
assert.ok(
  suspiciousPerfect.credibilityLevel === "VERY_LOW" || suspiciousPerfect.credibilityLevel === "LOW"
);
assert.ok(suspiciousPerfect.suspiciousPatternSignal >= 0.45);
assert.ok(suspiciousPerfect.riskFlags.includes("extreme_sentiment_concentration"));

// ── Pass-through integrity ───────────────────────────────────────────────────
const retailerTrust = buildPhase1217ReviewCredibility("verified purchase balanced reviews");
assert.equal(verifiedBalanced.confidenceTier, retailerTrust.confidenceTier);
assert.equal(verifiedBalanced.confidence, retailerTrust.confidence);

// ── Deterministic stability ──────────────────────────────────────────────────
const q = "top rated headphones thousands of reviews long review history";
assert.deepEqual(
  buildPhase1217ReviewCredibility(q),
  buildPhase1217ReviewCredibility(q),
  "deterministic output"
);

// ── Meta-only guarantee ──────────────────────────────────────────────────────
const engineSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/reviewCredibilityEngine.ts"),
  "utf8"
);
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("localStorage"), "no persistence");
assert.ok(!engineSrc.includes("supabase"), "no database writes");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");
assert.ok(!engineSrc.includes("getStoreTrustScore"), "no post-search retailer scoring");

console.log("phase1217-review-credibility: ok");
