/**
 * P6.3 — Deterministic strategic ranking unit tests.
 */
import { runStrategicRankingEngine } from "../../lib/strategicRanking/strategicRankingEngine.ts";

let failed = 0;
const multiObjective = {
  multiObjectiveDelta: 0.15,
  multiObjectiveConfidence: 0.45,
  multiObjectiveScore: 55,
  trustObjective: 0.4,
  valueObjective: 0.35,
  priceObjective: 0.5,
  conversionObjective: 0.55,
  stabilityObjective: 0.5,
  qualityObjective: 0.4,
  aestheticObjective: 0.3,
  rollbackTriggered: false,
  contradictionCount: 0,
  routingLane: "compare",
  analytics: { continuityAnalytics: 60, replayIntegrityAnalytics: 85 },
};
const intent = {
  premiumIntent: 0.2,
  comparisonIntent: 0.6,
  intentConfidence: 0.4,
  rollbackTriggered: false,
};
const governance = { anomalyDetected: false, blockedPolicies: [] };
const profile = {
  id: "bounded-strategic",
  allowsMutation: true,
  requiresGovernancePass: false,
  requiresMultiObjectiveStable: false,
  maxDelta: 1,
  maxTrustAmplification: 0.75,
  maxConversionAmplification: 0.75,
  maxAestheticAmplification: 0.75,
};

const run1 = runStrategicRankingEngine({ multiObjective, intent, governance, profile });
const run2 = runStrategicRankingEngine({ multiObjective, intent, governance, profile });

if (run1.signals.signalHash !== run2.signals.signalHash) {
  failed += 1;
  console.error("FAIL signal hash mismatch");
} else {
  console.log(`OK signalHash=${run1.signals.signalHash.slice(0, 40)}...`);
}

if (run1.influence.strategicRankingDelta !== run2.influence.strategicRankingDelta) {
  failed += 1;
  console.error("FAIL strategic ranking delta mismatch");
} else {
  console.log(`OK strategicRankingDelta=${run1.influence.strategicRankingDelta}`);
}

if (failed) process.exit(1);
console.log("\nDeterministic strategic ranking tests passed");
