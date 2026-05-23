/**
 * P6.8 — Deterministic cognitive governance replay validation.
 */

import type { CognitiveGovernanceSignalBundle } from "@/lib/cognitiveGovernance/cognitiveGovernanceConfidence";
import type { UnifiedCognitiveGovernanceMeta } from "@/lib/cognitiveGovernance/cognitiveGovernanceTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";

export type CognitiveGovernanceReplayPayload = {
  products: QuantProduct[];
  meta: UnifiedCognitiveGovernanceMeta;
  signals: CognitiveGovernanceSignalBundle;
};

export function validateDeterministicCognitiveGovernanceReplay(
  runA: CognitiveGovernanceReplayPayload,
  runB: CognitiveGovernanceReplayPayload
): boolean {
  const linksA = runA.products.map((p) => p.link || p.title).join("|");
  const linksB = runB.products.map((p) => p.link || p.title).join("|");
  if (linksA !== linksB) return false;
  if (runA.signals.signalHash !== runB.signals.signalHash) return false;
  if (runA.signals.governanceExecutionHash !== runB.signals.governanceExecutionHash) return false;
  if (runA.signals.governanceSnapshotHash !== runB.signals.governanceSnapshotHash) return false;
  if (runA.meta.routingLane !== runB.meta.routingLane) return false;
  const metaA = { ...runA.meta, latencyMs: 0 };
  const metaB = { ...runB.meta, latencyMs: 0 };
  return JSON.stringify(metaA) === JSON.stringify(metaB);
}
