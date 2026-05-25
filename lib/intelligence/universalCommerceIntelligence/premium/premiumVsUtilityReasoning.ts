/**
 * Phase 16 — Premium vs utility reasoning (universal).
 */

import type { AutonomousCommerceStrategyResult } from "@/lib/intelligence/autonomousCommerceStrategy/types";
import type { UniversalVerticalId } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function reasonUniversalPremiumUtility(args: {
  dominantVertical: UniversalVerticalId;
  commerceStrategy?: AutonomousCommerceStrategyResult | null;
}): { bias: "premium" | "utility" | "balanced"; score01: number } {
  const premiumBias = args.commerceStrategy?.premiumValue.premiumBias01 ?? 0.35;
  let bias: "premium" | "utility" | "balanced" = "balanced";
  if (premiumBias > 0.55 || args.dominantVertical === "luxury" || args.dominantVertical === "watches_jewelry") {
    bias = "premium";
  } else if (premiumBias < 0.28) {
    bias = "utility";
  }
  return { bias, score01: round4(premiumBias) };
}
