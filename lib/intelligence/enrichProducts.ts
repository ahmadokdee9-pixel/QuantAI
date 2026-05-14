import { filterTrayNoise } from "@/lib/commerce/trayListingFilter";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getAdaptiveVerdict, getPsychologyInsight } from "./narrativeEngine";
import { simulatePriceTrend } from "./priceTrendSim";
import { buildScoreReasoning } from "./reasoning";
import {
  computeListMaxValueRaw,
  computeListStats,
  scoreProductEngine,
} from "./scoringEngine";
import { applyEliteFirstWindowCuration } from "./trayCuration";
import { parseCommerceSearchIntents } from "./searchIntentV2";

export function enrichProductsWithIntelligence(
  products: QuantProduct[],
  searchQuery: string
): QuantProduct[] {
  if (products.length === 0) return [];
  const productsIn = filterTrayNoise(products, searchQuery);
  if (productsIn.length === 0) return [];
  const stats = computeListStats(productsIn);
  const listMaxValueRaw = computeListMaxValueRaw(productsIn);
  const intents = parseCommerceSearchIntents(searchQuery);

  const scored = productsIn.map((p) => {
    const engine = scoreProductEngine(p, searchQuery, stats, listMaxValueRaw, intents);
    const reason = buildScoreReasoning(p, productsIn, stats, engine.signals, engine.category);
    const trend = simulatePriceTrend(p, stats);
    const qiVerdict = getAdaptiveVerdict(p, productsIn, stats, engine.signals, {
      query: searchQuery,
      intents,
      category: engine.category,
    });
    const qiPsychology = getPsychologyInsight(p, productsIn, stats, engine.signals, engine.category, {
      query: searchQuery,
      intents,
    });
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
  const curated = applyEliteFirstWindowCuration(scored, 12);
  return curated.map((p, i) => ({
    ...p,
    qiRank: i,
  }));
}
