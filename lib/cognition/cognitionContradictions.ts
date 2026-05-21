/**
 * P6.0 — Cross-layer contradiction detection (deterministic).
 */

import type { BehavioralCommerceMeta } from "@/lib/behavioral/behavioralTelemetry";
import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { MarketIntelligenceMeta } from "@/lib/market/marketTelemetry";
import type { AdaptiveReasoningMeta } from "@/lib/reasoning/reasoningTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";
import type { UnifiedCommerceState } from "@/lib/cognition/cognitionFusion";

export type CognitionContradictionResult = {
  contradictionCount: number;
  contradictions: string[];
  contradictionSeverity: number;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function detectCognitionContradictions(args: {
  state: UnifiedCommerceState;
  reasoning: AdaptiveReasoningMeta;
  decision: DecisionIntelligenceMeta;
  strategy: StrategyIntelligenceMeta;
  market: MarketIntelligenceMeta;
  behavioral: BehavioralCommerceMeta;
}): CognitionContradictionResult {
  const { state, reasoning, decision, strategy, market, behavioral } = args;
  const contradictions: string[] = [];

  if (state.conversionProbability >= 0.55 && behavioral.buyingFriction >= 0.55) {
    contradictions.push("conversion_friction_conflict");
  }
  if (state.trustValueBalance >= 0.4 && market.marketVolatility >= 0.55) {
    contradictions.push("trust_volatility_conflict");
  }
  if (strategy.premiumPositioning >= 0.4 && decision.valueDecision >= 0.5 && strategy.strategicValue < 0.1) {
    contradictions.push("premium_value_conflict");
  }
  if (reasoning.reasoningConfidence >= 0.5 && decision.decisionConfidence < 0.3) {
    contradictions.push("reasoning_decision_divergence");
  }
  if (behavioral.conversionReadiness >= 0.5 && behavioral.decisionHesitation >= 0.55) {
    contradictions.push("readiness_hesitation_conflict");
  }
  if (market.rollbackTriggered || strategy.rollbackTriggered || behavioral.rollbackTriggered) {
    contradictions.push("upstream_rollback");
  }
  if (state.replayIntegrity < 0.5) {
    contradictions.push("replay_integrity_low");
  }

  const contradictionSeverity = round3(Math.min(1, contradictions.length * 0.18 + (state.replayIntegrity < 0.5 ? 0.2 : 0)));

  return {
    contradictionCount: contradictions.length,
    contradictions: contradictions.slice(0, 8),
    contradictionSeverity,
  };
}
