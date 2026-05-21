/**
 * P5.6 — Decision replay validation.
 */

import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { CommerceDecisionGraph } from "@/lib/decision/decisionGraph";
import type { DecisionSignalBundle } from "@/lib/decision/decisionSignals";
import type { QuantProduct } from "@/lib/shoppingScore";

export type DecisionReplayPayload = {
  products: QuantProduct[];
  meta: DecisionIntelligenceMeta;
  signals: DecisionSignalBundle;
  graph: CommerceDecisionGraph;
};

export function validateDeterministicDecisionReplay(
  runA: DecisionReplayPayload,
  runB: DecisionReplayPayload
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
