/**
 * Phase 7 — Recommendation reasoning kernel (bounded deterministic reasoning chain).
 */

import type { LatentIntentProfile } from "../types";
import type { PurchaseMotivationGraph } from "./purchaseMotivationGraph";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";

export type RecommendationReasoningResult = {
  reasoningChain: string[];
  confidence01: number;
  explorationVsCommitment: "exploration" | "commitment" | "balanced";
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function runRecommendationReasoningKernel(args: {
  intent: LatentIntentProfile;
  motivation: PurchaseMotivationGraph;
  memoryResult?: CommerceMemoryResult | null;
}): RecommendationReasoningResult {
  const chain: string[] = [];
  chain.push(`dominant_motivation_${args.motivation.dominantMotivation}`);

  if (args.intent.comparisonDriven01 >= 0.45) chain.push("comparison_heavy_tray");
  if (args.intent.trustFirst01 >= 0.55) chain.push("trust_weighted_reasoning");
  if (args.intent.luxuryIntent01 >= 0.5) chain.push("luxury_price_tolerance");
  if (args.intent.valueSeekingIntent01 >= 0.5) chain.push("value_optimization_path");

  const memConf = args.memoryResult?.preferenceSignals.confidence01 ?? 0.4;
  const exploration01 = args.intent.comparisonDriven01 * 0.4 + (1 - memConf) * 0.3;
  const commitment01 = args.intent.analyticalShopping01 * 0.35 + memConf * 0.35;

  const explorationVsCommitment: RecommendationReasoningResult["explorationVsCommitment"] =
    exploration01 > commitment01 + 0.15
      ? "exploration"
      : commitment01 > exploration01 + 0.15
        ? "commitment"
        : "balanced";

  chain.push(`mode_${explorationVsCommitment}`);

  const confidence01 = round4(
    clamp01(
      memConf * 0.35 +
        args.motivation.nodes[0]?.weight01 * 0.35 +
        (1 - Math.abs(exploration01 - commitment01)) * 0.3
    )
  );

  return { reasoningChain: chain.slice(0, 8), confidence01, explorationVsCommitment };
}
