/**
 * Phase 7 — Autonomous recommendation graph (bundle + ecosystem + related cognition).
 */

import type { CanonicalProductNode } from "@/lib/intelligence/identity/types";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { LatentIntentProfile } from "../types";
import { buildRelatedCommerceGraph } from "./relatedCommerceGraph";
import { reasonCategoryExpansion, type CategoryExpansionHint } from "./categoryExpansionReasoner";
import { buildRecommendationTrajectory } from "./recommendationTrajectoryEngine";
import type { RecommendationReasoningResult } from "../cognition/recommendationReasoningKernel";

export type AutonomousRecommendationGraph = {
  related: ReturnType<typeof buildRelatedCommerceGraph>;
  expansions: CategoryExpansionHint[];
  trajectory: ReturnType<typeof buildRecommendationTrajectory>;
  bundleHints: string[];
  ecosystemHints: string[];
  nodeCount: number;
};

const MAX_BUNDLE_HINTS = 6;

export function buildAutonomousRecommendationGraph(args: {
  query: string;
  products: QuantProduct[];
  canonicalProducts: CanonicalProductNode[];
  intent: LatentIntentProfile;
  reasoning: RecommendationReasoningResult;
  sessionMemory: import("@/lib/intelligence/commerceSessionMemory").CommerceSessionMemoryV1;
  categoryAffinity: Record<string, number>;
}): AutonomousRecommendationGraph {
  const categoryByCommerceId: Record<string, string> = {};
  for (const p of args.products) {
    const cid = p.qiNormalizedCommerce?.commerceId;
    if (cid) categoryByCommerceId[cid] = p.qiCategory ?? "general";
  }
  const related = buildRelatedCommerceGraph(args.canonicalProducts, categoryByCommerceId);
  const expansions = reasonCategoryExpansion({
    intent: args.intent,
    graph: related,
    categoryAffinity: args.categoryAffinity,
  });
  const trajectory = buildRecommendationTrajectory({
    query: args.query,
    sessionMemory: args.sessionMemory,
    intent: args.intent,
    reasoning: args.reasoning,
  });

  const bundleHints: string[] = [];
  const stores = new Set(args.products.map((p) => p.store.trim().toLowerCase()));
  if (stores.size >= 2 && args.intent.comparisonDriven01 >= 0.4) {
    bundleHints.push("multi_merchant_compare_bundle");
  }
  if (args.intent.upgradeIntent01 >= 0.45) bundleHints.push("accessory_upgrade_bundle");
  if (args.intent.luxuryIntent01 >= 0.5) bundleHints.push("premium_ecosystem_bundle");

  const ecosystemHints: string[] = [];
  const brands = new Set<string>();
  for (const p of args.products.slice(0, 8)) {
    const m = p.title.match(/\b(apple|samsung|sony|bose|dyson)\b/i);
    if (m) brands.add(m[0].toLowerCase());
  }
  for (const b of brands) {
    ecosystemHints.push(`ecosystem_${b}`);
    if (ecosystemHints.length >= MAX_BUNDLE_HINTS) break;
  }

  return {
    related,
    expansions,
    trajectory,
    bundleHints: bundleHints.slice(0, MAX_BUNDLE_HINTS),
    ecosystemHints: ecosystemHints.slice(0, MAX_BUNDLE_HINTS),
    nodeCount: related.nodeCount + expansions.length + trajectory.steps.length,
  };
}
