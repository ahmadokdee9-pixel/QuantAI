/**
 * Phase 7 — Purchase motivation graph (deterministic nodes).
 */

import type { LatentIntentProfile, PurchaseMotivationNode } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export type PurchaseMotivationGraph = {
  nodes: PurchaseMotivationNode[];
  dominantMotivation: string;
};

export function buildPurchaseMotivationGraph(intent: LatentIntentProfile): PurchaseMotivationGraph {
  const entries: [string, number][] = [
    ["upgrade", intent.upgradeIntent01],
    ["luxury", intent.luxuryIntent01],
    ["value_seeking", intent.valueSeekingIntent01],
    ["urgency", intent.urgency01],
    ["trust_first", intent.trustFirst01],
    ["aesthetic", intent.aestheticDriven01],
    ["comparison", intent.comparisonDriven01],
    ["impulse", intent.impulseShopping01],
    ["analytical", intent.analyticalShopping01],
  ];

  const nodes: PurchaseMotivationNode[] = entries
    .filter(([, w]) => w >= 0.3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([motivation, weight01], i) => ({
      id: `mot_${motivation}`,
      motivation,
      weight01: round4(weight01),
    }));

  const dominantMotivation = nodes[0]?.motivation ?? "neutral";
  return { nodes, dominantMotivation };
}
