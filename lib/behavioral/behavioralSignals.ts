/**
 * P5.9 — Aggregate behavioral commerce signals (deterministic; no embeddings).
 */

import type { BuyingFriction } from "@/lib/behavioral/behavioralFriction";
import type { ComparisonFatigue } from "@/lib/behavioral/behavioralComparisonFatigue";
import type { ConversionReadiness } from "@/lib/behavioral/behavioralConversionReadiness";
import type { DecisionHesitation } from "@/lib/behavioral/behavioralHesitation";
import type { TrustMomentumBehavior } from "@/lib/behavioral/behavioralTrustMomentum";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { MarketIntelligenceMeta } from "@/lib/market/marketTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";

export type BehavioralSignalBundle = {
  buyingFriction: number;
  decisionHesitation: number;
  comparisonFatigue: number;
  trustMomentum: number;
  conversionReadiness: number;
  behavioralAggregate: number;
  rankingContinuity: number;
  replayIntegrity: number;
  signalHash: string;
  graphExecutionHash: string;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function buildSignalHash(signals: Omit<BehavioralSignalBundle, "signalHash" | "graphExecutionHash">): string {
  return Object.entries(signals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${Math.round(Number(v) * 1000)}`)
    .join("|");
}

export function buildBehavioralSignals(args: {
  friction: BuyingFriction;
  hesitation: DecisionHesitation;
  fatigue: ComparisonFatigue;
  trustMomentum: TrustMomentumBehavior;
  readiness: ConversionReadiness;
  market: MarketIntelligenceMeta;
  strategy: StrategyIntelligenceMeta;
  governance: IntentGovernanceMeta;
}): BehavioralSignalBundle {
  const { friction, hesitation, fatigue, trustMomentum, readiness, market, strategy, governance } = args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;

  const core = {
    buyingFriction: friction.buyingFriction,
    decisionHesitation: hesitation.decisionHesitation,
    comparisonFatigue: fatigue.comparisonFatigue,
    trustMomentum: trustMomentum.trustMomentum,
    conversionReadiness: readiness.conversionReadiness,
    behavioralAggregate: round3(
      (readiness.conversionReadiness +
        trustMomentum.trustMomentum +
        (1 - friction.buyingFriction) +
        (1 - hesitation.decisionHesitation) +
        (1 - fatigue.comparisonFatigue)) /
        5
    ),
    rankingContinuity: round3(strategy.continuityStrength * 0.5 + market.analytics.rankingContinuityAnalytics * 0.01),
    replayIntegrity: round3(
      market.analytics.replayIntegrityAnalytics * 0.01 * strategy.replayIntegrity * 0.01 * governanceDampen
    ),
  };

  const graphExecutionHash = [
    `friction:${core.buyingFriction}`,
    `hesitation:${core.decisionHesitation}`,
    `fatigue:${core.comparisonFatigue}`,
    `trust:${core.trustMomentum}`,
    `readiness:${core.conversionReadiness}`,
  ].join(",");

  return {
    ...core,
    signalHash: buildSignalHash(core),
    graphExecutionHash,
  };
}
