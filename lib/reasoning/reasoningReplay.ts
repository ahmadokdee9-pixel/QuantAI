/**
 * P5.5 — Reasoning replay validation.
 */

import type { AdaptiveReasoningMeta } from "@/lib/reasoning/reasoningTelemetry";
import type { CommerceReasoningGraph } from "@/lib/reasoning/reasoningGraph";
import type { ReasoningSignalBundle } from "@/lib/reasoning/reasoningSignals";
import type { QuantProduct } from "@/lib/shoppingScore";

export type ReasoningReplayPayload = {
  products: QuantProduct[];
  meta: AdaptiveReasoningMeta;
  signals: ReasoningSignalBundle;
  graph: CommerceReasoningGraph;
};

export function validateDeterministicReasoningReplay(
  runA: ReasoningReplayPayload,
  runB: ReasoningReplayPayload
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
