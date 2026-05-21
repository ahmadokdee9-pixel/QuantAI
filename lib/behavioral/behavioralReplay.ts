/**
 * P5.9 — Behavioral replay validation.
 */

import type { BehavioralCommerceMeta } from "@/lib/behavioral/behavioralTelemetry";
import type { BehavioralSignalBundle } from "@/lib/behavioral/behavioralSignals";
import type { QuantProduct } from "@/lib/shoppingScore";

export type BehavioralReplayPayload = {
  products: QuantProduct[];
  meta: BehavioralCommerceMeta;
  signals: BehavioralSignalBundle;
};

export function validateDeterministicBehavioralReplay(
  runA: BehavioralReplayPayload,
  runB: BehavioralReplayPayload
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
