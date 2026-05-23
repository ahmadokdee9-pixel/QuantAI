/**
 * P6.9 — Economic world simulation detection unit tests.
 */
import { computeEconomicWorldSimulationGovernors } from "../../lib/economicWorldSimulation/economicWorldSimulationGovernors.ts";
import { detectEconomicWorldSimulationSignals } from "../../lib/economicWorldSimulation/economicWorldSimulationDetection.ts";

let failed = 0;
const stableGovernance = {
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
  contradictionCount: 0,
  analytics: { topDriftCount: 0 },
};
const unstableGovernance = {
  governanceDelta: 0.9,
  governanceConfidence: 0.28,
  governanceIntegrityScore: 0.35,
  governanceActive: false,
  globalEquilibriumDriftDetected: true,
  recursiveInfluenceSuppression: true,
  confidenceInflationSuppression: true,
  contradictionCascadeProtection: true,
  rollbackTriggered: true,
  rankingEquilibriumProtection: 0.2,
  contradictionCount: 3,
  analytics: { topDriftCount: 2 },
};
const stableMarket = { realityDelta: 0.067, realityConfidence: 0.43, verifiedPricingContinuity: 0.6, fakeDiscountScore: 0.08, fakeDiscountDetected: false, trustDecayDetected: false, unreliableOfferDetected: false, rollbackTriggered: false, contradictionCount: 0 };
const unstableMarket = { realityDelta: 0.85, realityConfidence: 0.2, verifiedPricingContinuity: 0.15, fakeDiscountScore: 0.75, fakeDiscountDetected: true, trustDecayDetected: true, unreliableOfferDetected: true, rollbackTriggered: true, contradictionCount: 2 };
const stableDecision = { decisionDelta: 0.083, decisionConfidence: 0.54, rollbackTriggered: false, contradictionCount: 0, unsafePromotionDominanceDetected: false };
const unstableDecision = { decisionDelta: 0.9, decisionConfidence: 0.25, rollbackTriggered: true, contradictionCount: 3, unsafePromotionDominanceDetected: true };
const governanceStable = { anomalyDetected: false, blockedPolicies: [] };
const governanceUnstable = { anomalyDetected: true, blockedPolicies: ["policy_a"] };

const stableGovernors = computeEconomicWorldSimulationGovernors({
  cognitiveGovernance: stableGovernance,
  marketReality: stableMarket,
  commerceDecision: stableDecision,
  governance: governanceStable,
});
const unstableGovernors = computeEconomicWorldSimulationGovernors({
  cognitiveGovernance: unstableGovernance,
  marketReality: unstableMarket,
  commerceDecision: unstableDecision,
  governance: governanceUnstable,
});

const stable = detectEconomicWorldSimulationSignals({ cognitiveGovernance: stableGovernance, marketReality: stableMarket, governors: stableGovernors });
const unstable = detectEconomicWorldSimulationSignals({ cognitiveGovernance: unstableGovernance, marketReality: unstableMarket, governors: unstableGovernors });

if (unstable.simulationIntegrityScore >= stable.simulationIntegrityScore) {
  failed += 1;
  console.error("FAIL simulation integrity ordering");
} else {
  console.log(`OK integrity stable=${stable.simulationIntegrityScore} unstable=${unstable.simulationIntegrityScore}`);
}

if (!unstable.fakeMomentumDetected || !unstable.unstableEconomyDetected) {
  failed += 1;
  console.error("FAIL unstable economic pattern detection");
} else {
  console.log("OK unstable economic patterns detected");
}

if (!unstableGovernors.fakeMomentumSuppression || !unstableGovernors.ecosystemCollapseProtection) {
  failed += 1;
  console.error("FAIL economic protections not triggered");
} else {
  console.log("OK economic protections triggered");
}

if (failed) process.exit(1);
console.log("\nEconomic world simulation detection tests passed");
