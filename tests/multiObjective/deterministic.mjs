/**
 * P6.2 — Deterministic multi-objective output unit tests.
 */
import { runMultiObjectiveEngine } from "../../lib/multiObjective/multiObjectiveEngine.ts";
import { buildCanonicalQuery } from "../../lib/search/canonicalQuery.ts";

let failed = 0;
const args = {
  query: "best trusted laptop compare",
  canonicalQuery: buildCanonicalQuery("best trusted laptop compare"),
  decision: { qualityDecision: 0.5, budgetDecision: 0.4, trustDecision: 0.5, valueDecision: 0.4, decisionConfidence: 0.5, analytics: { purchaseQualityAnalytics: 60, recommendationQualityAnalytics: 55, trustValueAnalytics: 50, merchantReliabilityAnalytics: 60 } },
  strategy: { strategicTrust: 0.4, strategicValue: 0.3, premiumPositioning: 0.2, conversionConfidence: 0.4, momentumConfidence: 0.3, routingLane: "compare", analytics: {} },
  market: { marketTrust: 0.4, analytics: { pricingAnalytics: 50 } },
  behavioral: { conversionReadiness: 0.5, buyingFriction: 0.3, rollbackTriggered: false, analytics: { readinessAnalytics: 55, rankingContinuityAnalytics: 70 } },
  cognition: { cognitionConfidence: 0.5, cognitionScore: 50, cognitionStability: 0.5, conversionProbability: 0.5, rollbackTriggered: false, analytics: { rankingContinuityAnalytics: 70, replayIntegrityAnalytics: 80, conversionProbabilityAnalytics: 55 } },
  intent: { intentConfidence: 0.4, intentScore: 45, recommendationIntent: 0.5, comparisonIntent: 0.6, premiumIntent: 0.2, valueIntent: 0.4, trustIntent: 0.5, readinessIntent: 0.4, hesitationIntent: 0.3, emotionalIntent: 0.2, aestheticIntent: 0.3, explorationIntent: 0.3, contradictionCount: 0, rollbackTriggered: false, analytics: { continuityAnalytics: 60, replayIntegrityAnalytics: 80 } },
  governance: { anomalyDetected: false, blockedPolicies: [] },
  profile: { id: "bounded-multi-objective", allowsMutation: true, requiresGovernancePass: false, requiresIntentStable: false, maxDelta: 1, maxQualityAmplification: 0.8, maxTrustAmplification: 0.8, maxConversionAmplification: 0.8 },
};

const run1 = runMultiObjectiveEngine(args);
const run2 = runMultiObjectiveEngine(args);

if (run1.signals.signalHash !== run2.signals.signalHash) {
  failed += 1;
  console.error("FAIL signal hash mismatch");
} else {
  console.log(`OK signalHash=${run1.signals.signalHash.slice(0, 40)}...`);
}

if (run1.influence.multiObjectiveDelta !== run2.influence.multiObjectiveDelta) {
  failed += 1;
  console.error("FAIL multi-objective delta mismatch");
} else {
  console.log(`OK multiObjectiveDelta=${run1.influence.multiObjectiveDelta}`);
}

if (failed) process.exit(1);
console.log("\nDeterministic multi-objective tests passed");
