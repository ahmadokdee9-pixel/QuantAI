/**
 * Phase 8 — Market awareness engine (shadow cognition — not ranking marketAwareness.ts).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { MarketConditionProfile } from "../types";
import { resolveMarketConditions } from "./marketConditionResolver";
import { buildCommerceEnvironmentGraph, type CommerceEnvironmentGraph } from "./commerceEnvironmentGraph";
import { analyzeTrendPressure, type TrendPressureSnapshot } from "./trendPressureAnalyzer";

export type MarketAwarenessEngineResult = {
  conditions: MarketConditionProfile;
  environment: CommerceEnvironmentGraph;
  trend: TrendPressureSnapshot;
};

export function runMarketAwarenessEngine(args: {
  query: string;
  products: QuantProduct[];
  trustResult?: TrustEngineResult | null;
}): MarketAwarenessEngineResult {
  const conditions = resolveMarketConditions(args);
  const environment = buildCommerceEnvironmentGraph({ market: conditions, products: args.products });
  const trend = analyzeTrendPressure(conditions);
  return { conditions, environment, trend };
}
