/**
 * P6.5 — Deterministic market reality replay validation.
 */

import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { MarketRealitySignalBundle } from "@/lib/marketReality/marketRealityConfidence";
import type { QuantProduct } from "@/lib/shoppingScore";

export type MarketRealityReplayPayload = {
  products: QuantProduct[];
  meta: MarketRealityIntelligenceMeta;
  signals: MarketRealitySignalBundle;
};

export function validateDeterministicMarketRealityReplay(
  runA: MarketRealityReplayPayload,
  runB: MarketRealityReplayPayload
): boolean {
  const linksA = runA.products.map((p) => p.link || p.title).join("|");
  const linksB = runB.products.map((p) => p.link || p.title).join("|");
  if (linksA !== linksB) return false;
  if (runA.signals.signalHash !== runB.signals.signalHash) return false;
  if (runA.signals.graphExecutionHash !== runB.signals.graphExecutionHash) return false;
  if (runA.meta.routingLane !== runB.meta.routingLane) return false;
  const metaA = { ...runA.meta, latencyMs: 0 };
  const metaB = { ...runB.meta, latencyMs: 0 };
  return JSON.stringify(metaA) === JSON.stringify(metaB);
}
