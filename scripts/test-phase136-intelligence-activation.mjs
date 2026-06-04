#!/usr/bin/env node
/**
 * Phase 13.6 — QuantAI Intelligence Activation Layer tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateQuantAIIntelligence,
  resolveIntelligenceActivationStance,
} from "../lib/intelligence/intelligenceActivationEngine.ts";
import { resolveActivatedBriefPresentation } from "../lib/ui/activatedDecisionBriefPresentation.ts";

const baseBrief = {
  headline: "QuantAI Recommendation",
  recommendation: {
    label: "Best Overall",
    title: "Example Headphones",
    store: "Trusted Store",
    link: "https://store.example/headphones",
    price: 129,
  },
  why: ["Strong value relative to tray median."],
  alternatives: [],
  discountNote: null,
  confidence: 78,
  sparseTrayWarning: null,
  marketContextSummary: "Pricing sits near tray median with stable demand.",
  fusionSummary: "Trust, value, and intent alignment support checkout.",
};

const rankingEngine = {
  version: "phase13.1-v1",
  rankingScore: 0.82,
  rankingTier: "HIGH",
  trustWeight: 0.28,
  valueWeight: 0.26,
  buyerFitWeight: 0.24,
  confidenceWeight: 0.22,
  rankingReasons: ["Trust signals are strong across retailer and review posture."],
  rankingWarnings: [],
};

const executedRanking = {
  version: "phase13.4-v1",
  executed: true,
  candidateCount: 3,
  rerankedCount: 2,
  executionConfidence: 0.72,
  executionMode: "ready",
  rankingChanges: [],
  rankingSummary: "Controlled ranking executed in ready mode (HIGH tier) with 2 reranked products at confidence 0.72.",
  rankingWarnings: [],
};

const valueIntelligence = {
  version: "phase12.19-v1",
  valueLevel: "HIGH",
  valueScore: 0.78,
  priceToQualitySignal: 0.74,
  priceToPerformanceSignal: 0.7,
  longTermValueSignal: 0.62,
  ownershipCostSignal: 0.58,
  replacementValueSignal: 0.6,
  riskFlags: [],
  confidenceTier: "HIGH",
  confidence: 0.71,
};

const retailerTrust = {
  version: "phase12.16-v1",
  trustLevel: "HIGH",
  trustScore: 0.8,
  retailerAgeSignal: 0.7,
  reviewSignal: 0.72,
  reputationSignal: 0.75,
  fulfillmentSignal: 0.68,
  returnPolicySignal: 0.66,
  riskFlags: [],
  confidenceTier: "HIGH",
  confidence: 0.7,
};

const reviewCredibility = {
  version: "phase12.17-v1",
  credibilityLevel: "HIGH",
  credibilityScore: 0.76,
  ratingConsistencySignal: 0.7,
  reviewVolumeSignal: 0.68,
  sentimentConsistencySignal: 0.72,
  suspiciousPatternSignal: 0.12,
  verificationSignal: 0.65,
  riskFlags: [],
  confidenceTier: "HIGH",
  confidence: 0.69,
};

const realDiscount = {
  version: "phase12.18-v1",
  discountLevel: "MEDIUM",
  discountScore: 0.52,
  priceDropSignal: 0.48,
  historicalPriceSignal: 0.44,
  valueGainSignal: 0.5,
  fakeDiscountRisk: 0.18,
  urgencyDiscountSignal: 0.1,
  riskFlags: [],
  confidenceTier: "MEDIUM",
  confidence: 0.6,
};

const rankingPreparation = {
  version: "phase12.20-v1",
  rankingReadinessLevel: "HIGH",
  rankingReadinessScore: 0.8,
  qualitySignal: 0.74,
  trustSignal: 0.78,
  valueSignal: 0.72,
  buyerFitSignal: 0.68,
  confidenceSignal: 0.7,
  rankingStrength: ["strong_trust", "strong_value"],
  rankingWeaknesses: [],
  confidenceTier: "HIGH",
  confidence: 0.72,
};

const intentConfidence = {
  version: "phase12.5-v1",
  overallConfidence: 0.74,
  categoryConfidence: 0.7,
  tasteConfidence: 0.68,
  lifestyleConfidence: 0.66,
  contextConfidence: 0.72,
  confidenceTier: "HIGH",
};

const decisionReadinessBuy = {
  version: "phase12.10-v1",
  readinessStatus: "READY_TO_BUY",
  readinessScore: 0.82,
  blockers: [],
  supportingSignals: ["strong_intent_alignment"],
  confidenceTier: "HIGH",
  confidence: 0.74,
};

const decisionReadinessCompare = {
  ...decisionReadinessBuy,
  readinessStatus: "NEEDS_COMPARE",
  readinessScore: 0.58,
};

const decisionReadinessWait = {
  ...decisionReadinessBuy,
  readinessStatus: "WAIT_FOR_BETTER_DEAL",
  readinessScore: 0.42,
};

function buildInput(overrides = {}) {
  return {
    decisionBrief: baseBrief,
    verdictIntelligence: {
      version: "phase10-v1",
      verdict: "BUY READY",
      confidence: 0.78,
      rationale: "Product clears all major quality and trust checks.",
      strengths: ["Strong trust posture"],
      warnings: [],
      factorTrace: {},
    },
    rankingEngine,
    executedRanking,
    valueIntelligence,
    retailerTrust,
    reviewCredibility,
    realDiscount,
    rankingPreparation,
    intentConfidence,
    decisionReadiness: decisionReadinessBuy,
    ...overrides,
  };
}

// ── Route + UI wiring guards ───────────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("activateQuantAIIntelligence"), "route activates QuantAI intelligence");
assert.ok(route.includes("decisionBriefBeforeActivation"), "route preserves pre-activation brief");

const surface = readFileSync(join(process.cwd(), "components", "search", "ProductResultsSurface.tsx"), "utf8");
assert.ok(surface.includes("decisionBrief"), "results surface passes activated brief");
assert.ok(surface.includes("activatedDecisionBriefPresentation") === false, "surface uses meta bridge only");

const cardBody = readFileSync(join(process.cwd(), "components", "search", "IntelligenceCardBody.tsx"), "utf8");
assert.ok(cardBody.includes("resolveActivatedBriefPresentation"), "card body renders activated brief");
assert.ok(!cardBody.includes("qa-ref-intel-card__new"), "no new card sections added");

const drawer = readFileSync(join(process.cwd(), "components", "search", "ProductIntelligenceDrawer.tsx"), "utf8");
assert.ok(drawer.includes("resolveActivatedBriefPresentation"), "drawer renders activated brief");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("activateQuantAIIntelligence"), "stabilization checks intelligence activation");

const activationSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/intelligenceActivationEngine.ts"),
  "utf8"
);
assert.ok(!activationSrc.includes("openai"), "no new AI generation");
assert.ok(!activationSrc.includes("Math.random"), "no randomization");
assert.ok(!activationSrc.includes("aggregateRankingSignals"), "does not build new ranking engines");

// ── BUY READY activation ─────────────────────────────────────────────────────────
const buyActivated = activateQuantAIIntelligence(buildInput());
assert.ok(buyActivated?.explanation, "buy activated explanation");
assert.ok(buyActivated?.buyReasoning, "buy reasoning populated");
assert.ok(buyActivated?.topSignals?.length, "top signals populated");
assert.ok(buyActivated?.confidenceExplanation?.includes("Intent confidence"), "confidence explanation populated");
assert.ok(buyActivated?.marketStatus, "market status populated");
assert.ok(
  resolveActivatedBriefPresentation(buyActivated, "BUY READY")?.summaryLines.length,
  "buy ready presentation renders"
);

// ── COMPARE activation ───────────────────────────────────────────────────────────
const compareActivated = activateQuantAIIntelligence(
  buildInput({
    verdictIntelligence: {
      version: "phase10-v1",
      verdict: "CONSIDER",
      confidence: 0.58,
      rationale: "Mixed strengths across trust, pricing, and market signals — compare before committing.",
      strengths: [],
      warnings: ["Value and trust signals diverge."],
      factorTrace: {},
    },
    rankingEngine: {
      ...rankingEngine,
      rankingWarnings: ["Trust signals are mixed across the tray."],
    },
    decisionReadiness: decisionReadinessCompare,
    decisionBrief: {
      ...baseBrief,
      alternativesSummary: "Two peer listings remain competitive on price and trust.",
      competitiveSummary: "Primary wins on trust but not on absolute price.",
    },
  })
);
assert.ok(compareActivated?.compareReasoning, "compare reasoning populated");
assert.ok(
  compareActivated?.compareReasoning.includes("Comparison is recommended"),
  "compare reasoning explains why to compare"
);
assert.ok(
  resolveActivatedBriefPresentation(compareActivated, "COMPARE")?.reasoning,
  "compare presentation renders"
);

// ── WAIT activation ──────────────────────────────────────────────────────────────
const waitActivated = activateQuantAIIntelligence(
  buildInput({
    verdictIntelligence: {
      version: "phase10-v1",
      verdict: "WAIT",
      confidence: 0.42,
      rationale: "Current market conditions do not support an immediate purchase.",
      strengths: [],
      warnings: ["Fake discount risk elevated."],
      factorTrace: {},
    },
    executedRanking: {
      ...executedRanking,
      executed: false,
      executionMode: "blocked",
      rerankedCount: 0,
      rankingWarnings: ["Trust signals are too weak for aggressive ranking."],
    },
    valueIntelligence: {
      ...valueIntelligence,
      valueLevel: "LOW",
      valueScore: 0.28,
      riskFlags: ["weak_quality_for_price"],
    },
    realDiscount: {
      ...realDiscount,
      fakeDiscountRisk: 0.62,
      riskFlags: ["fake_discount_risk"],
    },
    rankingPreparation: {
      ...rankingPreparation,
      rankingWeaknesses: ["weak_value", "weak_confidence"],
    },
    decisionReadiness: decisionReadinessWait,
    decisionBrief: {
      ...baseBrief,
      decisionReadinessSummary: "Decision readiness favors waiting for a better deal.",
    },
  })
);
assert.ok(waitActivated?.waitReasoning, "wait reasoning populated");
assert.ok(waitActivated?.riskSignals?.length, "wait risk signals populated");
assert.ok(
  resolveActivatedBriefPresentation(waitActivated, "WAIT")?.summaryLines.length,
  "wait presentation renders"
);

// ── Stance resolution ────────────────────────────────────────────────────────────
assert.equal(
  resolveIntelligenceActivationStance(buildInput().verdictIntelligence, decisionReadinessBuy),
  "BUY_READY"
);
assert.equal(
  resolveIntelligenceActivationStance(
    buildInput({ verdictIntelligence: { ...buildInput().verdictIntelligence, verdict: "CONSIDER" } }).verdictIntelligence,
    decisionReadinessCompare
  ),
  "COMPARE"
);
assert.equal(
  resolveIntelligenceActivationStance(
    buildInput({ verdictIntelligence: { ...buildInput().verdictIntelligence, verdict: "WAIT" } }).verdictIntelligence,
    decisionReadinessWait
  ),
  "WAIT"
);

// ── Null brief passthrough ───────────────────────────────────────────────────────
assert.equal(activateQuantAIIntelligence(buildInput({ decisionBrief: null })), null);

console.log("phase136-intelligence-activation: ok");
