/**
 * Phase 11 — Commerce intelligence prioritization.
 */

import type { IntelligenceLayerId } from "../types";

export type LayerPriorityRank = {
  layer: IntelligenceLayerId;
  rank: number;
  score01: number;
};

const DEFAULT_ORDER: IntelligenceLayerId[] = [
  "trust",
  "identity",
  "recommendation",
  "evolution",
  "commerce_os",
  "memory",
  "activation",
  "taste",
];

export function prioritizeCommerceIntelligence(
  primary: IntelligenceLayerId,
  secondary: IntelligenceLayerId
): LayerPriorityRank[] {
  const order = [primary, secondary, ...DEFAULT_ORDER.filter((l) => l !== primary && l !== secondary)];
  return order.map((layer, i) => ({
    layer,
    rank: i + 1,
    score01: Math.round((1 - i / order.length) * 10000) / 10000,
  }));
}
