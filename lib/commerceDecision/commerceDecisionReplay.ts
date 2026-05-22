/**
 * P6.6 — Deterministic commerce decision replay validation.
 */

import type { CommerceDecisionIntelligenceMeta } from "@/lib/commerceDecision/commerceDecisionTelemetry";
import type { CommerceDecisionSignalBundle } from "@/lib/commerceDecision/commerceDecisionConfidence";
import type { QuantProduct } from "@/lib/shoppingScore";

export type CommerceDecisionReplayPayload = {
  products: QuantProduct[];
  meta: CommerceDecisionIntelligenceMeta;
  signals: CommerceDecisionSignalBundle;
};

export function validateDeterministicCommerceDecisionReplay(
  runA: CommerceDecisionReplayPayload,
  runB: CommerceDecisionReplayPayload
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
