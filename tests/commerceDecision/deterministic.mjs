/**
 * P6.6 — Deterministic commerce decision unit tests.
 */
import { runCommerceDecisionEngine } from "../../lib/commerceDecision/commerceDecisionEngine.ts";

let failed = 0;
const marketReality = {
  realityScore: 52,
  realityDelta: 0.067,
  realityConfidence: 0.43,
  fakeDiscountDetected: false,
  fakeDiscountScore: 0.08,
  trustDecayDetected: false,
  unreliableOfferDetected: false,
  verifiedPricingContinuity: 0.37,
  trustedMerchantStability: 0.58,
  rollbackTriggered: false,
  contradictionCount: 0,
  routingLane: "signal-check",
  analytics: { replayIntegrityAnalytics: 100, harmonyAnalytics: 68 },
};
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
  continuityReinforcement: 0.71,
  contradictionCount: 0,
  routingLane: "continuity-safe",
  rollbackTriggered: false,
  analytics: { harmonyAnalytics: 82, replayIntegrityAnalytics: 90, topDriftCount: 0 },
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
  trustObjective: 0.4,
  conversionObjective: 0.55,
  rollbackTriggered: false,
};
const intent = { intentConfidence: 0.4, intentDelta: 0.1, trustIntent: 0.5, rollbackTriggered: false };
const governance = { anomalyDetected: false, blockedPolicies: [] };
const profile = {
  id: "bounded-decision",
  allowsMutation: true,
  requiresGovernancePass: false,
  requiresRealityStable: false,
  maxDelta: 1,
  maxContinuityAmplification: 0.75,
  maxIntegrityAmplification: 0.75,
};
const products = [
  { id: 1, title: "A", store: "Amazon", price: 99, displayPrice: "$99", rating: 4.5, link: "a", image: "", reviewsCount: 100, shipping: null, availability: "In stock", oldPrice: null, priceTrend: "stable", extensions: [], qiComposite: 72 },
  { id: 2, title: "B", store: "Best Buy", price: 89, displayPrice: "$89", rating: 4.2, link: "b", image: "", reviewsCount: 50, shipping: null, availability: "In stock", oldPrice: null, priceTrend: "stable", extensions: [], qiComposite: 68 },
];

const run1 = runCommerceDecisionEngine({ products, intent, multiObjective, strategic, memoryless, marketReality, governance, profile });
const run2 = runCommerceDecisionEngine({ products, intent, multiObjective, strategic, memoryless, marketReality, governance, profile });

if (run1.signals.signalHash !== run2.signals.signalHash) {
  failed += 1;
  console.error("FAIL signal hash mismatch");
} else {
  console.log(`OK signalHash=${run1.signals.signalHash.slice(0, 40)}...`);
}

if (run1.influence.decisionDelta !== run2.influence.decisionDelta) {
  failed += 1;
  console.error("FAIL decision delta mismatch");
} else {
  console.log(`OK decisionDelta=${run1.influence.decisionDelta}`);
}

if (failed) process.exit(1);
console.log("\nDeterministic commerce decision tests passed");
