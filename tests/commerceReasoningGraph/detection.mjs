/**
 * P6.7 — Commerce reasoning graph detection unit tests.
 */
import { buildCommerceReasoningGraphPath } from "../../lib/commerceReasoningGraph/commerceReasoningGraphPaths.ts";
import { detectCommerceReasoningGraphSignals } from "../../lib/commerceReasoningGraph/commerceReasoningGraphDetection.ts";

let failed = 0;
const stableDecision = {
  decisionScore: 60,
  decisionDelta: 0.08,
  decisionConfidence: 0.55,
  decisionQualityScore: 0.88,
  trustworthyDecisionContinuity: 0.65,
  recommendationIntegrityStability: 0.72,
  balancedDecisionFormation: 0.74,
  decisionInconsistencyDetected: false,
  unstableStrategicTradeoffDetected: false,
  rollbackTriggered: false,
  contradictionCount: 0,
  routingLane: "decision-safe",
  analytics: { topDriftCount: 0 },
};
const unstableDecision = {
  decisionScore: 40,
  decisionDelta: 0.9,
  decisionConfidence: 0.28,
  decisionQualityScore: 0.45,
  trustworthyDecisionContinuity: 0.2,
  recommendationIntegrityStability: 0.25,
  balancedDecisionFormation: 0.3,
  decisionInconsistencyDetected: true,
  unstableStrategicTradeoffDetected: true,
  rollbackTriggered: true,
  contradictionCount: 3,
  routingLane: "consistency-check",
  analytics: { topDriftCount: 2 },
};
const marketStable = { rollbackTriggered: false, verifiedPricingContinuity: 0.6, contradictionCount: 0, routingLane: "pricing-safe" };
const marketUnstable = { rollbackTriggered: true, verifiedPricingContinuity: 0.2, contradictionCount: 2, routingLane: "discount-check" };
const memorylessStable = { rollbackTriggered: false, strategicOscillationDetected: false, analytics: { topDriftCount: 0 } };
const memorylessUnstable = { rollbackTriggered: true, strategicOscillationDetected: true, analytics: { topDriftCount: 2 } };
const strategic = { analytics: { topDriftCount: 0 } };

const intent = { intentScore: 46, intentDelta: 0.1, intentConfidence: 0.4, routingLane: "compare" };
const multiObjective = { multiObjectiveScore: 58, multiObjectiveDelta: 0.18, multiObjectiveConfidence: 0.48, routingLane: "compare" };
const strategicStable = { strategicRankingScore: 64, strategicRankingDelta: 0.2, strategicRankingConfidence: 0.6, routingLane: "ranking-safe", analytics: { topDriftCount: 0 } };
const memoryless = { learningScore: 61, learningDelta: 0.13, learningConfidence: 0.54, routingLane: "continuity-safe" };

const stablePath = buildCommerceReasoningGraphPath({ intent, multiObjective, strategic: strategicStable, memoryless, marketReality: marketStable, commerceDecision: stableDecision });
const unstablePath = buildCommerceReasoningGraphPath({ intent, multiObjective, strategic: strategicStable, memoryless, marketReality: marketUnstable, commerceDecision: unstableDecision });

const stable = detectCommerceReasoningGraphSignals({ path: stablePath, strategic: strategicStable, memoryless: memorylessStable, marketReality: marketStable, commerceDecision: stableDecision });
const unstable = detectCommerceReasoningGraphSignals({ path: unstablePath, strategic: strategicStable, memoryless: memorylessUnstable, marketReality: marketUnstable, commerceDecision: unstableDecision });

if (unstable.graphIntegrityScore >= stable.graphIntegrityScore) {
  failed += 1;
  console.error("FAIL graph integrity ordering");
} else {
  console.log(`OK integrity stable=${stable.graphIntegrityScore} unstable=${unstable.graphIntegrityScore}`);
}

if (!unstable.circularReasoningInfluenceDetected || !unstable.conflictingReasoningBranchDetected) {
  failed += 1;
  console.error("FAIL unstable graph pattern detection");
} else {
  console.log("OK unstable graph patterns detected");
}

if (failed) process.exit(1);
console.log("\nCommerce reasoning graph detection tests passed");
