/**
 * Phase 8 — Canonical commerce intelligence graph (unified cognition read-only merge).
 */

import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { RecommendationCognitionResult } from "@/lib/intelligence/recommendationCognition/types";
import type { CanonicalProductNode } from "@/lib/intelligence/identity/types";
import type { AutonomousCommerceKernelResult } from "../orchestrator/autonomousCommerceKernel";

export type CanonicalCommerceIntelligenceNode = {
  layer: "trust" | "memory" | "recommendation" | "market" | "economic";
  nodeId: string;
  weight01: number;
};

export type CanonicalCommerceIntelligenceGraph = {
  nodes: CanonicalCommerceIntelligenceNode[];
  commerceIdCount: number;
  trajectoryId: string;
};

const MAX_NODES = 24;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildCanonicalCommerceIntelligenceGraph(args: {
  canonicalProducts: CanonicalProductNode[];
  trustResult?: TrustEngineResult | null;
  memoryResult?: CommerceMemoryResult | null;
  recommendationResult?: RecommendationCognitionResult | null;
  kernel: AutonomousCommerceKernelResult;
}): CanonicalCommerceIntelligenceGraph {
  const nodes: CanonicalCommerceIntelligenceNode[] = [];

  if (args.trustResult?.meta.enabled) {
    nodes.push({
      layer: "trust",
      nodeId: "trust_coverage",
      weight01: round4(args.trustResult.meta.trustCoverage),
    });
  }
  if (args.memoryResult?.meta.enabled) {
    nodes.push({
      layer: "memory",
      nodeId: "taste_confidence",
      weight01: round4(args.memoryResult.meta.tasteProfileConfidence),
    });
  }
  if (args.recommendationResult?.meta.enabled) {
    nodes.push({
      layer: "recommendation",
      nodeId: "cognition_confidence",
      weight01: round4(args.recommendationResult.meta.avgConfidence01),
    });
  }
  nodes.push({
    layer: "market",
    nodeId: `pressure_${args.kernel.market.trend.dominantPressure}`,
    weight01: round4(args.kernel.market.trend.pressureScore),
  });
  nodes.push({
    layer: "economic",
    nodeId: `climate_${args.kernel.climate.climate}`,
    weight01: round4(args.kernel.affordability.affordabilityFit01),
  });

  const trajectoryId =
    args.recommendationResult?.intentEvolution.trajectoryId ??
    `market_${args.kernel.market.trend.dominantPressure}`;

  return {
    nodes: nodes.slice(0, MAX_NODES),
    commerceIdCount: args.canonicalProducts.length,
    trajectoryId,
  };
}
