/**
 * P6.9 — Deterministic economic world simulation unit tests.
 */
import { runEconomicWorldSimulationEngine } from "../../lib/economicWorldSimulation/economicWorldSimulationEngine.ts";

let failed = 0;
const cognitiveGovernance = {
  governanceScore: 67,
  governanceDelta: 0.075,
  governanceConfidence: 0.62,
  governanceIntegrityScore: 1,
  governanceActive: true,
  globalEquilibriumDriftDetected: false,
  recursiveInfluenceSuppression: false,
  confidenceInflationSuppression: false,
  contradictionCascadeProtection: false,
  rollbackTriggered: false,
  rankingEquilibriumProtection: 0.67,
  governanceContinuity: 0.73,
  governanceSnapshotHash: "gov:67;prot:937;int:1000",
  contradictionCount: 0,
  analytics: { replayIntegrityAnalytics: 100, topDriftCount: 0 },
};
const commerceDecision = {
  decisionDelta: 0.083,
  decisionConfidence: 0.54,
  rollbackTriggered: false,
  contradictionCount: 0,
  unsafePromotionDominanceDetected: false,
};
const marketReality = {
  realityScore: 52,
  realityDelta: 0.067,
  realityConfidence: 0.43,
  verifiedPricingContinuity: 0.37,
  fakeDiscountScore: 0.08,
  fakeDiscountDetected: false,
  trustDecayDetected: false,
  unreliableOfferDetected: false,
  rollbackTriggered: false,
  contradictionCount: 0,
};
const governance = { anomalyDetected: false, blockedPolicies: [] };
const profile = { id: "bounded-simulation", allowsMutation: true, requiresGovernancePass: false, requiresGovernanceStable: false, maxDelta: 1, maxPressureAmplification: 0.75, maxEquilibriumAmplification: 0.75 };

const run1 = runEconomicWorldSimulationEngine({ cognitiveGovernance, marketReality, commerceDecision, governance, profile });
const run2 = runEconomicWorldSimulationEngine({ cognitiveGovernance, marketReality, commerceDecision, governance, profile });

if (run1.signals.signalHash !== run2.signals.signalHash) {
  failed += 1;
  console.error("FAIL signal hash mismatch");
} else {
  console.log(`OK signalHash=${run1.signals.signalHash.slice(0, 40)}...`);
}

if (run1.influence.simulationDelta !== run2.influence.simulationDelta) {
  failed += 1;
  console.error("FAIL simulation delta mismatch");
} else {
  console.log(`OK simulationDelta=${run1.influence.simulationDelta}`);
}

if (!run1.signals.simulationSnapshotHash) {
  failed += 1;
  console.error("FAIL missing simulation snapshot");
} else {
  console.log(`OK snapshot=${run1.signals.simulationSnapshotHash.slice(0, 30)}...`);
}

if (failed) process.exit(1);
console.log("\nDeterministic economic world simulation tests passed");
