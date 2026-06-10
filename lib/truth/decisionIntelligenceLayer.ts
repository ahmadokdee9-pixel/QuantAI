/**
 * Phase 1N — Decision intelligence layer.
 * Converts fused intelligence + trust into one explainable decision engine snapshot.
 */

import {
  isHighPrimaryRisk,
} from "@/lib/truth/commerceReasoningLayer";
import { isUnavailableAvailabilityState, type AvailabilityState } from "@/lib/truth/availabilityStateModel";
import type { TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";
import { isWeakTrustState } from "@/lib/truth/unifiedTrustEngine";

export type DecisionState = "BUY" | "CONSIDER" | "WAIT" | "AVOID" | "UNKNOWN";

export type DecisionEngineSnapshot = {
  decisionScore: number;
  decisionConfidence: number;
  decisionSignals: string[];
  decisionRisks: string[];
  decisionReasons: string[];
  decisionState: DecisionState;
};

export type DecisionEngineInput = Omit<TruthFoundationSnapshot, "decisionEngine" | "intentEngine" | "intentRetrieval" | "productMatch" | "productReasoning" | "recommendationIntelligence" | "explainableAI" | "conversationalIntent">;

export const WEAK_DECISION_SCORE_THRESHOLD = 52;
export const WEAK_DECISION_CONFIDENCE_THRESHOLD = 50;
export const ELEVATED_DECISION_RISK_THRESHOLD = 2;

const DECISION_WEIGHTS = {
  productIntelligence: 0.2,
  commerceIntelligence: 0.2,
  commerceReasoning: 0.15,
  evidenceGraph: 0.2,
  trustEngine: 0.25,
} as const;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function collectDecisionSignals(foundation: DecisionEngineInput): string[] {
  const product = foundation.productIntelligence;
  const commerce = foundation.commerceIntelligence;
  const reasoning = foundation.commerceReasoning;
  const evidence = foundation.evidenceReasoningGraph;
  const trust = foundation.trustEngine;
  const signals = new Set<string>();

  if (product.overallProductConfidence >= 65) {
    signals.add(`Product intelligence ${product.intelligenceState} (${product.overallProductConfidence})`);
  }
  if (commerce.commerceConfidence >= 65) {
    signals.add(`Commerce intelligence ${commerce.commerceState} (${commerce.commerceConfidence})`);
  }
  if (reasoning.strongestPositiveSignal !== "Limited positive confirmation") {
    signals.add(reasoning.strongestPositiveSignal);
  }
  for (const item of evidence.supportingEvidence.slice(0, 4)) {
    signals.add(item);
  }
  for (const item of trust.trustSignals.slice(0, 3)) {
    signals.add(item);
  }

  return [...signals];
}

function collectDecisionRisks(foundation: DecisionEngineInput): string[] {
  const reasoning = foundation.commerceReasoning;
  const evidence = foundation.evidenceReasoningGraph;
  const trust = foundation.trustEngine;
  const risks = new Set<string>();

  if (reasoning.primaryRisk !== "none") {
    risks.add(reasoning.strongestNegativeSignal);
  }
  if (isHighPrimaryRisk(reasoning.primaryRisk)) {
    risks.add(`Primary commerce risk: ${reasoning.primaryRisk}`);
  }
  for (const item of evidence.conflictingEvidence.slice(0, 4)) {
    risks.add(item);
  }
  for (const item of trust.trustRisks.slice(0, 4)) {
    risks.add(item);
  }
  if (foundation.priceTruth?.fakeDiscount.isFake) {
    risks.add("Fake discount undermines purchase decision");
  }
  if (isUnavailableAvailabilityState(foundation.availabilityState)) {
    risks.add("Listing unavailable for purchase");
  }

  return [...risks];
}

function buildDecisionReasons(args: {
  decisionState: DecisionState;
  strongestPositive: string;
  strongestNegative: string;
  decisionScore: number;
  decisionConfidence: number;
  signalCount: number;
  riskCount: number;
}): string[] {
  const reasons: string[] = [
    `Strongest positive factor: ${args.strongestPositive}`,
    `Strongest negative factor: ${args.strongestNegative}`,
    `Decision score ${args.decisionScore} with confidence ${args.decisionConfidence}`,
    `Positive evidence chain (${args.signalCount}) vs negative evidence chain (${args.riskCount})`,
    `Autonomous decision state: ${args.decisionState}`,
  ];
  return reasons;
}

function deriveDecisionState(args: {
  canonicalSkuId: string | null;
  decisionScore: number;
  decisionConfidence: number;
  decisionRiskCount: number;
  primaryRisk: string;
  availabilityState: AvailabilityState;
  fakeDiscount: boolean;
  trustState: string;
}): DecisionState {
  if (!args.canonicalSkuId || args.decisionScore < 25) {
    return "UNKNOWN";
  }
  if (
    args.decisionScore < 42 ||
    isHighPrimaryRisk(args.primaryRisk) ||
    isUnavailableAvailabilityState(args.availabilityState) ||
    args.fakeDiscount ||
    (isWeakTrustState(args.trustState) && args.decisionRiskCount >= 3)
  ) {
    return "AVOID";
  }
  if (
    args.decisionScore < WEAK_DECISION_SCORE_THRESHOLD ||
    args.decisionConfidence < WEAK_DECISION_CONFIDENCE_THRESHOLD ||
    (args.trustState === "TRUST_CAUTION" && args.decisionRiskCount >= 2)
  ) {
    return "WAIT";
  }
  if (
    args.decisionScore >= 72 &&
    args.decisionConfidence >= 65 &&
    args.decisionRiskCount <= 1 &&
    !isHighPrimaryRisk(args.primaryRisk)
  ) {
    return "BUY";
  }
  if (args.decisionScore >= WEAK_DECISION_SCORE_THRESHOLD) {
    return "CONSIDER";
  }
  return "WAIT";
}

export function hasDecisionEngineSignal(snapshot: DecisionEngineSnapshot | null | undefined): boolean {
  return Boolean(snapshot && snapshot.decisionScore >= 0);
}

export function isAvoidDecisionState(state: string): boolean {
  return state === "AVOID" || state === "UNKNOWN";
}

export function getStrongestPositiveFactor(signals: string[]): string {
  return signals[0] ?? "Limited positive confirmation";
}

export function getStrongestNegativeFactor(risks: string[]): string {
  return risks[0] ?? "No major negative signal";
}

/** Build autonomous decision snapshot from fused intelligence + trust layers. */
export function buildDecisionIntelligenceLayer(foundation: DecisionEngineInput): DecisionEngineSnapshot {
  const product = foundation.productIntelligence;
  const commerce = foundation.commerceIntelligence;
  const reasoning = foundation.commerceReasoning;
  const evidence = foundation.evidenceReasoningGraph;
  const trust = foundation.trustEngine;

  const layerScores = {
    productIntelligence: clampScore(product.overallProductConfidence),
    commerceIntelligence: clampScore(commerce.commerceConfidence),
    commerceReasoning: clampScore(reasoning.reasoningConfidence),
    evidenceGraph: clampScore((evidence.evidenceStrength + evidence.evidenceCompleteness) / 2),
    trustEngine: clampScore((trust.trustScore + trust.trustConfidence + trust.trustStrength) / 3),
  };

  const decisionScore = clampScore(
    layerScores.productIntelligence * DECISION_WEIGHTS.productIntelligence +
      layerScores.commerceIntelligence * DECISION_WEIGHTS.commerceIntelligence +
      layerScores.commerceReasoning * DECISION_WEIGHTS.commerceReasoning +
      layerScores.evidenceGraph * DECISION_WEIGHTS.evidenceGraph +
      layerScores.trustEngine * DECISION_WEIGHTS.trustEngine
  );

  const decisionSignals = collectDecisionSignals(foundation);
  const decisionRisks = collectDecisionRisks(foundation);
  const strongestPositive = getStrongestPositiveFactor(decisionSignals);
  const strongestNegative = getStrongestNegativeFactor(decisionRisks);

  const decisionConfidence = clampScore(
    decisionScore * 0.4 +
      trust.trustConfidence * 0.2 +
      evidence.evidenceCompleteness * 0.2 +
      reasoning.reasoningConfidence * 0.2 +
      Math.min(16, decisionSignals.length * 3) -
      Math.min(22, decisionRisks.length * 5)
  );

  const decisionState = deriveDecisionState({
    canonicalSkuId: foundation.canonicalSkuId,
    decisionScore,
    decisionConfidence,
    decisionRiskCount: decisionRisks.length,
    primaryRisk: reasoning.primaryRisk,
    availabilityState: foundation.availabilityState,
    fakeDiscount: foundation.priceTruth?.fakeDiscount.isFake === true,
    trustState: trust.trustState,
  });

  const decisionReasons = buildDecisionReasons({
    decisionState,
    strongestPositive,
    strongestNegative,
    decisionScore,
    decisionConfidence,
    signalCount: decisionSignals.length,
    riskCount: decisionRisks.length,
  });

  return {
    decisionScore,
    decisionConfidence,
    decisionSignals,
    decisionRisks,
    decisionReasons,
    decisionState,
  };
}
