import type { QuantProduct } from "@/lib/shoppingScore";
import type { IntelligenceSignals, ListStats, ProductCategorySlug } from "./types";
import { buildProductReasoningNarrative } from "./narrativeEngine";

/**
 * Two-sentence, peer-aware reasoning for the QI layer (unique per listing + basket).
 */
export function buildScoreReasoning(
  p: QuantProduct,
  peers: QuantProduct[],
  stats: ListStats,
  signals: IntelligenceSignals,
  category: ProductCategorySlug
): string {
  return buildProductReasoningNarrative(p, peers, stats, signals, category);
}
