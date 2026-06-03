#!/usr/bin/env node
/**
 * Phase 12.10 — Decision Readiness Engine tests (offline, no network).
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
import {
  applyDecisionReadinessToBrief,
  buildDecisionReadiness,
} from "../lib/intelligence/decisionReadinessEngine.ts";

const VALID_STATUSES = new Set([
  "READY_TO_BUY",
  "NEEDS_COMPARE",
  "NEEDS_RESEARCH",
  "WAIT_FOR_BETTER_DEAL",
  "LOW_CONFIDENCE",
  "UNCERTAIN",
]);

function buildPhase1210Readiness(query) {
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
  return buildDecisionReadiness({
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
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase12.10-v1", `${label} version`);
  assert.ok(VALID_STATUSES.has(meta.readinessStatus), `${label} readinessStatus`);
  assert.ok(meta.readinessScore >= 0 && meta.readinessScore <= 1, `${label} readinessScore`);
  assert.ok(Array.isArray(meta.blockers), `${label} blockers`);
  assert.ok(Array.isArray(meta.supportingSignals), `${label} supportingSignals`);
  assert.ok(meta.supportingSignals.length >= 1, `${label} supportingSignals non-empty`);
  assert.equal(typeof meta.confidenceTier, "string", `${label} confidenceTier`);
  assert.ok(meta.confidence >= 0 && meta.confidence <= 1, `${label} confidence`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("buildDecisionReadiness"), "route uses buildDecisionReadiness");
assert.ok(route.includes("decisionReadiness"), "route exposes decisionReadiness meta");
assert.ok(route.includes("applyDecisionReadinessToBrief"), "route enriches decisionBrief safely");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("buildDecisionReadiness"), "stabilization checks readiness engine");
assert.ok(stabilization.includes("decisionReadiness"), "stabilization checks decisionReadiness meta");

const briefEngine = readFileSync(
  join(process.cwd(), "lib/intelligence/decisionBriefEngine.ts"),
  "utf8"
);
assert.ok(briefEngine.includes("decisionReadinessSummary"), "decisionBrief supports readiness summary");

// ── Spec examples ────────────────────────────────────────────────────────────
const replaceVacuum = buildPhase1210Readiness("replace broken vacuum");
assertShape(replaceVacuum, "replace vacuum");
assert.equal(replaceVacuum.readinessStatus, "READY_TO_BUY");
assert.ok(replaceVacuum.readinessScore >= 0.85);
assert.equal(replaceVacuum.confidenceTier, "VERY_HIGH");

const comparePhones = buildPhase1210Readiness("compare iphone and samsung");
assertShape(comparePhones, "compare phones");
assert.equal(comparePhones.readinessStatus, "NEEDS_COMPARE");
assert.ok(comparePhones.readinessScore >= 0.8);
assert.ok(comparePhones.blockers.includes("comparison_context_active"));

const gamingLaptop = buildPhase1210Readiness("best gaming laptop under 1500");
assertShape(gamingLaptop, "gaming laptop");
assert.equal(gamingLaptop.readinessStatus, "NEEDS_RESEARCH");
assert.ok(gamingLaptop.readinessScore >= 0.8);
assert.equal(gamingLaptop.confidenceTier, "VERY_HIGH");

const cheapMonitor = buildPhase1210Readiness("cheap monitor deal");
assertShape(cheapMonitor, "cheap monitor deal");
assert.equal(cheapMonitor.readinessStatus, "WAIT_FOR_BETTER_DEAL");
assert.ok(cheapMonitor.readinessScore >= 0.85);

const giftFather = buildPhase1210Readiness("gift for father");
assertShape(giftFather, "gift father");
assert.equal(giftFather.readinessStatus, "LOW_CONFIDENCE");
assert.ok(giftFather.blockers.includes("gift_context_ambiguity"));

const premiumChair = buildPhase1210Readiness("premium office chair");
assertShape(premiumChair, "premium chair");
assert.equal(premiumChair.readinessStatus, "READY_TO_BUY");
assert.equal(premiumChair.confidenceTier, "VERY_HIGH");

const uncertainQuery = buildPhase1210Readiness("help me choose something nice");
assertShape(uncertainQuery, "uncertain query");
assert.equal(uncertainQuery.readinessStatus, "UNCERTAIN");
assert.ok(uncertainQuery.readinessScore >= 0.85);

// ── Pass-through integrity ───────────────────────────────────────────────────
const psychology = buildPhase1210Readiness("best gaming laptop under 1500");
assert.equal(
  psychology.confidence,
  buildPhase1210Readiness("best gaming laptop under 1500").confidence
);

// ── Decision brief enrichment (meta-only) ────────────────────────────────────
const readiness = buildPhase1210Readiness("replace broken vacuum");
const enriched = applyDecisionReadinessToBrief(
  {
    headline: "QuantAI Recommendation",
    recommendation: {
      label: "Best Overall",
      title: "Example Vacuum",
      store: "Example Store",
      link: "https://example.com/vacuum",
      price: 199,
    },
    why: ["Matched replacement intent"],
    alternatives: [],
    discountNote: null,
    confidence: 0.9,
    sparseTrayWarning: null,
  },
  readiness
);
assert.ok(enriched?.decisionReadinessSummary?.includes("ready to buy"));
assert.equal(enriched?.headline, "QuantAI Recommendation");
assert.equal(applyDecisionReadinessToBrief(null, readiness), null);

// ── Deterministic stability ──────────────────────────────────────────────────
const q = "compare iphone and samsung";
assert.deepEqual(buildPhase1210Readiness(q), buildPhase1210Readiness(q), "deterministic output");

// ── Meta-only guarantee ──────────────────────────────────────────────────────
const engineSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/decisionReadinessEngine.ts"),
  "utf8"
);
assert.ok(!engineSrc.includes("QuantProduct"), "no product tray mutations");
assert.ok(!engineSrc.includes("localStorage"), "no persistence");
assert.ok(!engineSrc.includes("supabase"), "no database writes");
assert.ok(!engineSrc.includes("rerank"), "no ranking mutations");

console.log("phase1210-decision-readiness: ok");
