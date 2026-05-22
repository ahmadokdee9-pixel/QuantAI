/**
 * P6.2 — Deterministic multi-objective replay validation.
 */

import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { MultiObjectiveSignalBundle } from "@/lib/multiObjective/multiObjectiveConfidence";
import type { QuantProduct } from "@/lib/shoppingScore";

export type MultiObjectiveReplayPayload = {
  products: QuantProduct[];
  meta: MultiObjectiveCommerceMeta;
  signals: MultiObjectiveSignalBundle;
};

export function validateDeterministicMultiObjectiveReplay(
  runA: MultiObjectiveReplayPayload,
  runB: MultiObjectiveReplayPayload
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
