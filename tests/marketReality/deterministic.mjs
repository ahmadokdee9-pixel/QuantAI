/**
 * P6.5 — Deterministic market reality unit tests.
 */
import { runMarketRealityEngine } from "../../lib/marketReality/marketRealityEngine.ts";

let failed = 0;
const memoryless = {
  learningScore: 61,
  learningDelta: 0.13,
  learningConfidence: 0.54,
  rankingDriftDetected: false,
  signalFatigueDetected: false,
  lowConfidencePatternDetected: false,
  strategicOscillationDetected: false,
  trustDegradationDetected: false,
  conversionInstabilityDetected: false,
  rankingDriftScore: 0.03,
  signalFatigueScore: 0.1,
  continuityReinforcement: 0.71,
  contradictionCount: 0,
  routingLane: "continuity-safe",
  rollbackTriggered: false,
  analytics: { harmonyAnalytics: 82, replayIntegrityAnalytics: 90, trustAnalytics: 85, topDriftCount: 0 },
};
const strategic = {
  strategicRankingDelta: 0.2,
  strategicRankingConfidence: 0.6,
  strategicRankingScore: 64,
  trustValueBalance: 0.85,
  premiumAffordabilityBalance: 0.6,
  conversionStabilityBalance: 0.9,
  aestheticPracticalityBalance: 0.7,
  rankingContinuity: 0.7,
  trustDominanceGuardActive: false,
  inflationGuardActive: false,
  rollbackTriggered: false,
  contradictionCount: 0,
  routingLane: "ranking-safe",
  analytics: { harmonyAnalytics: 70, replayIntegrityAnalytics: 90, topDriftCount: 0 },
};
const multiObjective = {
  multiObjectiveDelta: 0.18,
  multiObjectiveConfidence: 0.48,
  multiObjectiveScore: 58,
  trustObjective: 0.4,
  conversionObjective: 0.55,
  rollbackTriggered: false,
  analytics: { continuityAnalytics: 60, replayIntegrityAnalytics: 85 },
};
const intent = { intentConfidence: 0.4, intentDelta: 0.1, trustIntent: 0.5, rollbackTriggered: false };
const governance = { anomalyDetected: false, blockedPolicies: [] };
const profile = {
  id: "bounded-reality",
  allowsMutation: true,
  requiresGovernancePass: false,
  requiresLearningStable: false,
  maxDelta: 1,
  maxPricingAmplification: 0.75,
  maxMerchantAmplification: 0.75,
};
const products = [
  { id: 1, title: "Test A", store: "Amazon", price: 99, displayPrice: "$99", rating: 4.5, link: "a", image: "", reviewsCount: 100, shipping: null, availability: "In stock", oldPrice: null, priceTrend: "stable", extensions: [] },
  { id: 2, title: "Test B", store: "Best Buy", price: 89, displayPrice: "$89", rating: 4.2, link: "b", image: "", reviewsCount: 50, shipping: null, availability: "In stock", oldPrice: 120, priceTrend: "down", extensions: [] },
];

const run1 = runMarketRealityEngine({ products, intent, multiObjective, strategic, memoryless, governance, profile });
const run2 = runMarketRealityEngine({ products, intent, multiObjective, strategic, memoryless, governance, profile });

if (run1.signals.signalHash !== run2.signals.signalHash) {
  failed += 1;
  console.error("FAIL signal hash mismatch");
} else {
  console.log(`OK signalHash=${run1.signals.signalHash.slice(0, 40)}...`);
}

if (run1.influence.realityDelta !== run2.influence.realityDelta) {
  failed += 1;
  console.error("FAIL reality delta mismatch");
} else {
  console.log(`OK realityDelta=${run1.influence.realityDelta}`);
}

if (failed) process.exit(1);
console.log("\nDeterministic market reality tests passed");
