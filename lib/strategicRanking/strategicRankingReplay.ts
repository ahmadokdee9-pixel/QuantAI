/**
 * P6.3 — Deterministic strategic ranking replay validation.
 */

import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { StrategicRankingSignalBundle } from "@/lib/strategicRanking/strategicRankingConfidence";
import type { QuantProduct } from "@/lib/shoppingScore";

export type StrategicRankingReplayPayload = {
  products: QuantProduct[];
  meta: AdaptiveStrategicRankingMeta;
  signals: StrategicRankingSignalBundle;
};

export function validateDeterministicStrategicRankingReplay(
  runA: StrategicRankingReplayPayload,
  runB: StrategicRankingReplayPayload
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
