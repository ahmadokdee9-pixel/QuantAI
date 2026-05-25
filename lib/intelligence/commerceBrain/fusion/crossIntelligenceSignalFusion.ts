/**
 * Phase 11 — Cross-intelligence signal fusion.
 */

import type { CommerceBrainInput, FusedIntelligenceSignal, IntelligenceLayerId } from "../types";

const MAX_SIGNALS = 24;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function push(
  out: FusedIntelligenceSignal[],
  layer: IntelligenceLayerId,
  signalId: string,
  weight01: number,
  confidence01: number
) {
  if (weight01 < 0.2) return;
  out.push({ layer, signalId, weight01: round4(weight01), confidence01: round4(confidence01) });
}

export function fuseCrossIntelligenceSignals(input: CommerceBrainInput): FusedIntelligenceSignal[] {
  const signals: FusedIntelligenceSignal[] = [];

  if (input.identity?.meta.enabled) {
    push(
      signals,
      "identity",
      "canonical_coverage",
      input.identity.meta.identityCoverage,
      input.identity.meta.canonicalProductCount > 0 ? 0.7 : 0.4
    );
  }
  if (input.trust?.meta.enabled) {
    push(signals, "trust", "trust_coverage", input.trust.meta.trustCoverage, input.trust.meta.avgTrustScore / 100);
    push(
      signals,
      "trust",
      "fake_discount_risk",
      input.trust.meta.fakeDiscountAlertCount / 8,
      1 - input.trust.meta.avgPriceTruthScore / 100
    );
  }
  if (input.memory?.meta.enabled) {
    push(
      signals,
      "memory",
      "taste_confidence",
      input.memory.meta.tasteProfileConfidence,
      input.memory.preferenceSignals.confidence01
    );
    push(
      signals,
      "taste",
      "preference_score",
      input.memory.preferenceSignals.preferenceScore / 100,
      input.memory.preferenceSignals.stability01
    );
  }
  if (input.recommendation?.meta.enabled) {
    push(
      signals,
      "recommendation",
      "cognition_confidence",
      input.recommendation.meta.avgConfidence01,
      input.recommendation.meta.diversityStability01
    );
    push(
      signals,
      "recommendation",
      "trust_first",
      input.recommendation.latentIntent.trustFirst01,
      input.recommendation.latentIntent.trustFirst01
    );
  }
  if (input.commerceOs?.meta.enabled) {
    push(
      signals,
      "commerce_os",
      "market_pressure",
      input.commerceOs.meta.market.pressureScore,
      input.commerceOs.meta.avgStrategicConfidence
    );
    push(
      signals,
      "commerce_os",
      "economic_fit",
      input.commerceOs.meta.economic.fitScore,
      1 - input.commerceOs.meta.economic.instabilityScore
    );
  }
  if (input.activation?.meta.enabled) {
    push(
      signals,
      "activation",
      "governance_confidence",
      input.activation.governance.confidence01,
      input.activation.meta.mutationApproved ? 0.75 : 0.35
    );
  }
  if (input.evolution?.meta.enabled) {
    push(
      signals,
      "evolution",
      "lifecycle_maturity",
      input.evolution.lifecycle.lifecycleMaturity01,
      input.evolution.meta.evolutionConfidence01
    );
    push(
      signals,
      "evolution",
      "replacement_cycle",
      input.evolution.lifecycle.replacementCycle01,
      input.evolution.lifecycle.replacementCycle01
    );
  }

  return signals.sort((a, b) => b.weight01 - a.weight01).slice(0, MAX_SIGNALS);
}
