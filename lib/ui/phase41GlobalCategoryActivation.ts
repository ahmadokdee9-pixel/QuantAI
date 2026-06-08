/**
 * Phase 41 — Global Category Intelligence + Billion-Dollar Buy activation.
 * Chains after Phase 40 — intelligence only, no card layout changes.
 */

import { applyBuyFirstV2 } from "@/lib/intelligence/buyFirstEngineV2";
import { buildBillionDollarDiscountIntelligence } from "@/lib/intelligence/billionDollarDiscountEngine";
import { computeCategoryBalancedScore } from "@/lib/intelligence/categoryBalancedRankingEngine";
import { buildGlobalCategoryIntelligence } from "@/lib/intelligence/globalCategoryIntelligenceEngine";
import { computeEvidenceConfidence } from "@/lib/intelligence/evidenceConfidenceEngine";
import { assessDataQuality } from "@/lib/intelligence/insufficientDataHandlingEngine";
import { enrichProductImageReliability } from "@/lib/intelligence/imageReliabilityEngine";
import { buildMarketBreadthIntelligence } from "@/lib/intelligence/marketBreadthEngine";
import { buildMarketSummaryV2 } from "@/lib/intelligence/marketSummaryV2Engine";
import { buildMerchantTrustV2, merchantTrustBlocksBuyReady } from "@/lib/intelligence/merchantTrustEngineV2";
import { classifyProductIdentityV2 } from "@/lib/intelligence/productIdentityMatchingV2Engine";
import { buildRankExplanation } from "@/lib/intelligence/rankExplanationEngine";
import { buildStagedIntelligenceMeta } from "@/lib/intelligence/stagedIntelligenceEngine";
import { buildUniversalQueryIntelligence } from "@/lib/intelligence/universalQueryIntelligenceEngine";
import { resolveVerdictConsistencyV2 } from "@/lib/intelligence/verdictConsistencyV2Engine";
import type { MarketMemoryState } from "@/lib/intelligence/marketMemory";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import type { ExposureChip } from "@/lib/ui/intelligenceExposureActivation";
import { enrichDecisionBriefWithGlobalCategory } from "@/lib/ui/globalCategoryBriefEnrichment";
import {
  buildCommerceRankingDecisionMap as buildPhase40CommerceRankingDecisionMap,
  buildCommerceRankingDisplayCoherenceByLink as buildPhase40CommerceRankingDisplayCoherenceByLink,
  orderProductsBySearchRank,
  type Phase40TrayContext,
} from "@/lib/ui/phase40CommerceRankingActivation";
import type { ProductTrayMeta } from "@/lib/ui/productDifferentiationEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { overlayCoherentWithUniversal, type UniversalProductDecision } from "@/lib/ui/universalProductDecision";

function clipLine(text: string, max = 220): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function buildCategoryChips(args: {
  existing: ExposureChip[];
  discountLabels: string[];
  categoryLabel: string;
  rankHeadline: string;
}): ExposureChip[] {
  const chips: ExposureChip[] = [{ label: args.rankHeadline, tone: "emerald", evidence: "positive" }];
  const primaryDiscount = args.discountLabels.find((l) =>
    ["BEST DEAL FOUND", "REAL DISCOUNT", "FAIR PRICE", "SAME PRODUCT CHEAPER"].includes(l)
  );
  if (primaryDiscount) chips.push({ label: primaryDiscount, tone: "blue", evidence: "positive" });
  chips.push({ label: args.categoryLabel, tone: "violet" });
  const seen = new Set(chips.map((c) => c.label));
  for (const chip of args.existing) {
    if (!seen.has(chip.label)) chips.push(chip);
  }
  return chips.slice(0, 4);
}

export type Phase41TrayContext = Phase40TrayContext & {
  categoryIntelligenceApplied: true;
  universalQuery: ReturnType<typeof buildUniversalQueryIntelligence>;
  marketBreadth: ReturnType<typeof buildMarketBreadthIntelligence>;
  marketSummaryV2: ReturnType<typeof buildMarketSummaryV2>;
  stagedIntelligence: ReturnType<typeof buildStagedIntelligenceMeta>;
};

export function buildGlobalCategoryDecisionMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>,
  productsByLink: Map<string, { product: QuantProduct; searchQuery: string }>,
  marketMemory: MarketMemoryState | null = null
): { decisions: Map<string, UniversalProductDecision>; trayContext: Phase41TrayContext } {
  const tray = [...productsByLink.values()].map((row) => row.product);
  const searchQuery = [...productsByLink.values()][0]?.searchQuery?.trim() ?? "";
  const base = buildPhase40CommerceRankingDecisionMap(coherenceByLink, metaByLink, productsByLink, marketMemory);

  const universalQuery = buildUniversalQueryIntelligence(searchQuery);
  const offerGraph = base.decisions.values().next().value?.productIntelligence?.universalOfferGraph;
  const medianPrice =
    tray.filter((p) => p.price > 0).reduce((s, p) => s + p.price, 0) / Math.max(1, tray.filter((p) => p.price > 0).length) ||
    0;

  const marketBreadth = buildMarketBreadthIntelligence({
    tray,
    offerGraph: offerGraph ?? {
      version: 1,
      entities: [],
      totalOffers: tray.length,
      totalEntities: tray.length,
      merchantCoverage: [],
      storeCount: new Set(tray.map((p) => p.store)).size,
      searchDepthScore: 50,
    },
    medianPrice,
  });

  const verdictByLink = new Map<string, PrimaryVerdict>();
  const opportunityByLink = new Map<string, number>();
  const categoryFitByLink = new Map<string, number>();
  const trustByLink = new Map<string, number>();
  const balancedByLink = new Map<string, number>();
  const discountLabelsByLink = new Map<string, string[]>();
  const titlesByLink = new Map<string, string>();

  const rowIntel = new Map<
    string,
    {
      categoryIntel: ReturnType<typeof buildGlobalCategoryIntelligence>;
      identity: ReturnType<typeof classifyProductIdentityV2>;
      discount: ReturnType<typeof buildBillionDollarDiscountIntelligence>;
      merchantTrustV2: ReturnType<typeof buildMerchantTrustV2>;
      dataQuality: ReturnType<typeof assessDataQuality>;
      balanced: ReturnType<typeof computeCategoryBalancedScore>;
      imageProduct: QuantProduct;
    }
  >();

  for (const [link, decision] of base.decisions) {
    const row = productsByLink.get(link);
    const intel = decision.productIntelligence;
    if (!row?.product || !intel) continue;

    titlesByLink.set(link, row.product.title);
    const imageProduct = enrichProductImageReliability(row.product, tray);
    const merchantTrustV2 = buildMerchantTrustV2(row.product);
    const categoryIntel = buildGlobalCategoryIntelligence({
      product: row.product,
      searchQuery,
      merchantTrust: merchantTrustV2,
      segment: intel.segment ?? null,
    });

    const identity = classifyProductIdentityV2({
      product: row.product,
      globalIdentity: intel.globalProductIdentity ?? {
        version: 1,
        canonicalKey: link,
        brandKey: "",
        modelKey: "",
        normalizedTitle: row.product.title,
        model: "",
        size: "",
        color: "",
        storage: "",
        dimensions: "",
        generation: "",
        condition: "",
        identityClass: "SIMILAR PRODUCT",
        identityConfidence: 50,
        comparable: true,
      },
      equivalentMatches: intel.equivalentMatches,
    });

    const discount =
      intel.globalPriceIntelligence && intel.discountIntelligenceV2 && intel.realDiscountValidationV3
        ? buildBillionDollarDiscountIntelligence({
            discountV2: intel.discountIntelligenceV2,
            globalPrice: intel.globalPriceIntelligence,
            realDiscount: intel.realDiscountValidationV3,
            identity,
            offerGraph: intel.universalOfferGraph,
            productTitle: row.product.title,
            store: row.product.store,
          })
        : {
            version: 1 as const,
            primaryLabel: "FAIR PRICE" as const,
            labels: ["FAIR PRICE" as const],
            reasoning: "Fair market pricing.",
            outletOpportunity: false,
            refurbOpportunity: false,
            historicalHint: null,
          };

    const dataQuality = assessDataQuality({
      product: row.product,
      hasPriceIntel: Boolean(intel.globalPriceIntelligence),
      hasTrustIntel: true,
      hasCategoryIntel: true,
      imageConfidence: intel.imageConfidence ?? imageProduct.image_confidence ?? 50,
    });

    const balanced = computeCategoryBalancedScore({
      price: row.product.price,
      medianPrice,
      qualityScore: intel.globalBuyOpportunity?.qualityScore ?? 60,
      merchantTrust: merchantTrustV2,
      categoryIntel,
      conditionBlob: `${row.product.title} ${row.product.availability ?? ""}`,
    });

    rowIntel.set(link, { categoryIntel, identity, discount, merchantTrustV2, dataQuality, balanced, imageProduct });
    discountLabelsByLink.set(link, discount.labels);
    opportunityByLink.set(link, intel.opportunityPriorityV2?.opportunityScore ?? balanced.balancedScore);
    categoryFitByLink.set(link, categoryIntel.categoryFitScore);
    trustByLink.set(link, merchantTrustV2.trustScore);
    balancedByLink.set(link, balanced.balancedScore);
    verdictByLink.set(link, decision.verdict);
  }

  const rankedLinks = [...base.trayContext.intelligenceRankOrder].sort(
    (a, b) => (balancedByLink.get(b) ?? 0) - (balancedByLink.get(a) ?? 0)
  );

  applyBuyFirstV2({
    rankedLinks,
    verdictByLink,
    opportunityScoreByLink: opportunityByLink,
    categoryFitByLink,
    trustByLink,
    traySize: tray.length,
  });

  const result = new Map<string, UniversalProductDecision>();
  const winnerLink = base.trayContext.searchDominanceSummary.bestOverallChoice
    ? [...base.decisions.entries()].find(([, d]) =>
        d.productIntelligence?.globalWinner?.isWinner
      )?.[0] ?? rankedLinks[0]
    : rankedLinks[0];

  const beatsTitleByLink = new Map<string, string | null>();
  rankedLinks.forEach((link, i) => {
    beatsTitleByLink.set(link, i > 0 ? titlesByLink.get(rankedLinks[i - 1]!) ?? null : null);
  });

  for (const link of rankedLinks) {
    const decision = base.decisions.get(link);
    const row = productsByLink.get(link);
    const intel = decision?.productIntelligence;
    const rows = rowIntel.get(link);
    if (!decision || !row?.product || !intel || !rows) {
      if (decision) result.set(link, decision);
      continue;
    }

    let verdict = verdictByLink.get(link) ?? decision.verdict;
    if (rows.dataQuality.useInsufficientData) verdict = "INSUFFICIENT DATA";
    else if (merchantTrustBlocksBuyReady(rows.merchantTrustV2) && verdict === "BUY READY") verdict = "COMPARE";

    const evidenceConfidence = computeEvidenceConfidence({
      verdict,
      merchantTrust: rows.merchantTrustV2,
      categoryIntel: rows.categoryIntel,
      discount: rows.discount,
      breadth: marketBreadth,
      opportunityScore: opportunityByLink.get(link) ?? 0,
      imageConfidence: rows.imageProduct.image_confidence ?? intel.imageConfidence,
      link,
    });

    const consistency = resolveVerdictConsistencyV2({
      verdict,
      confidence: evidenceConfidence.confidence,
      searchRank: intel.searchRank,
      isGlobalWinner: intel.globalWinner?.isWinner ?? link === winnerLink,
      merchantTrust: rows.merchantTrustV2,
      discount: rows.discount,
      identity: rows.identity,
      availability: row.product.availability ?? "",
      compareTarget: beatsTitleByLink.get(link),
    });

    verdict = consistency.resolvedVerdict;

    const rankExplanation = intel.searchRank
      ? buildRankExplanation({
          productTitle: row.product.title,
          searchRank: intel.searchRank,
          verdict,
          categoryIntel: rows.categoryIntel,
          beatsItTitle: beatsTitleByLink.get(link),
          isGlobalWinner: intel.globalWinner?.isWinner ?? link === winnerLink,
        })
      : undefined;

    const primaryLine = clipLine(consistency.explanation || rankExplanation?.rankBlock || decision.reasonLine);
    const compareName = intel.globalAlternatives?.bestSameProductCheaper?.store ?? intel.bestPlaceToBuy?.merchant;

    result.set(link, {
      ...decision,
      verdict,
      confidence: evidenceConfidence.confidence,
      confidenceReason: evidenceConfidence.reason,
      reasonLine: primaryLine,
      primaryReason: primaryLine,
      secondaryReason: clipLine(rows.categoryIntel.categoryReasoning),
      summaryLines: [primaryLine, clipLine(rows.discount.reasoning)],
      displayChips: buildCategoryChips({
        existing: decision.displayChips,
        discountLabels: rows.discount.labels,
        categoryLabel: rows.categoryIntel.categoryLabel,
        rankHeadline: intel.searchRank?.rankHeadline ?? "#— Compare",
      }),
      productIntelligence: {
        ...intel,
        imageConfidence: rows.imageProduct.image_confidence ?? intel.imageConfidence,
        merchantTrustIntelligence: rows.merchantTrustV2,
        globalCategoryIntelligence: rows.categoryIntel,
        productIdentityV2: rows.identity,
        billionDollarDiscount: rows.discount,
        marketBreadth,
        evidenceConfidence,
        verdictConsistencyV2: consistency,
        rankExplanation,
        dataQuality: rows.dataQuality,
        categoryBalancedScore: rows.balanced,
        universalQuery,
        stagedIntelligence: buildStagedIntelligenceMeta({
          hasCategoryIntel: true,
          hasIdentityMatch: true,
          hasDiscountLabels: rows.discount.labels.length > 0,
          hasRankExplanation: Boolean(rankExplanation),
          hasImageReliability: (rows.imageProduct.image_confidence ?? 0) >= 28,
        }),
        buyerReasoning: {
          primaryLine: rankExplanation?.buyerAction ?? primaryLine,
          buyerFit: rows.categoryIntel.categoryReasoning,
          valueAnalysis: rows.discount.reasoning,
          marketPosition: rows.identity.reasoning,
          trustAnalysis: rows.merchantTrustV2.v2Reasoning,
          tradeoffs: rankExplanation?.whyNotHigher ?? "",
          competitorComparison: compareName ? `Compare against ${compareName}.` : rankExplanation?.whatBeatsIt ?? "",
          improvementPath: rankExplanation?.whyStillUseful ?? "",
        },
        alignmentFlags: [
          ...(intel.alignmentFlags ?? []),
          "phase41_global_category_intelligence",
          `phase41_category_${rows.categoryIntel.categoryKey}`,
          `phase41_discount_${rows.discount.primaryLabel.replace(/\s+/g, "_").toLowerCase()}`,
        ].filter((flag, index, list) => list.indexOf(flag) === index),
      },
    });
  }

  for (const [link, decision] of base.decisions) {
    if (!result.has(link)) result.set(link, decision);
  }

  const finalVerdictByLink = new Map([...result.entries()].map(([link, d]) => [link, d.verdict]));
  const marketSummaryV2 = buildMarketSummaryV2({
    coverage: base.trayContext.marketCoverage,
    savings: base.trayContext.searchDominanceSummary
      ? {
          version: 1,
          bestPrice: base.trayContext.searchDominanceSummary.lowestPrice,
          highestPrice: base.trayContext.searchDominanceSummary.highestPrice,
          averagePrice: 0,
          marketSpread: 0,
          potentialSavings: base.trayContext.searchDominanceSummary.potentialSavings,
          bestPriceProductTitle: null,
          highestPriceProductTitle: null,
          headline: "",
          detailLine: "",
        }
      : {
          version: 1,
          bestPrice: 0,
          highestPrice: 0,
          averagePrice: 0,
          marketSpread: 0,
          potentialSavings: 0,
          bestPriceProductTitle: null,
          highestPriceProductTitle: null,
          headline: "",
          detailLine: "",
        },
    winner: {
      version: 1,
      winnerLink: winnerLink ?? null,
      winnerTitle: winnerLink ? titlesByLink.get(winnerLink) ?? null : null,
      winnerScore: 0,
      candidates: [],
    },
    searchRanks: [...base.trayContext.searchRankByLink.values()],
    titlesByLink,
    verdictByLink: finalVerdictByLink,
    discountLabelsByLink,
  });

  const stagedIntelligence = buildStagedIntelligenceMeta({
    hasCategoryIntel: true,
    hasIdentityMatch: true,
    hasDiscountLabels: true,
    hasRankExplanation: true,
    hasImageReliability: true,
  });

  const leader = result.get(rankedLinks[0] ?? "");
  if (leader?.productIntelligence) {
    leader.productIntelligence.marketSummaryV2 = marketSummaryV2;
  }

  return {
    decisions: result,
    trayContext: {
      ...base.trayContext,
      categoryIntelligenceApplied: true,
      universalQuery,
      marketBreadth,
      marketSummaryV2,
      stagedIntelligence,
      intelligenceRankOrder: rankedLinks,
    },
  };
}

export function buildGlobalCategoryDisplayCoherenceByLink(
  coherenceByLink: Map<string, CoherentProductDecision>,
  universalByLink: Map<string, UniversalProductDecision>,
  trayContext: Phase41TrayContext
): Map<string, CoherentProductDecision> {
  const base = buildPhase40CommerceRankingDisplayCoherenceByLink(coherenceByLink, universalByLink, trayContext);
  const enriched = new Map<string, CoherentProductDecision>();

  for (const [link, coherent] of base) {
    const universal = universalByLink.get(link);
    const overlaid = universal ? overlayCoherentWithUniversal(coherent, universal) : coherent;
    enriched.set(link, {
      ...overlaid,
      decisionBrief: enrichDecisionBriefWithGlobalCategory(
        overlaid.decisionBrief,
        trayContext.marketCoverage,
        trayContext.marketSummaryV2,
        trayContext.universalQuery.understandingLine
      ),
    });
  }

  return enriched;
}

export { orderProductsBySearchRank };

/** Phase 41 compatibility — callers expecting Phase 40 export names route to Phase 41 pipeline. */
export {
  buildGlobalCategoryDecisionMap as buildCommerceRankingDecisionMap,
  buildGlobalCategoryDisplayCoherenceByLink as buildCommerceRankingDisplayCoherenceByLink,
};
