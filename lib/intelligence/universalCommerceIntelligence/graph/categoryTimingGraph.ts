/**
 * Phase 16 — Category timing graph.
 */

import type { CategoryTimingNode, UniversalVerticalId } from "../types";
import { getCategoryBehaviorProfileAdaptive } from "@/lib/intelligence/categoryBehaviorProfiles";
import type { ProductCategorySlug } from "@/lib/intelligence/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function verticalToSlug(v: UniversalVerticalId): ProductCategorySlug {
  if (v === "furniture_home") return "home";
  if (v === "sports_outdoor") return "sports";
  if (v === "gaming") return "toys";
  if (v === "luxury" || v === "watches_jewelry") return "fashion";
  if (v === "automotive") return "general";
  return v === "general" ? "general" : (v as ProductCategorySlug);
}

export function buildCategoryTimingGraph(args: {
  query: string;
  activeVerticals: UniversalVerticalId[];
}): CategoryTimingNode[] {
  return args.activeVerticals.slice(0, 8).map((verticalId, i) => {
    const profile = getCategoryBehaviorProfileAdaptive(verticalToSlug(verticalId), args.query);
    return {
      nodeId: `ctg_${verticalId}_${i}`,
      verticalId,
      timingScore01: round4(Math.min(1, profile.timingWeight * 0.35)),
    };
  });
}
