/**
 * Phase 38 — Global Buy Destination + Commerce Dominance activation.
 * Chains after Phase 37 — intelligence only, no card layout changes.
 */

import { assessBestDealFound } from "@/lib/intelligence/bestDealFoundEngine";
import { buildBestPlaceToBuy } from "@/lib/intelligence/bestPlaceToBuyEngine";
import { buildBuyExplanation, buyExplanationIsSpecific } from "@/lib/intelligence/buyExplanationEngine";
import { buildCommercePriceHistoryIntelligence } from "@/lib/intelligence/commercePriceHistoryEngine";
import { rankCommerceOpportunities } from "@/lib/intelligence/commerceOpportunityRankEngine";
import { buildGlobalCommerceGraph } from "@/lib/intelligence/globalCommerceGraphEngine";
import { buildMarketCoverageIntelligence } from "@/lib/intelligence/marketCoverageEngine";
import { buildMerchantTrustIntelligence } from "@/lib/intelligence/merchantTrustIntelligenceEngine";
import { buildProductUniverse } from "@/lib/intelligence/productUniverseEngine";
import { detectShopperIntentMode } from "@/lib/intelligence/shopperIntentModeEngine";
import { buildWaitPrediction } from "@/lib/intelligence/waitPredictionEngine";
import type { MarketMemoryState } from "@/lib/intelligence/marketMemory";
import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import { enrichDecisionBriefWithCommerceDominance } from "@/lib/ui/commerceDominanceBriefEnrichment";
import {
  assignCommerceDominanceVerdicts,
  commerceDominanceVerdictDistribution,
} from "@/lib/ui/commerceDominanceVerdictEngine";
import {
  buildGlobalCommerceDecisionMap,
  buildGlobalCommerceDisplayCoherenceByLink,
} from "@/lib/ui/phase37GlobalCommerceActivation";
import type { ProductTrayMeta } from "@/lib/ui/productDifferentiationEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { overlayCoherentWithUniversal, type UniversalProductDecision } from "@/lib/ui/universalProductDecision";

function clipLine(text: string, max = 220): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function applyCommerceDominanceIntelligence(
  decision: UniversalProductDecision,
  buyExplanation: ReturnType<typeof buildBuyExplanation>,
  bestPlace: ReturnType<typeof buildBestPlaceToBuy>
): UniversalProductDecision {
  const intelligence = decision.productIntelligence;
  if (!intelligence) return decision;

  const primaryReason = clipLine(buyExplanation.primaryLine);
  const secondaryReason = clipLine(
    [buyExplanation.whyBuy, buyExplanation.whyThisSeller, buyExplanation.whyNotAlternatives].filter(Boolean).join(" ")
  );

  return {
    ...decision,
    decisionThesis: primaryReason,
    reasonLine: primaryReason,
    primaryReason,
    secondaryReason,
    summaryLines: [primaryReason, clipLine(bestPlace.advantage)],
    reasonAuthority: {
      ...decision.reasonAuthority,
      primaryReason: { ...decision.reasonAuthority.primaryReason, line: primaryReason },
      secondaryReasons: [
        {
          code: decision.reasonAuthority.secondaryReasons[0]?.code ?? ("FIT" as const),
          label: "Buy destination",
          line: clipLine(`Best place to buy: ${bestPlace.merchant} at €${bestPlace.price}`),
        },
        {
          code: decision.reasonAuthority.secondaryReasons[1]?.code ?? ("VALUE" as const),
          label: "Purchase explanation",
          line: secondaryReason,
        },
      ],
    },
    productIntelligence: {
      ...intelligence,
      buyExplanation,
      buyerReasoning: {
        primaryLine: buyExplanation.primaryLine,
        buyerFit: buyExplanation.whyBuy,
        valueAnalysis: buyExplanation.whyThisPrice,
        marketPosition: buyExplanation.whyThisPrice,
        trustAnalysis: buyExplanation.whyThisSeller,
        tradeoffs: buyExplanation.whyNotWait,
        competitorComparison: buyExplanation.whyNotAlternatives,
        improvementPath: buyExplanation.whyNow,
      },
      alignmentFlags: [
        ...(intelligence.alignmentFlags ?? []),
        "phase38_commerce_dominance_intelligence",
        `phase38_best_place_${bestPlace.merchant.replace(/\s+/g, "_").toLowerCase().slice(0, 24)}`,
        `phase38_priority_${intelligence.commercePriorityLabel?.replace(/\s+/g, "_").toLowerCase() ?? "compare"}`,
      ].filter((flag, index, list) => list.indexOf(flag) === index),
    },
  };
}

export type Phase38TrayContext = {
  marketCoverage: ReturnType<typeof buildMarketCoverageIntelligence>;
};

export function buildCommerceDominanceDecisionMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>,
  productsByLink: Map<string, { product: QuantProduct; searchQuery: string }>,
  marketMemory: MarketMemoryState | null = null
): { decisions: Map<string, UniversalProductDecision>; trayContext: Phase38TrayContext } {
  const searchQuery = [...productsByLink.values()][0]?.searchQuery?.trim() ?? "";
  const tray = [...productsByLink.values()].map((row) => row.product);
  const intent = detectShopperIntentMode(searchQuery);

  const baseMap = buildGlobalCommerceDecisionMap(coherenceByLink, metaByLink, productsByLink);
  const offerGraph = baseMap.values().next().value?.productIntelligence?.universalOfferGraph;
  const marketCoverage = buildMarketCoverageIntelligence(tray, offerGraph ?? {
    version: 1,
    entities: [],
    totalOffers: tray.length,
    totalEntities: tray.length,
    merchantCoverage: [],
    storeCount: new Set(tray.map((p) => p.store)).size,
    searchDepthScore: 50,
  });

  const merchantTrustByLink = new Map<string, ReturnType<typeof buildMerchantTrustIntelligence>>();
  const bestPlaceByLink = new Map<string, ReturnType<typeof buildBestPlaceToBuy>>();
  const universeByLink = new Map<string, ReturnType<typeof buildProductUniverse>>();
  const priceHistoryByLink = new Map<string, ReturnType<typeof buildCommercePriceHistoryIntelligence>>();
  const waitByLink = new Map<string, ReturnType<typeof buildWaitPrediction>>();
  const bestDealByLink = new Map<string, ReturnType<typeof assessBestDealFound>>();
  const hasSuperiorAltByLink = new Map<string, boolean>();

  const rankRows: Array<{
    link: string;
    globalPrice: NonNullable<UniversalProductDecision["productIntelligence"]>["globalPriceIntelligence"];
    discountV2: NonNullable<UniversalProductDecision["productIntelligence"]>["discountIntelligenceV2"];
    buyOpportunity: NonNullable<UniversalProductDecision["productIntelligence"]>["globalBuyOpportunity"];
    merchantTrust: ReturnType<typeof buildMerchantTrustIntelligence>;
    bestPlace: ReturnType<typeof buildBestPlaceToBuy>;
  }> = [];

  for (const [link, decision] of baseMap) {
    const row = productsByLink.get(link);
    const intel = decision.productIntelligence;
    if (!row?.product || !intel?.globalPriceIntelligence || !intel.globalAlternatives || !intel.globalBuyOpportunity || !intel.discountIntelligenceV2) continue;

    const merchantTrust = buildMerchantTrustIntelligence(row.product);
    const universe = buildProductUniverse(row.product, tray, searchQuery);
    const bestPlace = buildBestPlaceToBuy({
      product: row.product,
      globalPrice: intel.globalPriceIntelligence,
      alternatives: intel.globalAlternatives,
      merchantTrust,
    });
    const priceHistory = buildCommercePriceHistoryIntelligence({
      link,
      currentPrice: row.product.price,
      memory: marketMemory,
      globalPrice: intel.globalPriceIntelligence,
    });
    const waitPrediction = buildWaitPrediction({
      globalPrice: intel.globalPriceIntelligence,
      alternatives: intel.globalAlternatives,
      priceHistory,
      availability: row.product.availability ?? "",
    });
    const isLowest = row.product.price <= universe.lowestPrice;
    const bestDeal = assessBestDealFound({
      globalPrice: intel.globalPriceIntelligence,
      discountV2: intel.discountIntelligenceV2,
      merchantTrust,
      isLowestInUniverse: isLowest,
    });

    merchantTrustByLink.set(link, merchantTrust);
    bestPlaceByLink.set(link, bestPlace);
    universeByLink.set(link, universe);
    priceHistoryByLink.set(link, priceHistory);
    waitByLink.set(link, waitPrediction);
    bestDealByLink.set(link, bestDeal);
    hasSuperiorAltByLink.set(link, Boolean(intel.globalAlternatives.bestSameProductCheaper));

    rankRows.push({
      link,
      globalPrice: intel.globalPriceIntelligence,
      discountV2: intel.discountIntelligenceV2,
      buyOpportunity: intel.globalBuyOpportunity,
      merchantTrust,
      bestPlace,
    });
  }

  const rankedOpportunities = rankCommerceOpportunities(
    rankRows.map((r) => ({
      link: r.link,
      globalPrice: r.globalPrice!,
      discountV2: r.discountV2!,
      buyOpportunity: r.buyOpportunity!,
      merchantTrust: r.merchantTrust,
      bestPlace: r.bestPlace,
    }))
  );
  const rankByLink = new Map(rankedOpportunities.map((r) => [r.link, r]));

  const buyOpportunityByLink = new Map(
    [...baseMap.entries()]
      .filter(([, d]) => d.productIntelligence?.globalBuyOpportunity)
      .map(([link, d]) => [link, d.productIntelligence!.globalBuyOpportunity!])
  );
  const globalPriceByLink = new Map(
    [...baseMap.entries()]
      .filter(([, d]) => d.productIntelligence?.globalPriceIntelligence)
      .map(([link, d]) => [link, d.productIntelligence!.globalPriceIntelligence!])
  );

  const verdictAuthority = assignCommerceDominanceVerdicts({
    decisions: baseMap,
    buyOpportunityByLink,
    globalPriceByLink,
    merchantTrustByLink,
    bestDealByLink,
    waitPredictionByLink: waitByLink,
    intent,
    hasSuperiorAlternativeByLink: hasSuperiorAltByLink,
    productsByLink,
  });

  const result = new Map<string, UniversalProductDecision>();

  for (const [link, decision] of baseMap) {
    const row = productsByLink.get(link);
    const intel = decision.productIntelligence;
    const verdictRow = verdictAuthority.get(link);
    const bestPlace = bestPlaceByLink.get(link);
    const merchantTrust = merchantTrustByLink.get(link);
    const universe = universeByLink.get(link);
    const priceHistory = priceHistoryByLink.get(link);
    const waitPrediction = waitByLink.get(link);
    const bestDeal = bestDealByLink.get(link);
    const ranked = rankByLink.get(link);

    if (!row?.product || !intel || !bestPlace || !merchantTrust || !universe || !priceHistory || !waitPrediction || !bestDeal) {
      result.set(link, decision);
      continue;
    }

    const verdict = verdictRow?.verdict ?? decision.verdict;
    const commercePriorityLabel = verdictRow?.commercePriorityLabel ?? intel.commercePriorityLabel ?? "COMPARE";
    const graph = buildGlobalCommerceGraph({
      product: row.product,
      offerGraph: intel.universalOfferGraph ?? {
        version: 1,
        entities: [],
        totalOffers: tray.length,
        totalEntities: 1,
        merchantCoverage: [],
        storeCount: marketCoverage.merchantsScanned,
        searchDepthScore: marketCoverage.coveragePct,
      },
      universe,
      alternatives: intel.globalAlternatives!,
    });

    let primaryLine = "";
    if (verdict === "WAIT" && waitPrediction.waitValid) {
      primaryLine = clipLine(`Wait — ${waitPrediction.whyWait} ${waitPrediction.predictionLine}`);
    } else if (verdict === "INSUFFICIENT DATA") {
      primaryLine = clipLine("Insufficient verified data for a checkout decision — compare trusted listings with price and seller details.");
    } else if (verdict === "AVOID") {
      primaryLine = clipLine(`Avoid this listing — severely overpriced, low trust, or a superior alternative exists elsewhere.`);
    } else if (verdict === "COMPARE") {
      primaryLine = clipLine(
        `Compare first — best place to buy may be ${bestPlace.merchant} at €${bestPlace.price}. ${bestPlace.advantage}`
      );
    } else {
      const buyExplanation = buildBuyExplanation({
        productTitle: row.product.title,
        link,
        bestPlace,
        globalPrice: intel.globalPriceIntelligence!,
        merchantTrust,
        alternatives: intel.globalAlternatives!,
        waitPrediction,
        bestDeal,
        intent,
        isBestDealFound: bestDeal.isBestDealFound,
      });

      let next: UniversalProductDecision = {
        ...decision,
        verdict,
        confidence: intel.globalBuyOpportunity?.buyOpportunityScore ?? decision.confidence,
        productIntelligence: {
          ...intel,
          commercePriorityLabel,
          bestPlaceToBuy: bestPlace,
          marketCoverage,
          merchantTrustIntelligence: merchantTrust,
          shopperIntentMode: intent,
          productUniverse: universe,
          commercePriceHistory: priceHistory,
          rankedOpportunity: ranked,
          bestDealFound: bestDeal,
          waitPrediction,
          buyExplanation,
          globalCommerceGraph: graph,
        },
      };
      next = applyCommerceDominanceIntelligence(next, buyExplanation, bestPlace);
      result.set(link, next);
      continue;
    }

    result.set(link, {
      ...decision,
      verdict,
      primaryReason: primaryLine,
      reasonLine: primaryLine,
      productIntelligence: {
        ...intel,
        commercePriorityLabel,
        bestPlaceToBuy: bestPlace,
        marketCoverage,
        merchantTrustIntelligence: merchantTrust,
        shopperIntentMode: intent,
        productUniverse: universe,
        commercePriceHistory: priceHistory,
        rankedOpportunity: ranked,
        bestDealFound: bestDeal,
        waitPrediction,
        globalCommerceGraph: graph,
      },
    });
  }

  const leader = [...result.values()].find((d) => d.productIntelligence?.marketCoverage);
  if (leader?.productIntelligence) {
    leader.productIntelligence.marketCoverage = marketCoverage;
  }

  return { decisions: result, trayContext: { marketCoverage } };
}

export function buildCommerceDominanceDisplayCoherenceByLink(
  coherenceByLink: Map<string, CoherentProductDecision>,
  universalByLink: Map<string, UniversalProductDecision>,
  trayContext: Phase38TrayContext
): Map<string, CoherentProductDecision> {
  const base = buildGlobalCommerceDisplayCoherenceByLink(coherenceByLink, universalByLink);
  const enriched = new Map<string, CoherentProductDecision>();

  for (const [link, coherent] of base) {
    const universal = universalByLink.get(link);
    const overlaid = universal ? overlayCoherentWithUniversal(coherent, universal) : coherent;
    enriched.set(link, {
      ...overlaid,
      decisionBrief: enrichDecisionBriefWithCommerceDominance(
        overlaid.decisionBrief,
        trayContext.marketCoverage
      ),
    });
  }

  return enriched;
}

export {
  assignCommerceDominanceVerdicts,
  buildMarketCoverageIntelligence,
  buyExplanationIsSpecific,
  commerceDominanceVerdictDistribution,
  detectShopperIntentMode,
};
