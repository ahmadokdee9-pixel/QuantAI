/**
 * P6.9 — Deterministic economic world simulation replay validation.
 */

import type { EconomicWorldSimulationSignalBundle } from "@/lib/economicWorldSimulation/economicWorldSimulationConfidence";
import type { EconomicWorldSimulationMeta } from "@/lib/economicWorldSimulation/economicWorldSimulationTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";

export type EconomicWorldSimulationReplayPayload = {
  products: QuantProduct[];
  meta: EconomicWorldSimulationMeta;
  signals: EconomicWorldSimulationSignalBundle;
};

export function validateDeterministicEconomicWorldSimulationReplay(
  runA: EconomicWorldSimulationReplayPayload,
  runB: EconomicWorldSimulationReplayPayload
): boolean {
  const linksA = runA.products.map((p) => p.link || p.title).join("|");
  const linksB = runB.products.map((p) => p.link || p.title).join("|");
  if (linksA !== linksB) return false;
  if (runA.signals.signalHash !== runB.signals.signalHash) return false;
  if (runA.signals.economicExecutionHash !== runB.signals.economicExecutionHash) return false;
  if (runA.signals.simulationSnapshotHash !== runB.signals.simulationSnapshotHash) return false;
  if (runA.meta.routingLane !== runB.meta.routingLane) return false;
  const metaA = { ...runA.meta, latencyMs: 0 };
  const metaB = { ...runB.meta, latencyMs: 0 };
  return JSON.stringify(metaA) === JSON.stringify(metaB);
}
