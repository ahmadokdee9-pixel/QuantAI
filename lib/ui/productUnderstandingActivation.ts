/**
 * Phase 28 — Product Understanding Activation.
 * Bridges listing metadata + enrichment into universal product intelligence.
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import type { QuantProduct } from "@/lib/shoppingScore";
import {
  resolveUniversalProductIntelligence,
  type UniversalProductIntelligenceResult,
} from "@/lib/ui/universalProductIntelligenceEngine";

export type ProductUnderstandingActivationInput = {
  product: QuantProduct;
  searchQuery: string;
  coherent: CoherentProductDecision;
  alternativePressure: number;
  trayMedianPrice?: number;
};

/** Activate product understanding before pricing dominates card reasoning. */
export function activateProductUnderstanding(
  input: ProductUnderstandingActivationInput
): UniversalProductIntelligenceResult {
  return resolveUniversalProductIntelligence({
    product: input.product,
    searchQuery: input.searchQuery,
    coherent: input.coherent,
    alternativePressure: input.alternativePressure,
    trayMedianPrice: input.trayMedianPrice,
  });
}
