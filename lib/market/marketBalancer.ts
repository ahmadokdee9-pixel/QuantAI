/**
 * P5.8 — Market balancer (bounded market weights + routing).
 */

import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { AdaptiveReasoningMeta } from "@/lib/reasoning/reasoningTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";
import type { MarketProfile } from "@/lib/market/marketProfiles";
import type { MarketRoutingLane } from "@/lib/market/marketFlags";
import type { MarketSignalBundle } from "@/lib/market/marketSignals";
import type { MarketVolatility } from "@/lib/market/marketVolatility";
import type { MarketTrust } from "@/lib/market/marketTrust";

export type MarketBalanceResult = {
  routingLane: MarketRoutingLane;
  governanceDampen: number;
  strategyStable: boolean;
  fusionStable: boolean;
  reasoningStable: boolean;
  balanceScore: number;
  marketConfidence: number;
};

export type MarketBlendInfluence = {
  marketDelta: number;
  marketMomentum: number;
  marketPressure: number;
  marketVolatility: number;
  marketTrust: number;
  marketLifecycle: number;
  volatilityAmplification: number;
  momentumAmplification: number;
  trustAmplification: number;
  continuityStrength: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function resolveMarketRoutingLane(args: {
  signals: MarketSignalBundle;
  strategy: StrategyIntelligenceMeta;
  reasoning: AdaptiveReasoningMeta;
  governance: IntentGovernanceMeta;
  volatility: MarketVolatility;
  trust: MarketTrust;
}): MarketRoutingLane {
  const { signals, strategy, reasoning, governance, volatility, trust } = args;

  if (governance.anomalyDetected || reasoning.rollbackTriggered) return "stabilize";
  if (strategy.rollbackTriggered || signals.replayIntegrity < 0.6) return "replay-protect";
  if (volatility.volatilityLane === "high" || signals.marketVolatility >= 0.55) return "volatility-check";
  if (trust.trustInstability >= 0.4 || signals.marketTrust < 0.35) return "trust-check";
  if (signals.conversionMarket < 0.35) return "conversion-check";
  if (signals.marketMomentum < 0.2) return "momentum-check";
  if (strategy.routingLane === "compare") return "compare";
  if (strategy.routingLane === "reinforce") return "reinforce";
  if (strategy.routingLane === "category-priority") return "category-priority";
  if (strategy.routingLane === "strategic-balance") return "strategic-balance";
  if (strategy.routingLane === "commerce-safe") return "commerce-safe";
  return "hold";
}

export function computeMarketConfidence(args: {
  signals: MarketSignalBundle;
  strategy: StrategyIntelligenceMeta;
  reasoning: AdaptiveReasoningMeta;
  governanceDampen: number;
}): number {
  const { signals, strategy, reasoning, governanceDampen } = args;
  const signalConfidence = clamp(
    signals.marketTrust * 0.18 +
      signals.pricingRealism * 0.15 +
      signals.marketMomentum * 0.12 +
      signals.rankingContinuity * 0.12 +
      signals.conversionMarket * 0.1 +
      (1 - signals.marketVolatility) * 0.08,
    0,
    1
  );
  return round3(
    clamp(signalConfidence * 0.35 + strategy.strategyConfidence * 0.35 + reasoning.reasoningConfidence * 0.2, 0, 1) *
      governanceDampen
  );
}

export function computeMarketBalance(args: {
  signals: MarketSignalBundle;
  marketConfidence: number;
  governance: IntentGovernanceMeta;
  fusion: IntentFusionMeta;
  reasoning: AdaptiveReasoningMeta;
  strategy: StrategyIntelligenceMeta;
  volatility: MarketVolatility;
  trust: MarketTrust;
  profile: MarketProfile;
}): MarketBalanceResult {
  const { signals, marketConfidence, governance, fusion, reasoning, strategy, volatility, trust, profile } = args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.9;

  const strategyStable = !strategy.rollbackTriggered && strategy.replayIntegrity >= 50 && strategy.strategyScore >= 40;
  const fusionStable = !fusion.rollbackTriggered && fusion.replayIntegrity >= 50;
  const reasoningStable = !reasoning.rollbackTriggered && reasoning.replayIntegrity >= 50;

  let routingLane = resolveMarketRoutingLane({ signals, strategy, reasoning, governance, volatility, trust });
  if (!profile.allowsMutation) routingLane = "hold";

  const balanceScore = Math.min(
    100,
    Math.round(marketConfidence * 40 + strategy.strategyScore * 0.2 + signals.pricingRealism * 25 + signals.marketTrust * 15)
  );

  return {
    routingLane,
    governanceDampen,
    strategyStable,
    fusionStable,
    reasoningStable,
    balanceScore,
    marketConfidence,
  };
}

export function computeMarketBlendInfluence(args: {
  signals: MarketSignalBundle;
  balance: MarketBalanceResult;
  profile: MarketProfile;
}): MarketBlendInfluence {
  const { signals, balance, profile } = args;
  const damp = balance.governanceDampen;

  const volatilityAmplification = clamp(
    signals.marketVolatility * profile.maxVolatilityAmplification * damp,
    0,
    profile.maxVolatilityAmplification
  );
  const momentumAmplification = clamp(
    signals.marketMomentum * profile.maxMomentumAmplification * damp,
    0,
    profile.maxMomentumAmplification
  );
  const trustAmplification = clamp(signals.marketTrust * profile.maxTrustAmplification * damp, 0, profile.maxTrustAmplification);

  const marketMomentum = momentumAmplification;
  const marketPressure = clamp(signals.marketPressure * profile.maxDelta * damp, 0, profile.maxDelta);
  const marketVolatility = volatilityAmplification;
  const marketTrust = trustAmplification;
  const marketLifecycle = clamp(signals.marketLifecycle * profile.maxDelta * 0.7 * damp, 0, profile.maxDelta);
  const continuityStrength = clamp(signals.rankingContinuity * profile.maxDelta * 0.5, 0, profile.maxDelta);

  const laneScale =
    balance.routingLane === "reinforce" || balance.routingLane === "category-priority"
      ? 1.05
      : balance.routingLane === "strategic-balance" || balance.routingLane === "commerce-safe"
        ? 1
        : balance.routingLane === "volatility-check" ||
            balance.routingLane === "trust-check" ||
            balance.routingLane === "conversion-check" ||
            balance.routingLane === "momentum-check"
          ? 0.75
          : 0.95;

  const marketDelta = clamp(
    (marketMomentum + marketPressure + marketVolatility + marketTrust + marketLifecycle + continuityStrength) * 0.08 * laneScale,
    0,
    profile.maxDelta
  );

  return {
    marketDelta: round3(marketDelta),
    marketMomentum: round3(marketMomentum),
    marketPressure: round3(marketPressure),
    marketVolatility: round3(marketVolatility),
    marketTrust: round3(marketTrust),
    marketLifecycle: round3(marketLifecycle),
    volatilityAmplification: round3(volatilityAmplification),
    momentumAmplification: round3(momentumAmplification),
    trustAmplification: round3(trustAmplification),
    continuityStrength: round3(continuityStrength),
  };
}

export function runMarketEngine(args: {
  signals: MarketSignalBundle;
  balance: MarketBalanceResult;
  influence: MarketBlendInfluence;
  marketConfidence: number;
  profile: MarketProfile;
  governance: IntentGovernanceMeta;
}): { marketScore: number; anomalies: string[] } {
  const { signals, balance, influence, marketConfidence, profile, governance } = args;
  const anomalies: string[] = [];

  if (profile.requiresGovernancePass && governance.anomalyDetected) anomalies.push("governance_gate");
  if (profile.requiresStrategyStable && !balance.strategyStable) anomalies.push("strategy_unstable");
  if (profile.requiresFusionStable && !balance.fusionStable) anomalies.push("fusion_unstable");
  if (influence.marketDelta > profile.maxDelta) anomalies.push("delta_exceeded");
  if (influence.volatilityAmplification > profile.maxVolatilityAmplification) anomalies.push("volatility_exceeded");
  if (influence.trustAmplification > profile.maxTrustAmplification) anomalies.push("trust_exceeded");
  if (marketConfidence < 0.3) anomalies.push("low_confidence");
  if (signals.trustInstability > 0.6) anomalies.push("trust_instability");

  const marketScore = Math.min(
    100,
    Math.round(balance.balanceScore * 0.45 + marketConfidence * 35 + (100 - anomalies.length * 10) * 0.15)
  );

  return { marketScore, anomalies };
}
