#!/usr/bin/env node
/**
 * Phase 13.8 — Verdict Surface Optimization tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { activateQuantAIIntelligence } from "../lib/intelligence/intelligenceActivationEngine.ts";
import { translateQuantAIIntelligence } from "../lib/intelligence/intelligenceTranslationLayer.ts";
import { optimizeVerdictSurface } from "../lib/ui/verdictSurfaceOptimization.ts";

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
  rankingSummary: "Controlled ranking executed in ready mode.",
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
  discountLevel: "HIGH",
  discountScore: 0.72,
  priceDropSignal: 0.48,
  historicalPriceSignal: 0.44,
  valueGainSignal: 0.5,
  fakeDiscountRisk: 0.12,
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
  rankingStrength: ["strong_trust"],
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
  supportingSignals: [],
  confidenceTier: "HIGH",
  confidence: 0.74,
};

function translatedBrief(overrides = {}) {
  const input = {
    decisionBrief: baseBrief,
    verdictIntelligence: {
      version: "phase10-v1",
      verdict: "BUY READY",
      confidence: 0.78,
      rationale: "Product clears all major quality and trust checks.",
      strengths: [],
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
  return translateQuantAIIntelligence({
    ...input,
    decisionBrief: activateQuantAIIntelligence(input),
  });
}

// ── UI wiring guards ───────────────────────────────────────────────────────────
const cardBody = readFileSync(join(process.cwd(), "components", "search", "IntelligenceCardBody.tsx"), "utf8");
assert.ok(cardBody.includes("optimizeVerdictSurface"), "card uses verdict surface optimization");
assert.ok(cardBody.includes("displayReasonLine"), "verdict band uses optimized reason");
assert.ok(cardBody.includes("optimizedSurface.summaryLines"), "summary uses optimized lines");
assert.ok(cardBody.includes("qa-ref-intel-card__verdict-band"), "verdict band structure preserved");
assert.ok(!cardBody.includes("phase13.8"), "no new card sections for verdict surface");

const surface = readFileSync(join(process.cwd(), "components", "search", "ProductResultsSurface.tsx"), "utf8");
assert.ok(surface.includes("verdictSurface"), "results surface passes verdict surface meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("optimizeVerdictSurface"), "stabilization checks verdict surface optimization");

const optimizationSrc = readFileSync(join(process.cwd(), "lib/ui/verdictSurfaceOptimization.ts"), "utf8");
assert.ok(!optimizationSrc.includes("openai"), "no new AI generation");
assert.ok(!optimizationSrc.includes("buildDeterministicRanking"), "no ranking changes");

// ── BUY READY surface ──────────────────────────────────────────────────────────
const buyBrief = translatedBrief();
const buySurface = optimizeVerdictSurface({
  verdict: "BUY READY",
  fallbackReason: "Generic fallback reason.",
  decisionBrief: buyBrief,
  verdictIntelligence: {
    version: "phase10-v1",
    verdict: "BUY READY",
    confidence: 0.78,
    rationale: "Product clears all major quality and trust checks.",
    strengths: [],
    warnings: [],
    factorTrace: {},
  },
  rankingEngine,
  decisionReadiness: decisionReadinessBuy,
  intentConfidence,
  valueIntelligence,
});
assert.ok(buySurface.verdictReason.length > 0, "buy verdict reason present");
assert.ok(buySurface.verdictReason !== "Generic fallback reason.", "buy uses brief-first reason");
assert.equal(buySurface.summaryLines.length, 2, "summary keeps two slots");
assert.ok(
  buySurface.summaryLines.some((line) => line.includes("Trust") || line.includes("Price")),
  "buy summary prioritizes supporting signals"
);

// ── COMPARE surface ────────────────────────────────────────────────────────────
const compareBrief = translatedBrief({
  verdictIntelligence: {
    version: "phase10-v1",
    verdict: "CONSIDER",
    confidence: 0.58,
    rationale: "Mixed strengths — compare before committing.",
    strengths: [],
    warnings: ["Trust varies between sellers."],
    factorTrace: {},
  },
  rankingEngine: {
    ...rankingEngine,
    rankingWarnings: ["Trust signals are mixed across the tray."],
  },
  decisionReadiness: { ...decisionReadinessBuy, readinessStatus: "NEEDS_COMPARE" },
});
const compareSurface = optimizeVerdictSurface({
  verdict: "COMPARE",
  fallbackReason: "Compare alternatives.",
  decisionBrief: compareBrief,
  rankingEngine: { ...rankingEngine, rankingWarnings: ["Trust signals are mixed across the tray."] },
  decisionReadiness: { ...decisionReadinessBuy, readinessStatus: "NEEDS_COMPARE" },
  intentConfidence,
  valueIntelligence,
});
assert.ok(compareSurface.verdictReason.toLowerCase().includes("compare"), "compare verdict reason is stance-first");
assert.ok(compareSurface.summaryLines.filter(Boolean).length >= 1, "compare summary populated");

// ── WAIT surface ───────────────────────────────────────────────────────────────
const waitBrief = translatedBrief({
  verdictIntelligence: {
    version: "phase10-v1",
    verdict: "WAIT",
    confidence: 0.42,
    rationale: "Current market conditions do not support an immediate purchase.",
    strengths: [],
    warnings: ["Fake discount risk elevated."],
    factorTrace: {},
  },
  valueIntelligence: { ...valueIntelligence, valueLevel: "LOW", valueScore: 0.28 },
  decisionReadiness: { ...decisionReadinessBuy, readinessStatus: "WAIT_FOR_BETTER_DEAL" },
});
const waitSurface = optimizeVerdictSurface({
  verdict: "WAIT",
  fallbackReason: "Hold for now.",
  decisionBrief: waitBrief,
  decisionReadiness: { ...decisionReadinessBuy, readinessStatus: "WAIT_FOR_BETTER_DEAL" },
  valueIntelligence: { ...valueIntelligence, valueLevel: "LOW", valueScore: 0.28 },
  intentConfidence,
});
assert.ok(
  waitSurface.verdictReason.toLowerCase().includes("wait") ||
    waitSurface.verdictReason.toLowerCase().includes("better opportunity"),
  "wait verdict reason is stance-first"
);
assert.ok(
  waitSurface.summaryLines.some((line) => line.includes("Current price is not attractive enough")),
  "wait summary surfaces weak value signal"
);

// ── Fallback when brief missing ────────────────────────────────────────────────
const fallbackSurface = optimizeVerdictSurface({
  verdict: "BUY READY",
  fallbackReason: "Fallback card reason.",
  decisionBrief: null,
});
assert.equal(fallbackSurface.verdictReason, "Fallback card reason.");

console.log("phase138-verdict-surface-optimization: ok");
