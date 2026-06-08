/**
 * Phase 41 — Staged Intelligence Engine.
 * Fast first pass + deeper enrichment metadata — non-blocking.
 */

export type StagedIntelligencePass = {
  version: 1;
  fastPassComplete: boolean;
  deepPassComplete: boolean;
  enrichmentLayers: string[];
  cacheHint: string;
};

/** Mark staged intelligence completion for progressive enrichment. */
export function buildStagedIntelligenceMeta(args: {
  hasCategoryIntel: boolean;
  hasIdentityMatch: boolean;
  hasDiscountLabels: boolean;
  hasRankExplanation: boolean;
  hasImageReliability: boolean;
}): StagedIntelligencePass {
  const enrichmentLayers: string[] = ["phase40_ranking_base"];

  if (args.hasCategoryIntel) enrichmentLayers.push("category_intelligence");
  if (args.hasIdentityMatch) enrichmentLayers.push("identity_matching");
  if (args.hasDiscountLabels) enrichmentLayers.push("discount_enrichment");
  if (args.hasRankExplanation) enrichmentLayers.push("rank_explanation");
  if (args.hasImageReliability) enrichmentLayers.push("image_reliability");

  return {
    version: 1,
    fastPassComplete: true,
    deepPassComplete: enrichmentLayers.length >= 5,
    enrichmentLayers,
    cacheHint: "Merchant and product lookups eligible for session cache on repeat scans.",
  };
}
