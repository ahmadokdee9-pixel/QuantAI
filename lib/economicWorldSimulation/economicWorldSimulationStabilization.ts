/**
 * P6.9 — Economic simulation stabilization + ecosystem equilibrium.
 */

import type { UnifiedCognitiveGovernanceMeta } from "@/lib/cognitiveGovernance/cognitiveGovernanceTelemetry";
import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { EconomicWorldSimulationDetection } from "@/lib/economicWorldSimulation/economicWorldSimulationDetection";
import type { EconomicWorldSimulationGovernorsResult } from "@/lib/economicWorldSimulation/economicWorldSimulationGovernors";

export type EconomicWorldSimulationStabilization = {
  pricingPressureBalance: number;
  commerceEcosystemEquilibrium: number;
  simulationContinuity: number;
  longTermValueDurability: number;
  boundedEconomicInfluence: number;
  systemSimulationIntegrity: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function computeEconomicWorldSimulationStabilization(args: {
  cognitiveGovernance: UnifiedCognitiveGovernanceMeta;
  marketReality: MarketRealityIntelligenceMeta;
  governors: EconomicWorldSimulationGovernorsResult;
  detection: EconomicWorldSimulationDetection;
}): EconomicWorldSimulationStabilization {
  const { cognitiveGovernance, marketReality, governors, detection } = args;

  const pricingPressureBalance = round3(
    clamp(
      (marketReality.verifiedPricingContinuity ?? 0) * 0.35 +
        (1 - detection.demandSupplyInstabilityScore) * 0.3 +
        (cognitiveGovernance.rankingEquilibriumProtection ?? 0) * 0.2 -
        governors.priceVolatilityScore * 0.1,
      0,
      1
    )
  );

  const commerceEcosystemEquilibrium = round3(
    clamp(
      governors.economicProtectionScore * 0.35 +
        pricingPressureBalance * 0.3 +
        (cognitiveGovernance.governanceContinuity ?? 0) * 0.2 -
        detection.unstableEconomyScore * 0.1,
      0,
      1
    )
  );

  const simulationContinuity = round3(
    clamp(
      detection.simulationIntegrityScore * 0.35 +
        commerceEcosystemEquilibrium * 0.3 +
        (cognitiveGovernance.governanceContinuity ?? 0) * 0.2 -
        detection.economicFatigueScore * 0.08,
      0,
      1
    )
  );

  const longTermValueDurability = round3(
    clamp(
      (1 - detection.longTermValueDurabilityScore) * 0.4 +
        simulationContinuity * 0.35 +
        (marketReality.realityScore ?? 0) * 0.004 -
        detection.pricingMomentumDecayScore * 0.08,
      0,
      1
    )
  );

  const boundedEconomicInfluence = round3(
    clamp(
      longTermValueDurability * 0.4 +
        pricingPressureBalance * 0.3 +
        (1 - governors.recursiveAmplificationScore) * 0.2 -
        detection.fakeMomentumScore * 0.08,
      0,
      1
    )
  );

  const systemSimulationIntegrity = round3(
    clamp(
      detection.simulationIntegrityScore * 0.45 +
        boundedEconomicInfluence * 0.3 +
        simulationContinuity * 0.15 +
        (cognitiveGovernance.analytics?.replayIntegrityAnalytics ?? 0) * 0.01 * 0.1,
      0,
      1
    )
  );

  return {
    pricingPressureBalance,
    commerceEcosystemEquilibrium,
    simulationContinuity,
    longTermValueDurability,
    boundedEconomicInfluence,
    systemSimulationIntegrity,
  };
}
