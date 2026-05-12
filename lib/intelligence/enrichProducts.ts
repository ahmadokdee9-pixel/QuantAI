import type { QuantProduct } from "@/lib/shoppingScore";
import { getAdaptiveVerdict, getPsychologyInsight } from "./narrativeEngine";
import { simulatePriceTrend } from "./priceTrendSim";
import { buildScoreReasoning } from "./reasoning";
import {
  computeListMaxValueRaw,
  computeListStats,
  scoreProductEngine,
} from "./scoringEngine";
import { parseCommerceSearchIntents } from "./searchIntentV2";

export function enrichProductsWithIntelligence(
  products: QuantProduct[],
  searchQuery: string
): QuantProduct[] {
  if (products.length === 0) return [];
  const stats = computeListStats(products);
  const listMaxValueRaw = computeListMaxValueRaw(products);
  const intents = parseCommerceSearchIntents(searchQuery);

  const scored = products.map((p) => {
    const engine = scoreProductEngine(p, searchQuery, stats, listMaxValueRaw, intents);
    const reason = buildScoreReasoning(p, products, stats, engine.signals, engine.category);
    const trend = simulatePriceTrend(p, stats);
    const qiVerdict = getAdaptiveVerdict(p, products, stats, engine.signals);
    const qiPsychology = getPsychologyInsight(p, products, stats, engine.signals, engine.category);
    return {
      ...p,
      qiComposite: engine.composite,
      qiModelLayer: engine.modelLayer,
      qiReason: reason,
      qiSignals: engine.signals,
      qiCategory: engine.category,
      qiTrendProjection: trend.projection,
      qiTrendNote: trend.note,
      qiVerdict,
      qiPsychology,
    };
  });

  scored.sort((a, b) => (b.qiComposite ?? 0) - (a.qiComposite ?? 0));
  return scored.map((p, i) => ({
    ...p,
    qiRank: i,
  }));
}
