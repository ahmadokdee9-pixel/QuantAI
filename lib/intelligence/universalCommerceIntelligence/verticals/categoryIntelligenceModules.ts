/**
 * Phase 16 — Category intelligence modules (vertical-specific shadow signals).
 */

import type { UniversalVerticalId } from "../types";
import { getCategoryBehaviorProfileAdaptive } from "@/lib/intelligence/categoryBehaviorProfiles";
import type { ProductCategorySlug } from "@/lib/intelligence/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function verticalToSlug(v: UniversalVerticalId): ProductCategorySlug {
  const map: Partial<Record<UniversalVerticalId, ProductCategorySlug>> = {
    fashion: "fashion",
    beauty: "beauty",
    furniture_home: "home",
    sports_outdoor: "sports",
    gaming: "toys",
    electronics: "electronics",
    luxury: "fashion",
    automotive: "general",
    watches_jewelry: "general",
    general: "general",
  };
  return map[v] ?? "general";
}

export function buildVerticalIntelligence(args: {
  query: string;
  verticalScores: Map<UniversalVerticalId, number>;
}): Record<UniversalVerticalId, { score01: number; active: boolean }> {
  const all: UniversalVerticalId[] = [
    "fashion",
    "luxury",
    "beauty",
    "furniture_home",
    "automotive",
    "sports_outdoor",
    "watches_jewelry",
    "gaming",
    "electronics",
    "general",
  ];

  const out = {} as Record<UniversalVerticalId, { score01: number; active: boolean }>;
  for (const vid of all) {
    const raw = args.verticalScores.get(vid) ?? 0;
    const profile = getCategoryBehaviorProfileAdaptive(verticalToSlug(vid), args.query);
    const score01 = round4(Math.min(1, raw * 0.6 + profile.timingWeight * 0.15 + profile.trustWeight * 0.1));
    out[vid] = { score01, active: score01 > 0.22 };
  }
  return out;
}

export function scoreVerticalModule(vid: UniversalVerticalId, query: string): number {
  const profile = getCategoryBehaviorProfileAdaptive(verticalToSlug(vid), query);
  const base: Record<UniversalVerticalId, number> = {
    fashion: 0.55 + profile.emotionalTolerance01 * 0.2,
    luxury: 0.6 + profile.premiumPriceRatio * 0.1,
    beauty: 0.5 + profile.fakeDiscountWeight * 0.08,
    furniture_home: 0.45 + profile.logisticsWeight * 0.15,
    automotive: 0.4 + profile.trustWeight * 0.12,
    sports_outdoor: 0.48,
    watches_jewelry: 0.52 + profile.premiumEvidenceMultiplier * 0.05,
    gaming: 0.5 + profile.timingWeight * 0.1,
    electronics: 0.55 + profile.volatilityWeight * 0.1,
    general: 0.35,
  };
  void query;
  return round4(Math.min(1, base[vid] ?? 0.35));
}
