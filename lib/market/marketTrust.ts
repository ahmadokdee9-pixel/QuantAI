/**
 * P5.8 — Merchant trust instability detection (deterministic).
 */

import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

export type MarketTrust = {
  marketTrust: number;
  trustInstability: number;
  merchantSpread: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateMarketTrust(args: {
  products: QuantProduct[];
  strategy: StrategyIntelligenceMeta;
}): MarketTrust {
  const { products, strategy } = args;
  const trustScores = products.slice(0, 5).map((p) => getStoreTrustScore(p.store) / 100);
  const avgTrust = trustScores.length ? trustScores.reduce((s, t) => s + t, 0) / trustScores.length : 0.5;
  const merchantSpread =
    trustScores.length >= 2 ? clamp(Math.max(...trustScores) - Math.min(...trustScores), 0, 1) : 0;

  const trustInstability = clamp(merchantSpread * 0.6 + (1 - avgTrust) * 0.25 + (strategy.rollbackTriggered ? 0.15 : 0), 0, 1);
  const marketTrust = clamp(avgTrust * 0.5 + strategy.strategicTrust * 0.3 + (1 - trustInstability) * 0.2, 0, 1);

  return {
    marketTrust: Math.round(marketTrust * 1000) / 1000,
    trustInstability: Math.round(trustInstability * 1000) / 1000,
    merchantSpread: Math.round(merchantSpread * 1000) / 1000,
  };
}
