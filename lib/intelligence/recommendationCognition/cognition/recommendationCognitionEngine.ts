/**
 * Phase 7 — Recommendation cognition engine (authoritative cognition layer).
 */

import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { LatentIntentProfile } from "../types";
import { resolveLatentIntent } from "./latentIntentResolver";
import { buildPurchaseMotivationGraph, type PurchaseMotivationGraph } from "./purchaseMotivationGraph";
import { runRecommendationReasoningKernel, type RecommendationReasoningResult } from "./recommendationReasoningKernel";

export type RecommendationCognitionEngineResult = {
  latentIntent: LatentIntentProfile;
  motivationGraph: PurchaseMotivationGraph;
  reasoning: RecommendationReasoningResult;
};

export function runRecommendationCognitionEngine(args: {
  query: string;
  products: QuantProduct[];
  sessionMemory: CommerceSessionMemoryV1;
  memoryResult?: CommerceMemoryResult | null;
  trustResult?: TrustEngineResult | null;
}): RecommendationCognitionEngineResult {
  const latentIntent = resolveLatentIntent(args);
  const motivationGraph = buildPurchaseMotivationGraph(latentIntent);
  const reasoning = runRecommendationReasoningKernel({
    intent: latentIntent,
    motivation: motivationGraph,
    memoryResult: args.memoryResult,
  });
  return { latentIntent, motivationGraph, reasoning };
}
