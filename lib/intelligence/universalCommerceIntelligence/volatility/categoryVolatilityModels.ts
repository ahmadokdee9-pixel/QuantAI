/**
 * Phase 16 — Category-specific volatility models.
 */

import type { AutonomousCommerceStrategyResult } from "@/lib/intelligence/autonomousCommerceStrategy/types";
import { getCategoryBehaviorProfileAdaptive } from "@/lib/intelligence/categoryBehaviorProfiles";
import type { ProductCategorySlug } from "@/lib/intelligence/types";
import type { UniversalVerticalId } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function verticalToSlug(v: UniversalVerticalId): ProductCategorySlug {
  if (v === "furniture_home") return "home";
  if (v === "sports_outdoor") return "sports";
  if (v === "gaming") return "toys";
  if (v === "luxury" || v === "watches_jewelry") return "fashion";
  return v === "general" ? "general" : (v as ProductCategorySlug);
}

export function modelCategoryVolatility(args: {
  dominantVertical: UniversalVerticalId;
  query: string;
  commerceStrategy?: AutonomousCommerceStrategyResult | null;
}): { volatility01: number; band: string } {
  const profile = getCategoryBehaviorProfileAdaptive(verticalToSlug(args.dominantVertical), args.query);
  const live = args.commerceStrategy?.volatility.strategy01 ?? 0.3;
  const volatility01 = round4(Math.min(1, live * profile.volatilityWeight * 0.85));
  const band = volatility01 > 0.55 ? "elevated" : volatility01 < 0.28 ? "low" : "moderate";
  return { volatility01, band };
}
