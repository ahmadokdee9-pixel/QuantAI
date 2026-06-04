#!/usr/bin/env node
/**
 * Phase 13.7 — Intelligence Translation Layer tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { activateQuantAIIntelligence } from "../lib/intelligence/intelligenceActivationEngine.ts";
import { translateQuantAIIntelligence } from "../lib/intelligence/intelligenceTranslationLayer.ts";
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
  trustLevel: "MEDIUM",
  trustScore: 0.58,
  retailerAgeSignal: 0.7,
  reviewSignal: 0.72,
  reputationSignal: 0.75,
  fulfillmentSignal: 0.68,
  returnPolicySignal: 0.66,
  riskFlags: [],
  confidenceTier: "MEDIUM",
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
  supportingSignals: ["strong_intent_alignment"],
  confidenceTier: "HIGH",
  confidence: 0.74,
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

function translatePipeline(overrides = {}) {
  const input = buildInput(overrides);
  return translateQuantAIIntelligence({
    ...input,
    decisionBrief: activateQuantAIIntelligence(input),
  });
}

// ── Route + UI guards ──────────────────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("translateQuantAIIntelligence"), "route translates intelligence");
assert.ok(route.includes("activateQuantAIIntelligence"), "route still activates before translation");

const cardBody = readFileSync(join(process.cwd(), "components", "search", "IntelligenceCardBody.tsx"), "utf8");
assert.ok(cardBody.includes("resolveActivatedBriefPresentation"), "card uses existing brief slots");
assert.ok(!cardBody.includes("phase13.7"), "no card layout changes for translation");

const drawer = readFileSync(join(process.cwd(), "components", "search", "ProductIntelligenceDrawer.tsx"), "utf8");
assert.ok(drawer.includes("resolveActivatedBriefPresentation"), "drawer uses existing brief slots");
assert.ok(!drawer.includes("intelligenceTranslationLayer"), "translation stays server-side");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("translateQuantAIIntelligence"), "stabilization checks translation layer");

const translationSrc = readFileSync(
  join(process.cwd(), "lib/intelligence/intelligenceTranslationLayer.ts"),
  "utf8"
);
assert.ok(!translationSrc.includes("openai"), "no AI generation");
assert.ok(!translationSrc.includes("Math.random"), "no randomization");
assert.ok(!translationSrc.includes("buildDeterministicRanking"), "no new ranking engines");

// ── Buyer language replacements ────────────────────────────────────────────────
const buyTranslated = translatePipeline();
assert.ok(buyTranslated?.topSignals?.some((line) => line.includes("Seller reputation is acceptable")), "retailer trust medium translated");
assert.ok(buyTranslated?.topSignals?.some((line) => line.includes("Customer feedback appears reliable")), "review credibility strong translated");
assert.ok(buyTranslated?.topSignals?.some((line) => line.includes("Discount appears genuine")), "real discount translated");
assert.ok(!buyTranslated?.explanation?.includes("Value intelligence"), "technical value wording removed from explanation");
assert.equal(buyTranslated?.confidence, 78, "confidence score preserved");

const compareTranslated = translatePipeline({
  verdictIntelligence: {
    version: "phase10-v1",
    verdict: "CONSIDER",
    confidence: 0.58,
    rationale: "Mixed strengths across trust, pricing, and market signals — compare before committing.",
    strengths: [],
    warnings: ["Value and trust diverge."],
    factorTrace: {},
  },
  rankingEngine: {
    ...rankingEngine,
    rankingWarnings: ["Trust signals are mixed across the tray."],
  },
  decisionReadiness: {
    ...decisionReadinessBuy,
    readinessStatus: "NEEDS_COMPARE",
    readinessScore: 0.58,
  },
  decisionBrief: {
    ...baseBrief,
    alternativesSummary: "Two peer listings remain competitive on price and trust.",
  },
});
assert.ok(compareTranslated?.compareReasoning?.includes("Compare"), "compare reasoning uses buyer language");
assert.ok(
  compareTranslated?.topSignals?.concat(compareTranslated?.riskSignals ?? []).some((line) =>
    line.toLowerCase().includes("trust")
  ),
  "compare signals translated"
);
assert.ok(
  resolveActivatedBriefPresentation(compareTranslated, "COMPARE")?.summaryLines.length,
  "compare presentation renders"
);

const waitTranslated = translatePipeline({
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
    discountLevel: "LOW",
    discountScore: 0.22,
  },
  decisionReadiness: {
    ...decisionReadinessBuy,
    readinessStatus: "WAIT_FOR_BETTER_DEAL",
    readinessScore: 0.42,
  },
  decisionBrief: {
    ...baseBrief,
    decisionReadinessSummary: "Decision readiness favors waiting for a better deal.",
  },
});
assert.ok(waitTranslated?.waitReasoning?.includes("Waiting may produce a better opportunity"), "wait reasoning translated");
assert.ok(
  waitTranslated?.topSignals?.concat(waitTranslated?.riskSignals ?? []).some((line) =>
    line.includes("Current price is not attractive enough")
  ),
  "weak value translated"
);
assert.ok(
  resolveActivatedBriefPresentation(waitTranslated, "WAIT")?.summaryLines.length,
  "wait presentation renders"
);

// ── Preserves structure ────────────────────────────────────────────────────────
assert.ok(Array.isArray(buyTranslated?.why), "why array preserved");
assert.ok(buyTranslated?.buyReasoning, "buy reasoning present");
assert.ok(buyTranslated?.compareReasoning, "compare reasoning present");
assert.ok(buyTranslated?.waitReasoning, "wait reasoning present");
assert.equal(translateQuantAIIntelligence(buildInput({ decisionBrief: null })), null);

console.log("phase137-intelligence-translation: ok");
