/**
 * P5.8 — Market signal bundle (deterministic; no embeddings).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { AdaptiveReasoningMeta } from "@/lib/reasoning/reasoningTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";
import type { MarketLifecycle } from "@/lib/market/marketLifecycle";
import type { MarketMomentum } from "@/lib/market/marketMomentum";
import type { MarketPressure } from "@/lib/market/marketPressure";
import type { MarketPricing } from "@/lib/market/marketPricing";
import type { MarketTrust } from "@/lib/market/marketTrust";
import type { MarketVolatility } from "@/lib/market/marketVolatility";

export type MarketSignalBundle = {
  marketMomentum: number;
  marketPressure: number;
  marketVolatility: number;
  marketTrust: number;
  marketLifecycle: number;
  pricingRealism: number;
  premiumVsValue: number;
  trustInstability: number;
  conversionMarket: number;
  rankingContinuity: number;
  replayIntegrity: number;
  signalHash: string;
  graphExecutionHash: string;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function buildSignalHash(signals: Omit<MarketSignalBundle, "signalHash" | "graphExecutionHash">): string {
  return Object.entries(signals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${Math.round(Number(v) * 1000)}`)
    .join("|");
}

export function buildMarketSignals(args: {
  pricing: MarketPricing;
  momentum: MarketMomentum;
  trust: MarketTrust;
  lifecycle: MarketLifecycle;
  volatility: MarketVolatility;
  pressure: MarketPressure;
  strategy: StrategyIntelligenceMeta;
  governance: IntentGovernanceMeta;
  fusion: IntentFusionMeta;
  reasoning: AdaptiveReasoningMeta;
  canonicalQuery: CanonicalQueryContract;
}): MarketSignalBundle {
  const { pricing, momentum, trust, lifecycle, volatility, pressure, strategy, governance, fusion, reasoning } = args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;

  const core = {
    marketMomentum: momentum.momentumScore,
    marketPressure: pressure.marketPressure,
    marketVolatility: volatility.marketVolatility,
    marketTrust: trust.marketTrust,
    marketLifecycle: lifecycle.marketLifecycle,
    pricingRealism: pricing.pricingRealism,
    premiumVsValue: pricing.premiumVsValue,
    trustInstability: trust.trustInstability,
    conversionMarket: round3(strategy.conversionConfidence * 0.5 + fusion.fusionScore * 0.01 * governanceDampen),
    rankingContinuity: round3(strategy.continuityStrength * 0.5 + strategy.replayIntegrity * 0.01),
    replayIntegrity: round3(strategy.replayIntegrity * 0.01 * reasoning.replayIntegrity * 0.01),
  };

  const graphExecutionHash = [
    `momentum:${core.marketMomentum}`,
    `pressure:${core.marketPressure}`,
    `volatility:${core.marketVolatility}`,
    `trust:${core.marketTrust}`,
    `lifecycle:${core.marketLifecycle}`,
    `pricing:${core.pricingRealism}`,
  ].join(",");

  return {
    ...core,
    signalHash: buildSignalHash(core),
    graphExecutionHash,
  };
}
