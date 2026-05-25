/**
 * Phase 16 — Universal trust normalization.
 */

import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
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

export function normalizeUniversalTrust(args: {
  trust?: TrustEngineResult | null;
  dominantVertical: UniversalVerticalId;
  query: string;
}): number {
  const alerts = args.trust?.meta.fakeDiscountAlertCount ?? 0;
  const profile = getCategoryBehaviorProfileAdaptive(verticalToSlug(args.dominantVertical), args.query);
  const base = args.trust?.meta.enabled ? 1 - alerts / 8 : 0.75;
  return round4(Math.min(1, base * (0.85 + profile.trustWeight * 0.1)));
}
