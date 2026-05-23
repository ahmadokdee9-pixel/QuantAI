/**
 * P6.9 — Economic world simulation detection (deterministic; no memory storage).
 */

import type { UnifiedCognitiveGovernanceMeta } from "@/lib/cognitiveGovernance/cognitiveGovernanceTelemetry";
import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { EconomicWorldSimulationGovernorsResult } from "@/lib/economicWorldSimulation/economicWorldSimulationGovernors";

export type EconomicWorldSimulationDetection = {
  economicPressureDetected: boolean;
  demandSupplyInstabilityDetected: boolean;
  merchantSurvivabilityRiskDetected: boolean;
  pricingMomentumDecayDetected: boolean;
  longTermValueDurabilityRiskDetected: boolean;
  economicFatigueDetected: boolean;
  fakeMomentumDetected: boolean;
  unstableEconomyDetected: boolean;
  economicPressureScore: number;
  demandSupplyInstabilityScore: number;
  merchantSurvivabilityScore: number;
  pricingMomentumDecayScore: number;
  longTermValueDurabilityScore: number;
  economicFatigueScore: number;
  fakeMomentumScore: number;
  unstableEconomyScore: number;
  simulationIntegrityScore: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function detectEconomicWorldSimulationSignals(args: {
  cognitiveGovernance: UnifiedCognitiveGovernanceMeta;
  marketReality: MarketRealityIntelligenceMeta;
  governors: EconomicWorldSimulationGovernorsResult;
}): EconomicWorldSimulationDetection {
  const { cognitiveGovernance, marketReality, governors } = args;

  const economicPressureScore = round3(clamp(governors.economicInstabilityScore * 0.65 + (cognitiveGovernance.governanceDelta ?? 0) * 0.2, 0, 1));
  const economicPressureDetected = economicPressureScore >= 0.38 || governors.economicInstabilityRollback;

  const demandSupplyInstabilityScore = round3(
    clamp((1 - (marketReality.verifiedPricingContinuity ?? 0)) * 0.4 + governors.priceVolatilityScore * 0.35, 0, 1)
  );
  const demandSupplyInstabilityDetected = demandSupplyInstabilityScore >= 0.38 || governors.priceVolatilityBlockade;

  const merchantSurvivabilityScore = round3(clamp(governors.merchantPressureScore * 0.7 + (marketReality.trustDecayDetected ? 0.2 : 0), 0, 1));
  const merchantSurvivabilityRiskDetected = merchantSurvivabilityScore >= 0.38 || governors.unstableMerchantPressureRollback;

  const pricingMomentumDecayScore = round3(clamp(governors.fakeMomentumScore * 0.55 + (1 - (marketReality.verifiedPricingContinuity ?? 0)) * 0.25, 0, 1));
  const pricingMomentumDecayDetected = pricingMomentumDecayScore >= 0.35;

  const longTermValueDurabilityScore = round3(
    clamp((cognitiveGovernance.rankingEquilibriumProtection ?? 0) * 0.35 + (1 - governors.economicProtectionScore) * 0.35 + (marketReality.realityScore ?? 0) * 0.003, 0, 1)
  );
  const longTermValueDurabilityRiskDetected = longTermValueDurabilityScore >= 0.42;

  const economicFatigueScore = round3(
    clamp((cognitiveGovernance.analytics?.topDriftCount ?? 0) * 0.08 + economicPressureScore * 0.35 + governors.ecosystemCollapseScore * 0.25, 0, 1)
  );
  const economicFatigueDetected = economicFatigueScore >= 0.38;

  const fakeMomentumScore = round3(clamp(governors.fakeMomentumScore * 0.75 + (marketReality.fakeDiscountDetected ? 0.15 : 0), 0, 1));
  const fakeMomentumDetected = fakeMomentumScore >= 0.35 || governors.fakeMomentumSuppression;

  const unstableEconomyScore = round3(
    clamp(governors.ecosystemCollapseScore * 0.45 + economicPressureScore * 0.3 + governors.recursiveAmplificationScore * 0.2, 0, 1)
  );
  const unstableEconomyDetected = unstableEconomyScore >= 0.4 || governors.ecosystemCollapseProtection;

  const riskMean = [
    economicPressureScore,
    demandSupplyInstabilityScore,
    merchantSurvivabilityScore,
    pricingMomentumDecayScore,
    longTermValueDurabilityScore,
    economicFatigueScore,
    fakeMomentumScore,
    unstableEconomyScore,
  ].reduce((s, v) => s + v, 0) / 8;

  const simulationIntegrityScore = round3(clamp(1 - riskMean * 0.85 + governors.economicProtectionScore * 0.12 + (cognitiveGovernance.governanceIntegrityScore ?? 0) * 0.08, 0, 1));

  return {
    economicPressureDetected,
    demandSupplyInstabilityDetected,
    merchantSurvivabilityRiskDetected,
    pricingMomentumDecayDetected,
    longTermValueDurabilityRiskDetected,
    economicFatigueDetected,
    fakeMomentumDetected,
    unstableEconomyDetected,
    economicPressureScore,
    demandSupplyInstabilityScore,
    merchantSurvivabilityScore,
    pricingMomentumDecayScore,
    longTermValueDurabilityScore,
    economicFatigueScore,
    fakeMomentumScore,
    unstableEconomyScore,
    simulationIntegrityScore,
  };
}
