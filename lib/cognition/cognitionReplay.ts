/**
 * P6.0 — Deterministic cognition replay validation.
 */

import type { CognitionEngineMeta } from "@/lib/cognition/cognitionTelemetry";
import type { UnifiedCognitionGraph } from "@/lib/cognition/cognitionGraph";
import type { UnifiedCommerceState } from "@/lib/cognition/cognitionFusion";
import type { QuantProduct } from "@/lib/shoppingScore";

export type CognitionReplayPayload = {
  products: QuantProduct[];
  meta: CognitionEngineMeta;
  state: UnifiedCommerceState;
  graph: UnifiedCognitionGraph;
};

export function validateDeterministicCognitionReplay(runA: CognitionReplayPayload, runB: CognitionReplayPayload): boolean {
  const linksA = runA.products.map((p) => p.link || p.title).join("|");
  const linksB = runB.products.map((p) => p.link || p.title).join("|");
  if (linksA !== linksB) return false;
  if (runA.graph.executionHash !== runB.graph.executionHash) return false;
  if (runA.meta.routingLane !== runB.meta.routingLane) return false;
  const metaA = { ...runA.meta, latencyMs: 0 };
  const metaB = { ...runB.meta, latencyMs: 0 };
  return JSON.stringify(metaA) === JSON.stringify(metaB);
}
