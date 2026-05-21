/**
 * P5.4 — Fusion replay validation (deterministic reconstruction).
 */

import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { FusedCommerceSignals } from "@/lib/intent/intentSignalFusion";
import type { QuantProduct } from "@/lib/shoppingScore";

export type FusionReplayPayload = {
  products: QuantProduct[];
  meta: IntentFusionMeta;
  signals: FusedCommerceSignals;
};

export function computeFusionReplayHash(result: FusionReplayPayload): string {
  const links = result.products.map((p) => p.link || p.title).slice(0, 5).join("|");
  return `${result.meta.fusionDelta}:${result.signals.signalHash}:${links}`;
}

export function validateDeterministicFusionReplay(runA: FusionReplayPayload, runB: FusionReplayPayload): boolean {
  const linksA = runA.products.map((p) => p.link || p.title).join("|");
  const linksB = runB.products.map((p) => p.link || p.title).join("|");
  if (linksA !== linksB) return false;
  if (runA.signals.signalHash !== runB.signals.signalHash) return false;
  if (runA.meta.routingLane !== runB.meta.routingLane) return false;
  const metaA = { ...runA.meta, latencyMs: 0 };
  const metaB = { ...runB.meta, latencyMs: 0 };
  return JSON.stringify(metaA) === JSON.stringify(metaB);
}

export function validateFusionSignalReplay(runA: FusionReplayPayload, runB: FusionReplayPayload): boolean {
  return runA.signals.signalHash === runB.signals.signalHash;
}
