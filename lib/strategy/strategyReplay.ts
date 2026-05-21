/**
 * P5.7 — Strategy replay validation.
 */

import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";
import type { StrategicCommerceGraph } from "@/lib/strategy/strategyGraph";
import type { StrategySignalBundle } from "@/lib/strategy/strategySignals";
import type { QuantProduct } from "@/lib/shoppingScore";

export type StrategyReplayPayload = {
  products: QuantProduct[];
  meta: StrategyIntelligenceMeta;
  signals: StrategySignalBundle;
  graph: StrategicCommerceGraph;
};

export function validateDeterministicStrategyReplay(
  runA: StrategyReplayPayload,
  runB: StrategyReplayPayload
): boolean {
  const linksA = runA.products.map((p) => p.link || p.title).join("|");
  const linksB = runB.products.map((p) => p.link || p.title).join("|");
  if (linksA !== linksB) return false;
  if (runA.signals.signalHash !== runB.signals.signalHash) return false;
  if (runA.graph.executionHash !== runB.graph.executionHash) return false;
  if (runA.meta.routingLane !== runB.meta.routingLane) return false;
  const metaA = { ...runA.meta, latencyMs: 0 };
  const metaB = { ...runB.meta, latencyMs: 0 };
  return JSON.stringify(metaA) === JSON.stringify(metaB);
}
