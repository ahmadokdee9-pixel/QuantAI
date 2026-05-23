/**
 * P6.8 — Deterministic unified cognitive governance unit tests.
 */
import { runCognitiveGovernanceEngine } from "../../lib/cognitiveGovernance/cognitiveGovernanceEngine.ts";

let failed = 0;
const reasoningGraph = {
  version: "autonomous-commerce-reasoning-graph-v1",
  graphActive: true,
  graphProfile: "bounded-graph",
  graphScore: 61,
  graphDelta: 0.066,
  graphConfidence: 0.55,
  graphIntegrityScore: 0.85,
  unstableReasoningStructureDetected: false,
  circularReasoningInfluenceDetected: false,
  conflictingReasoningBranchDetected: false,
  weakCausalRelationshipDetected: false,
  reasoningDriftEscalationDetected: false,
  unstableRankingCausalityDetected: false,
  trustworthyReasoningContinuity: 0.56,
  deterministicDecisionCausality: 0.55,
  reasoningSnapshotHash: "intent|compare|400;multi_objective|compare|480",
  chainExecutionHash: "intent:46:100->multi_objective:58:180",
  contradictionCount: 0,
  routingLane: "graph-safe",
  rollbackTriggered: false,
  analytics: { replayIntegrityAnalytics: 100, topDriftCount: 0 },
};
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
const marketReality = { realityScore: 52, realityDelta: 0.067, realityConfidence: 0.43, verifiedPricingContinuity: 0.37, rollbackTriggered: false, contradictionCount: 0, routingLane: "signal-check" };
const memoryless = { learningScore: 61, learningDelta: 0.13, learningConfidence: 0.54, continuityReinforcement: 0.71, strategicOscillationDetected: false, rollbackTriggered: false, analytics: { replayIntegrityAnalytics: 90, topDriftCount: 0 } };
const strategic = { strategicRankingScore: 64, strategicRankingDelta: 0.2, strategicRankingConfidence: 0.6, rollbackTriggered: false, analytics: { topDriftCount: 0 } };
const governance = { anomalyDetected: false, blockedPolicies: [] };
const profile = { id: "bounded-governance", allowsMutation: true, requiresGovernancePass: false, requiresGraphStable: false, maxDelta: 1, maxInfluenceAmplification: 0.75, maxEquilibriumAmplification: 0.75 };

const run1 = runCognitiveGovernanceEngine({ reasoningGraph, commerceDecision, marketReality, memoryless, strategic, governance, profile });
const run2 = runCognitiveGovernanceEngine({ reasoningGraph, commerceDecision, marketReality, memoryless, strategic, governance, profile });

if (run1.signals.signalHash !== run2.signals.signalHash) {
  failed += 1;
  console.error("FAIL signal hash mismatch");
} else {
  console.log(`OK signalHash=${run1.signals.signalHash.slice(0, 40)}...`);
}

if (run1.influence.governanceDelta !== run2.influence.governanceDelta) {
  failed += 1;
  console.error("FAIL governance delta mismatch");
} else {
  console.log(`OK governanceDelta=${run1.influence.governanceDelta}`);
}

if (!run1.signals.governanceSnapshotHash) {
  failed += 1;
  console.error("FAIL missing governance snapshot");
} else {
  console.log(`OK snapshot=${run1.signals.governanceSnapshotHash.slice(0, 30)}...`);
}

if (failed) process.exit(1);
console.log("\nDeterministic unified cognitive governance tests passed");
