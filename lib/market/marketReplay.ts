/**
 * P5.8 — Market replay validation.
 */

import type { MarketIntelligenceMeta } from "@/lib/market/marketTelemetry";
import type { MarketSignalBundle } from "@/lib/market/marketSignals";
import type { QuantProduct } from "@/lib/shoppingScore";

export type MarketReplayPayload = {
  products: QuantProduct[];
  meta: MarketIntelligenceMeta;
  signals: MarketSignalBundle;
};

export function validateDeterministicMarketReplay(runA: MarketReplayPayload, runB: MarketReplayPayload): boolean {
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
