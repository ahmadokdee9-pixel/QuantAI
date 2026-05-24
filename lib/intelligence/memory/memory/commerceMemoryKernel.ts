/**
 * Phase 6 — Commerce memory kernel (orchestrates intent + interaction graphs).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import { buildInteractionMemoryGraph, type InteractionMemoryGraph } from "./interactionMemoryGraph";
import { updateShoppingIntentMemory, type ShoppingIntentMemory } from "./shoppingIntentMemory";

export type CommerceMemoryKernelResult = {
  interactionGraph: InteractionMemoryGraph;
  intentMemory: ShoppingIntentMemory;
  memoryGrowthEstimate: number;
};

export function runCommerceMemoryKernel(args: {
  query: string;
  products: QuantProduct[];
  sessionMemory: CommerceSessionMemoryV1;
  trustResult?: TrustEngineResult | null;
}): CommerceMemoryKernelResult {
  const interactionGraph = buildInteractionMemoryGraph({
    products: args.products,
    sessionMemory: args.sessionMemory,
    trustResult: args.trustResult,
  });
  const intentMemory = updateShoppingIntentMemory({
    query: args.query,
    sessionMemory: args.sessionMemory,
  });

  const memoryGrowthEstimate =
    interactionGraph.nodeCount * 64 +
    intentMemory.records.length * 48 +
    Object.keys(args.sessionMemory.categoryAffinity).length * 16;

  return { interactionGraph, intentMemory, memoryGrowthEstimate };
}
