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
import { buildProductRelationshipBundle } from "./productRelationshipGraph";
import { buildAlternativeWhyLine, classifyDiscoveryProfile } from "./alternativeIntelligence";
import { outboundCompositeNudge } from "@/lib/search/outboundRankNudge";
import { buildQuantAIRealityTrustLayer } from "./realityEngine";
import { buildHumanIntentProfile } from "./humanIntentEngine";
import { inferQueryStyleProfile, productStyleCompositeNudge } from "./styleTasteProfiles";
import { assessRegretRisk } from "./regretRisk";

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
  const humanIntent = buildHumanIntentProfile(searchQuery, intents);
  const styleQuery = inferQueryStyleProfile(searchQuery, intents);

  const scored = productsIn.map((p) => {
    const engine = scoreProductEngine(p, searchQuery, stats, listMaxValueRaw, intents);
    const bundle = buildProductRelationshipBundle(p, productsIn, searchQuery, intents.alternativeQuery, intents, intents.taste);
    const profile = classifyDiscoveryProfile(p, productsIn, intents, bundle);
    const altWhy = buildAlternativeWhyLine(p, productsIn, intents, intents.alternativeQuery, bundle, profile);

    let relDelta = 0;
    if (intents.substituteSemanticActive || intents.alternativeSeeking) {
      relDelta += Math.min(3, Math.round(bundle.universalSimilarity01 * 2.8));
      relDelta -= Math.min(5, Math.round(bundle.substituteRisk01 * 5.5));
      if (profile.tags.includes("hidden_gem")) relDelta += 1;
      if (profile.tags.includes("trusted_substitute")) relDelta += 1;
      if (profile.tags.includes("low_risk_substitute")) relDelta += 1;
      if (profile.tags.includes("premium_look_budget")) relDelta += 1;
      if (profile.tags.includes("underrated")) relDelta += 1;
    }
    const qiCompositeBase = Math.min(
      100,
      Math.max(0, engine.composite + relDelta + outboundCompositeNudge(p))
    );
    const styleNudge = productStyleCompositeNudge(p, styleQuery, engine.category, humanIntent);

    let reason = buildScoreReasoning(p, productsIn, stats, engine.signals, engine.category);
    if (altWhy) reason = `${reason} ${altWhy}`.slice(0, 1400);

    const trend = simulatePriceTrend(p, stats);
    const qiVerdict = getAdaptiveVerdict(p, productsIn, stats, engine.signals, {
      query: searchQuery,
      intents,
      category: engine.category,
    });
    const qiPsychology = getPsychologyInsight(p, productsIn, stats, engine.signals, engine.category, {
      query: searchQuery,
      intents,
      alternativeWhyNarrative: altWhy,
    });
    const preHuman: QuantProduct = {
      ...p,
      qiComposite: qiCompositeBase,
      qiModelLayer: engine.modelLayer,
      qiReason: reason,
      qiSignals: engine.signals,
      qiCategory: engine.category,
      qiTrendProjection: trend.projection,
      qiTrendNote: trend.note,
      qiVerdict,
      qiPsychology,
      qiRelationshipBundle: bundle,
      qiDiscoveryTags: profile.tags,
      qiAlternativeWhy: altWhy,
    };
    const qiRealityTrust = buildQuantAIRealityTrustLayer(preHuman, productsIn, {
      medianPrice: stats.medianPrice,
      searchQuery,
    });
    const regret = assessRegretRisk({
      product: { ...preHuman, qiRealityTrust },
      list: productsIn,
      stats,
      category: engine.category,
      searchQuery,
      reality: qiRealityTrust,
    });
    const qiComposite = Math.min(100, Math.max(0, qiCompositeBase + styleNudge + regret.compositeNudge));

    const enriched: QuantProduct = {
      ...p,
      qiComposite,
      qiModelLayer: engine.modelLayer,
      qiReason: reason,
      qiSignals: engine.signals,
      qiCategory: engine.category,
      qiTrendProjection: trend.projection,
      qiTrendNote: trend.note,
      qiVerdict,
      qiPsychology,
      qiRelationshipBundle: bundle,
      qiDiscoveryTags: profile.tags,
      qiAlternativeWhy: altWhy,
      qiRealityTrust,
      qiHumanIntentProfile: humanIntent,
      qiRegretRiskLevel: regret.level,
    };
    return enriched;
  });

  scored.sort((a, b) => (b.qiComposite ?? 0) - (a.qiComposite ?? 0));
  const curated = applyEliteFirstWindowCuration(scored, 12);
  return curated.map((p, i) => ({
    ...p,
    qiRank: i,
  }));
}
