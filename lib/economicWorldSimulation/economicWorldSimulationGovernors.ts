/**
 * P6.9 — Economic simulation protection governors (deterministic; no memory storage).
 */

import type { UnifiedCognitiveGovernanceMeta } from "@/lib/cognitiveGovernance/cognitiveGovernanceTelemetry";
import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { CommerceDecisionIntelligenceMeta } from "@/lib/commerceDecision/commerceDecisionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";

export type EconomicWorldSimulationGovernorsResult = {
  economicInstabilityRollback: boolean;
  fakeMomentumSuppression: boolean;
  priceVolatilityBlockade: boolean;
  ecosystemCollapseProtection: boolean;
  recursiveEconomicAmplificationSuppression: boolean;
  unstableMerchantPressureRollback: boolean;
  confidenceInflationRollback: boolean;
  contradictionCascadeProtection: boolean;
  economicInstabilityScore: number;
  fakeMomentumScore: number;
  priceVolatilityScore: number;
  ecosystemCollapseScore: number;
  recursiveAmplificationScore: number;
  merchantPressureScore: number;
  confidenceInflationScore: number;
  contradictionCascadeScore: number;
  economicProtectionScore: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function computeEconomicWorldSimulationGovernors(args: {
  cognitiveGovernance: UnifiedCognitiveGovernanceMeta;
  marketReality: MarketRealityIntelligenceMeta;
  commerceDecision: CommerceDecisionIntelligenceMeta;
  governance: IntentGovernanceMeta;
}): EconomicWorldSimulationGovernorsResult {
  const { cognitiveGovernance, marketReality, commerceDecision, governance } = args;

  const layerDeltas = [
    cognitiveGovernance.governanceDelta ?? 0,
    marketReality.realityDelta ?? 0,
    commerceDecision.decisionDelta ?? 0,
  ];
  const deltaSpread = Math.max(...layerDeltas) - Math.min(...layerDeltas);
  const economicInstabilityScore = round3(clamp(deltaSpread * 0.5 + (cognitiveGovernance.analytics?.topDriftCount ?? 0) * 0.07, 0, 1));
  const economicInstabilityRollback = economicInstabilityScore >= 0.4 || cognitiveGovernance.globalEquilibriumDriftDetected;

  const fakeMomentumScore = round3(
    clamp(
      (marketReality.fakeDiscountScore ?? 0) * 0.45 +
        (marketReality.fakeDiscountDetected ? 0.25 : 0) +
        (cognitiveGovernance.recursiveInfluenceSuppression ? 0.15 : 0),
      0,
      1
    )
  );
  const fakeMomentumSuppression = fakeMomentumScore >= 0.35 || marketReality.fakeDiscountDetected;

  const priceVolatilityScore = round3(
    clamp(
      Math.abs((marketReality.realityDelta ?? 0) - (commerceDecision.decisionDelta ?? 0)) * 0.55 +
        (marketReality.unreliableOfferDetected ? 0.2 : 0),
      0,
      1
    )
  );
  const priceVolatilityBlockade = priceVolatilityScore >= 0.38;

  const rollbackCount = [cognitiveGovernance.rollbackTriggered, marketReality.rollbackTriggered, commerceDecision.rollbackTriggered].filter(Boolean).length;
  const ecosystemCollapseScore = round3(clamp(rollbackCount * 0.22 + (governance.anomalyDetected ? 0.25 : 0), 0, 1));
  const ecosystemCollapseProtection = ecosystemCollapseScore >= 0.35 || rollbackCount >= 2;

  const recursiveAmplificationScore = round3(
    clamp(
      (cognitiveGovernance.governanceDelta ?? 0) * 0.35 +
        (marketReality.realityDelta ?? 0) * 0.25 +
        (cognitiveGovernance.recursiveInfluenceSuppression ? 0.2 : 0),
      0,
      1
    )
  );
  const recursiveEconomicAmplificationSuppression = recursiveAmplificationScore >= 0.4 || cognitiveGovernance.recursiveInfluenceSuppression;

  const merchantPressureScore = round3(
    clamp(
      (1 - (marketReality.verifiedPricingContinuity ?? 0)) * 0.35 +
        (marketReality.trustDecayDetected ? 0.25 : 0) +
        (commerceDecision.unsafePromotionDominanceDetected ? 0.15 : 0),
      0,
      1
    )
  );
  const unstableMerchantPressureRollback = merchantPressureScore >= 0.38;

  const layerConfidences = [cognitiveGovernance.governanceConfidence ?? 0, marketReality.realityConfidence ?? 0, commerceDecision.decisionConfidence ?? 0];
  const confidenceMean = layerConfidences.reduce((s, v) => s + v, 0) / layerConfidences.length;
  const confidenceInflationScore = round3(clamp(Math.max(0, confidenceMean - 0.55) * 1.35 + (cognitiveGovernance.confidenceInflationSuppression ? 0.1 : 0), 0, 1));
  const confidenceInflationRollback = confidenceInflationScore >= 0.38 || cognitiveGovernance.confidenceInflationSuppression;

  const contradictionTotal =
    (cognitiveGovernance.contradictionCount ?? 0) + (marketReality.contradictionCount ?? 0) + (commerceDecision.contradictionCount ?? 0);
  const contradictionCascadeScore = round3(clamp(contradictionTotal * 0.12 + (cognitiveGovernance.contradictionCascadeProtection ? 0.15 : 0), 0, 1));
  const contradictionCascadeProtection = contradictionCascadeScore >= 0.35 || contradictionTotal >= 3;

  const protectionScores = [
    economicInstabilityScore,
    fakeMomentumScore,
    priceVolatilityScore,
    ecosystemCollapseScore,
    recursiveAmplificationScore,
    merchantPressureScore,
    confidenceInflationScore,
    contradictionCascadeScore,
  ];
  const economicProtectionScore = round3(clamp(1 - protectionScores.reduce((s, v) => s + v, 0) / protectionScores.length, 0, 1));

  return {
    economicInstabilityRollback,
    fakeMomentumSuppression,
    priceVolatilityBlockade,
    ecosystemCollapseProtection,
    recursiveEconomicAmplificationSuppression,
    unstableMerchantPressureRollback,
    confidenceInflationRollback,
    contradictionCascadeProtection,
    economicInstabilityScore,
    fakeMomentumScore,
    priceVolatilityScore,
    ecosystemCollapseScore,
    recursiveAmplificationScore,
    merchantPressureScore,
    confidenceInflationScore,
    contradictionCascadeScore,
    economicProtectionScore,
  };
}
