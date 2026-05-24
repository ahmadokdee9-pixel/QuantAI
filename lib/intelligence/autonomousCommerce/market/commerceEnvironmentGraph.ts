/**
 * Phase 8 — Commerce environment graph (market nodes, bounded).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { MarketConditionProfile } from "../types";

export type CommerceEnvironmentNode = {
  id: string;
  signal: string;
  weight01: number;
};

export type CommerceEnvironmentGraph = {
  nodes: CommerceEnvironmentNode[];
  edgeCount: number;
};

const MAX_NODES = 16;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildCommerceEnvironmentGraph(args: {
  market: MarketConditionProfile;
  products: QuantProduct[];
}): CommerceEnvironmentGraph {
  const nodes: CommerceEnvironmentNode[] = [];
  const entries: [string, number][] = [
    ["seasonal_demand", args.market.seasonalDemand01],
    ["pricing_pressure", args.market.pricingPressure01],
    ["inventory_scarcity", args.market.inventoryScarcity01],
    ["merchant_volatility", args.market.merchantVolatility01],
    ["discount_anomaly", args.market.discountAnomaly01],
    ["category_momentum", args.market.categoryMomentum01],
    ["launch_cycle", args.market.launchCycle01],
    ["saturation", args.market.marketSaturation01],
  ];

  for (const [signal, weight01] of entries) {
    if (weight01 < 0.28) continue;
    nodes.push({ id: `env_${signal}`, signal, weight01: round4(weight01) });
  }

  const stores = new Set(args.products.map((p) => p.store));
  return {
    nodes: nodes.slice(0, MAX_NODES),
    edgeCount: Math.min(stores.size * 2, 24),
  };
}
