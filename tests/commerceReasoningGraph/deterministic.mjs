/**
 * P6.7 — Deterministic commerce reasoning graph unit tests.
 */
import { runCommerceReasoningGraphEngine } from "../../lib/commerceReasoningGraph/commerceReasoningGraphEngine.ts";

let failed = 0;
const commerceDecision = {
  decisionScore: 60,
  decisionDelta: 0.083,
  decisionConfidence: 0.54,
  decisionQualityScore: 0.86,
  trustworthyDecisionContinuity: 0.62,
  recommendationIntegrityStability: 0.7,
  balancedDecisionFormation: 0.71,
  decisionInconsistencyDetected: false,
  unstableStrategicTradeoffDetected: false,
  rollbackTriggered: false,
  contradictionCount: 0,
  routingLane: "recommendation-check",
  analytics: { replayIntegrityAnalytics: 100, topDriftCount: 0 },
};
const marketReality = { realityScore: 52, realityDelta: 0.067, realityConfidence: 0.43, verifiedPricingContinuity: 0.37, rollbackTriggered: false, contradictionCount: 0, routingLane: "signal-check", analytics: { replayIntegrityAnalytics: 100 } };
const memoryless = { learningScore: 61, learningDelta: 0.13, learningConfidence: 0.54, continuityReinforcement: 0.71, strategicOscillationDetected: false, rollbackTriggered: false, analytics: { replayIntegrityAnalytics: 90, topDriftCount: 0 } };
const strategic = { strategicRankingScore: 64, strategicRankingDelta: 0.2, strategicRankingConfidence: 0.6, rollbackTriggered: false, analytics: { topDriftCount: 0 } };
const multiObjective = { multiObjectiveScore: 58, multiObjectiveDelta: 0.18, multiObjectiveConfidence: 0.48, routingLane: "compare" };
const intent = { intentScore: 46, intentDelta: 0.1, intentConfidence: 0.4, routingLane: "compare" };
const governance = { anomalyDetected: false, blockedPolicies: [] };
const profile = { id: "bounded-graph", allowsMutation: true, requiresGovernancePass: false, requiresDecisionStable: false, maxDelta: 1, maxPathAmplification: 0.75, maxCausalAmplification: 0.75 };

const run1 = runCommerceReasoningGraphEngine({ intent, multiObjective, strategic, memoryless, marketReality, commerceDecision, governance, profile });
const run2 = runCommerceReasoningGraphEngine({ intent, multiObjective, strategic, memoryless, marketReality, commerceDecision, governance, profile });

if (run1.signals.signalHash !== run2.signals.signalHash) {
  failed += 1;
  console.error("FAIL signal hash mismatch");
} else {
  console.log(`OK signalHash=${run1.signals.signalHash.slice(0, 40)}...`);
}

if (run1.influence.graphDelta !== run2.influence.graphDelta) {
  failed += 1;
  console.error("FAIL graph delta mismatch");
} else {
  console.log(`OK graphDelta=${run1.influence.graphDelta}`);
}

if (!run1.signals.reasoningSnapshotHash) {
  failed += 1;
  console.error("FAIL missing reasoning snapshot");
} else {
  console.log(`OK snapshot=${run1.signals.reasoningSnapshotHash.slice(0, 30)}...`);
}

if (failed) process.exit(1);
console.log("\nDeterministic commerce reasoning graph tests passed");
