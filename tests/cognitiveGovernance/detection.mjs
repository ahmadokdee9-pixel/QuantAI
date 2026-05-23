/**
 * P6.8 — Unified cognitive governance detection unit tests.
 */
import { computeCognitiveGovernanceGovernors } from "../../lib/cognitiveGovernance/cognitiveGovernanceGovernors.ts";
import { detectCognitiveGovernanceSignals } from "../../lib/cognitiveGovernance/cognitiveGovernanceDetection.ts";

let failed = 0;
const stableGraph = {
  graphScore: 61,
  graphDelta: 0.066,
  graphConfidence: 0.55,
  graphIntegrityScore: 0.85,
  graphActive: true,
  reasoningDriftEscalationDetected: false,
  circularReasoningInfluenceDetected: false,
  conflictingReasoningBranchDetected: false,
  weakCausalRelationshipDetected: false,
  unstableRankingCausalityDetected: false,
  trustworthyReasoningContinuity: 0.56,
  deterministicDecisionCausality: 0.55,
  rollbackTriggered: false,
  contradictionCount: 0,
  analytics: { topDriftCount: 0 },
};
const unstableGraph = {
  graphScore: 40,
  graphDelta: 0.9,
  graphConfidence: 0.28,
  graphIntegrityScore: 0.35,
  graphActive: false,
  reasoningDriftEscalationDetected: true,
  circularReasoningInfluenceDetected: true,
  conflictingReasoningBranchDetected: true,
  weakCausalRelationshipDetected: true,
  unstableRankingCausalityDetected: true,
  trustworthyReasoningContinuity: 0.2,
  deterministicDecisionCausality: 0.18,
  rollbackTriggered: true,
  contradictionCount: 3,
  analytics: { topDriftCount: 2 },
};
const stableDecision = { decisionDelta: 0.083, decisionConfidence: 0.54, rollbackTriggered: false, contradictionCount: 0, unstableStrategicTradeoffDetected: false, trustworthyDecisionContinuity: 0.62 };
const unstableDecision = { decisionDelta: 0.9, decisionConfidence: 0.28, rollbackTriggered: true, contradictionCount: 3, unstableStrategicTradeoffDetected: true, trustworthyDecisionContinuity: 0.2 };
const marketStable = { realityDelta: 0.067, realityConfidence: 0.43, rollbackTriggered: false, contradictionCount: 0 };
const marketUnstable = { realityDelta: 0.8, realityConfidence: 0.2, rollbackTriggered: true, contradictionCount: 2 };
const memorylessStable = { learningDelta: 0.13, learningConfidence: 0.54, rollbackTriggered: false, analytics: { topDriftCount: 0 } };
const memorylessUnstable = { learningDelta: 0.9, learningConfidence: 0.28, rollbackTriggered: true, analytics: { topDriftCount: 2 } };
const strategicStable = { strategicRankingDelta: 0.2, strategicRankingConfidence: 0.6, rollbackTriggered: false };
const strategicUnstable = { strategicRankingDelta: 0.85, strategicRankingConfidence: 0.25, rollbackTriggered: true };
const governanceStable = { anomalyDetected: false, blockedPolicies: [] };
const governanceUnstable = { anomalyDetected: true, blockedPolicies: ["policy_a"] };

const stableGovernors = computeCognitiveGovernanceGovernors({
  reasoningGraph: stableGraph,
  commerceDecision: stableDecision,
  marketReality: marketStable,
  memoryless: memorylessStable,
  strategic: strategicStable,
  governance: governanceStable,
});
const unstableGovernors = computeCognitiveGovernanceGovernors({
  reasoningGraph: unstableGraph,
  commerceDecision: unstableDecision,
  marketReality: marketUnstable,
  memoryless: memorylessUnstable,
  strategic: strategicUnstable,
  governance: governanceUnstable,
});

const stable = detectCognitiveGovernanceSignals({ reasoningGraph: stableGraph, governors: stableGovernors, governance: governanceStable });
const unstable = detectCognitiveGovernanceSignals({ reasoningGraph: unstableGraph, governors: unstableGovernors, governance: governanceUnstable });

if (unstable.governanceIntegrityScore >= stable.governanceIntegrityScore) {
  failed += 1;
  console.error("FAIL governance integrity ordering");
} else {
  console.log(`OK integrity stable=${stable.governanceIntegrityScore} unstable=${unstable.governanceIntegrityScore}`);
}

if (!unstable.crossLayerContradictionDetected || !unstable.influenceInstabilityDetected) {
  failed += 1;
  console.error("FAIL unstable governance pattern detection");
} else {
  console.log("OK unstable governance patterns detected");
}

if (!unstableGovernors.crossLayerInstabilityShutdown || !unstableGovernors.recursiveInfluenceSuppression) {
  failed += 1;
  console.error("FAIL governance protections not triggered");
} else {
  console.log("OK governance protections triggered");
}

if (failed) process.exit(1);
console.log("\nUnified cognitive governance detection tests passed");
