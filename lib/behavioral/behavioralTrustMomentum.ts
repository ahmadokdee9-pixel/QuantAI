/**
 * P5.9 — Trust momentum behavior (deterministic).
 */

import type { MarketIntelligenceMeta } from "@/lib/market/marketTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";

export type TrustMomentumBehavior = {
  trustMomentum: number;
  momentumLane: "rising" | "stable" | "declining";
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateTrustMomentumBehavior(args: {
  market: MarketIntelligenceMeta;
  strategy: StrategyIntelligenceMeta;
}): TrustMomentumBehavior {
  const { market, strategy } = args;

  const trustMomentum = clamp(
    market.marketTrust * 0.35 +
      strategy.strategicTrust * 0.3 +
      strategy.momentumConfidence * 0.2 +
      market.analytics.trustAnalytics * 0.01 * 0.15,
    0,
    1
  );

  let momentumLane: TrustMomentumBehavior["momentumLane"] = "stable";
  if (trustMomentum >= 0.55) momentumLane = "rising";
  else if (trustMomentum < 0.3) momentumLane = "declining";

  return {
    trustMomentum: Math.round(trustMomentum * 1000) / 1000,
    momentumLane,
  };
}
