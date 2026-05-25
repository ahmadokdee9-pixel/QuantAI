/**
 * Phase 15 — Volatility-aware decision strategy.
 */

import type { LiveCommerceSignalsResult } from "@/lib/intelligence/liveAdaptiveCommerceSignals/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildVolatilityStrategy(liveSignals?: LiveCommerceSignalsResult | null): {
  band: string;
  strategy01: number;
} {
  const band = liveSignals?.volatility.band ?? "moderate";
  const vol = liveSignals?.volatility.volatility01 ?? 0.3;
  const strategy01 = round4(band === "elevated" ? Math.max(0.2, 1 - vol) : 0.5 + vol * 0.3);
  return { band, strategy01 };
}
