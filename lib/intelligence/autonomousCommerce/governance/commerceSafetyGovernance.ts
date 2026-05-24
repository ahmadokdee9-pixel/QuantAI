/**
 * Phase 8 — Commerce safety governance (hard-blocks for shadow strategy).
 */

import type { StrategicRecommendationLayer } from "../types";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";

export type CommerceSafetyResult = {
  allowedLayers: StrategicRecommendationLayer[];
  blockedCount: number;
  blockReasons: string[];
};

const MIN_TRUST_FLOOR = 0.2;
const MAX_STORE_DOMINANCE = 0.65;

export function applyCommerceSafetyGovernance(args: {
  layers: StrategicRecommendationLayer[];
  trustResult?: TrustEngineResult | null;
  merchantVolatility01: number;
  discountAnomaly01: number;
}): CommerceSafetyResult {
  const blockReasons: string[] = [];
  const allowed: StrategicRecommendationLayer[] = [];

  const avgTrust = args.trustResult
    ? Object.values(args.trustResult.rankingPrepByLink).reduce((s, p) => s + p.trustScore, 0) /
      Math.max(1, Object.keys(args.trustResult.rankingPrepByLink).length) /
      100
    : 0.5;

  if (avgTrust < MIN_TRUST_FLOOR) {
    blockReasons.push("trust_suppression_blocked");
  }

  if (args.merchantVolatility01 < 0.15 && args.layers.length > 4) {
    blockReasons.push("merchant_favoritism_risk");
  }

  if (args.discountAnomaly01 >= 0.7) {
    blockReasons.push("economic_exploitation_pattern");
  }

  for (const layer of args.layers) {
    if (blockReasons.includes("trust_suppression_blocked") && layer.layerId.includes("scarcity")) {
      continue;
    }
    if (blockReasons.includes("economic_exploitation_pattern") && layer.layerId === "value_retention") {
      continue;
    }
    allowed.push(layer);
  }

  if (allowed.length > 6) {
    blockReasons.push("unstable_recursion_cap");
  }

  return {
    allowedLayers: allowed.slice(0, 6),
    blockedCount: args.layers.length - allowed.slice(0, 6).length,
    blockReasons: [...new Set(blockReasons)].slice(0, 8),
  };
}
