/**
 * P6.4 — Deterministic memoryless learning unit tests.
 */
import { runMemorylessLearningEngine } from "../../lib/memorylessLearning/memorylessLearningEngine.ts";

let failed = 0;
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
  id: "bounded-learning",
  allowsMutation: true,
  requiresGovernancePass: false,
  requiresStrategicStable: false,
  maxDelta: 1,
  maxContinuityAmplification: 0.75,
  maxStabilizationAmplification: 0.75,
};

const run1 = runMemorylessLearningEngine({ intent, multiObjective, strategic, governance, profile });
const run2 = runMemorylessLearningEngine({ intent, multiObjective, strategic, governance, profile });

if (run1.signals.signalHash !== run2.signals.signalHash) {
  failed += 1;
  console.error("FAIL signal hash mismatch");
} else {
  console.log(`OK signalHash=${run1.signals.signalHash.slice(0, 40)}...`);
}

if (run1.influence.learningDelta !== run2.influence.learningDelta) {
  failed += 1;
  console.error("FAIL learning delta mismatch");
} else {
  console.log(`OK learningDelta=${run1.influence.learningDelta}`);
}

if (failed) process.exit(1);
console.log("\nDeterministic memoryless learning tests passed");
