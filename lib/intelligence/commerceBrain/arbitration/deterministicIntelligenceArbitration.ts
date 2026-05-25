/**
 * Phase 11 — Deterministic intelligence arbitration.
 */

import type { FusedIntelligenceSignal, BrainArbitrationVerdict, IntelligenceLayerId } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

const LAYER_PRIORITY: IntelligenceLayerId[] = [
  "trust",
  "identity",
  "recommendation",
  "memory",
  "commerce_os",
  "evolution",
  "activation",
  "taste",
];

export function arbitrateIntelligence(signals: FusedIntelligenceSignal[]): BrainArbitrationVerdict {
  const byLayer = new Map<IntelligenceLayerId, number>();
  for (const s of signals) {
    byLayer.set(s.layer, (byLayer.get(s.layer) ?? 0) + s.weight01 * s.confidence01);
  }

  const ranked = [...byLayer.entries()].sort((a, b) => b[1] - a[1]);
  const primaryLayer = ranked[0]?.[0] ?? "trust";
  const secondaryLayer = ranked[1]?.[0] ?? "recommendation";
  const arbitrationScore01 = round4(Math.min(1, ranked[0]?.[1] ?? 0.4));

  void LAYER_PRIORITY;

  return {
    primaryLayer,
    secondaryLayer,
    arbitrationScore01,
    rankingMutation: false,
  };
}
