/**
 * P6.1 — Deterministic intent cognition replay validation.
 */

import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { IntentSignalBundle } from "@/lib/intent/intentConfidence";
import type { QuantProduct } from "@/lib/shoppingScore";

export type IntentReplayPayload = {
  products: QuantProduct[];
  meta: IntentCognitionMeta;
  signals: IntentSignalBundle;
};

export function validateDeterministicIntentReplay(runA: IntentReplayPayload, runB: IntentReplayPayload): boolean {
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
