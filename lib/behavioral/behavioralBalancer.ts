/**
 * P5.9 — Behavioral balancer (bounded advisory weights + routing).
 */

import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { MarketIntelligenceMeta } from "@/lib/market/marketTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";
import type { BehavioralProfile } from "@/lib/behavioral/behavioralProfiles";
import type { BehavioralRoutingLane } from "@/lib/behavioral/behavioralFlags";
import type { BehavioralSignalBundle } from "@/lib/behavioral/behavioralSignals";
import type { ConversionReadiness } from "@/lib/behavioral/behavioralConversionReadiness";
import type { BuyingFriction } from "@/lib/behavioral/behavioralFriction";
import type { DecisionHesitation } from "@/lib/behavioral/behavioralHesitation";
import type { ComparisonFatigue } from "@/lib/behavioral/behavioralComparisonFatigue";

export type BehavioralBalanceResult = {
  routingLane: BehavioralRoutingLane;
  governanceDampen: number;
  marketStable: boolean;
  strategyStable: boolean;
  balanceScore: number;
  behavioralConfidence: number;
};

export type BehavioralBlendInfluence = {
  behavioralDelta: number;
  buyingFriction: number;
  decisionHesitation: number;
  comparisonFatigue: number;
  trustMomentum: number;
  conversionReadiness: number;
  frictionAmplification: number;
  hesitationAmplification: number;
  readinessAmplification: number;
  continuityStrength: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function resolveBehavioralRoutingLane(args: {
  signals: BehavioralSignalBundle;
  friction: BuyingFriction;
  hesitation: DecisionHesitation;
  fatigue: ComparisonFatigue;
  readiness: ConversionReadiness;
  market: MarketIntelligenceMeta;
  strategy: StrategyIntelligenceMeta;
  governance: IntentGovernanceMeta;
}): BehavioralRoutingLane {
  const { signals, friction, hesitation, fatigue, readiness, market, strategy, governance } = args;

  if (governance.anomalyDetected || market.rollbackTriggered) return "stabilize";
  if (strategy.rollbackTriggered || signals.replayIntegrity < 0.6) return "replay-protect";
  if (friction.frictionLane === "high" || signals.buyingFriction >= 0.55) return "friction-check";
  if (hesitation.hesitationLane === "hesitant" || signals.decisionHesitation >= 0.55) return "hesitation-check";
  if (fatigue.fatigueLane === "fatigued" || signals.comparisonFatigue >= 0.55) return "comparison-fatigue";
  if (readiness.readinessLane === "ready" && signals.conversionReadiness >= 0.55) return "conversion-ready";
  if (signals.trustMomentum >= 0.45) return "trust-momentum";
  if (signals.behavioralAggregate >= 0.4) return "commerce-safe";
  if (market.marketActive && !market.mutationApplied) return "advisory-only";
  return "hold";
}

export function computeBehavioralConfidence(args: {
  signals: BehavioralSignalBundle;
  market: MarketIntelligenceMeta;
  strategy: StrategyIntelligenceMeta;
  governanceDampen: number;
}): number {
  const { signals, market, strategy, governanceDampen } = args;
  const signalConfidence = clamp(
    signals.conversionReadiness * 0.22 +
      signals.trustMomentum * 0.18 +
      (1 - signals.buyingFriction) * 0.15 +
      (1 - signals.decisionHesitation) * 0.12 +
      signals.behavioralAggregate * 0.13 +
      signals.rankingContinuity * 0.1,
    0,
    1
  );
  return round3(
    clamp(signalConfidence * 0.35 + market.marketConfidence * 0.3 + strategy.strategyConfidence * 0.25, 0, 1) *
      governanceDampen
  );
}

export function computeBehavioralBalance(args: {
  signals: BehavioralSignalBundle;
  behavioralConfidence: number;
  governance: IntentGovernanceMeta;
  market: MarketIntelligenceMeta;
  strategy: StrategyIntelligenceMeta;
  profile: BehavioralProfile;
}): BehavioralBalanceResult {
  const { signals, behavioralConfidence, governance, market, strategy, profile } = args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.9;

  const marketStable = !market.rollbackTriggered && market.analytics.replayIntegrityAnalytics >= 50;
  const strategyStable = !strategy.rollbackTriggered && strategy.replayIntegrity >= 50 && strategy.strategyScore >= 40;

  let routingLane = resolveBehavioralRoutingLane({
    signals,
    friction: { buyingFriction: signals.buyingFriction, frictionLane: signals.buyingFriction >= 0.55 ? "high" : signals.buyingFriction >= 0.3 ? "moderate" : "low" },
    hesitation: { decisionHesitation: signals.decisionHesitation, hesitationLane: signals.decisionHesitation >= 0.55 ? "hesitant" : signals.decisionHesitation >= 0.35 ? "cautious" : "decisive" },
    fatigue: { comparisonFatigue: signals.comparisonFatigue, fatigueLane: signals.comparisonFatigue >= 0.55 ? "fatigued" : signals.comparisonFatigue >= 0.35 ? "moderate" : "fresh" },
    readiness: { conversionReadiness: signals.conversionReadiness, readinessLane: signals.conversionReadiness >= 0.55 ? "ready" : signals.conversionReadiness < 0.3 ? "blocked" : "warming" },
    market,
    strategy,
    governance,
  });

  if (!profile.allowsMutation) routingLane = routingLane === "hold" ? "advisory-only" : routingLane;

  const balanceScore = Math.min(
    100,
    Math.round(behavioralConfidence * 40 + signals.behavioralAggregate * 30 + market.marketScore * 0.15 + strategy.strategyScore * 0.1)
  );

  return {
    routingLane,
    governanceDampen,
    marketStable,
    strategyStable,
    balanceScore,
    behavioralConfidence,
  };
}

export function computeBehavioralBlendInfluence(args: {
  signals: BehavioralSignalBundle;
  balance: BehavioralBalanceResult;
  profile: BehavioralProfile;
}): BehavioralBlendInfluence {
  const { signals, balance, profile } = args;
  const damp = balance.governanceDampen;

  const frictionAmplification = clamp(
    signals.buyingFriction * profile.maxFrictionAmplification * damp,
    0,
    profile.maxFrictionAmplification
  );
  const hesitationAmplification = clamp(
    signals.decisionHesitation * profile.maxHesitationAmplification * damp,
    0,
    profile.maxHesitationAmplification
  );
  const readinessAmplification = clamp(
    signals.conversionReadiness * profile.maxReadinessAmplification * damp,
    0,
    profile.maxReadinessAmplification
  );

  const buyingFriction = frictionAmplification;
  const decisionHesitation = hesitationAmplification;
  const comparisonFatigue = clamp(signals.comparisonFatigue * profile.maxDelta * damp, 0, profile.maxDelta);
  const trustMomentum = clamp(signals.trustMomentum * profile.maxReadinessAmplification * damp, 0, profile.maxReadinessAmplification);
  const conversionReadiness = readinessAmplification;
  const continuityStrength = clamp(signals.rankingContinuity * profile.maxDelta * 0.5, 0, profile.maxDelta);

  const laneScale =
    balance.routingLane === "conversion-ready" || balance.routingLane === "trust-momentum"
      ? 1.05
      : balance.routingLane === "commerce-safe"
        ? 1
        : balance.routingLane === "friction-check" ||
            balance.routingLane === "hesitation-check" ||
            balance.routingLane === "comparison-fatigue"
          ? 0.75
          : balance.routingLane === "advisory-only"
            ? 0.5
            : 0.95;

  const behavioralDelta = clamp(
    (buyingFriction +
      decisionHesitation +
      comparisonFatigue +
      trustMomentum +
      conversionReadiness +
      continuityStrength) *
      0.08 *
      laneScale,
    0,
    profile.maxDelta
  );

  return {
    behavioralDelta: round3(behavioralDelta),
    buyingFriction: round3(buyingFriction),
    decisionHesitation: round3(decisionHesitation),
    comparisonFatigue: round3(comparisonFatigue),
    trustMomentum: round3(trustMomentum),
    conversionReadiness: round3(conversionReadiness),
    frictionAmplification: round3(frictionAmplification),
    hesitationAmplification: round3(hesitationAmplification),
    readinessAmplification: round3(readinessAmplification),
    continuityStrength: round3(continuityStrength),
  };
}

export function runBehavioralEngine(args: {
  signals: BehavioralSignalBundle;
  balance: BehavioralBalanceResult;
  influence: BehavioralBlendInfluence;
  behavioralConfidence: number;
  profile: BehavioralProfile;
  governance: IntentGovernanceMeta;
}): { behavioralScore: number; anomalies: string[] } {
  const { signals, balance, influence, behavioralConfidence, profile, governance } = args;
  const anomalies: string[] = [];

  if (profile.requiresGovernancePass && governance.anomalyDetected) anomalies.push("governance_gate");
  if (profile.requiresMarketStable && !balance.marketStable) anomalies.push("market_unstable");
  if (profile.requiresStrategyStable && !balance.strategyStable) anomalies.push("strategy_unstable");
  if (influence.behavioralDelta > profile.maxDelta) anomalies.push("delta_exceeded");
  if (influence.frictionAmplification > profile.maxFrictionAmplification) anomalies.push("friction_exceeded");
  if (behavioralConfidence < 0.3) anomalies.push("low_confidence");

  const behavioralScore = Math.min(
    100,
    Math.round(balance.balanceScore * 0.45 + behavioralConfidence * 35 + (100 - anomalies.length * 10) * 0.15)
  );

  return { behavioralScore, anomalies };
}
