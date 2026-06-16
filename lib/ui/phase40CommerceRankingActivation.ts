/**
 * Phase 40 — Global Ranking + Winner Intelligence activation.
 * Chains after Phase 39 — intelligence only, no card layout changes.
 */

import { computeBestSavings } from "@/lib/intelligence/bestSavingsEngine";
import { validateBuyReadyV2 } from "@/lib/intelligence/buyReadyValidationV2";
import { computeDynamicConfidence, hasStaticConfidenceCluster } from "@/lib/intelligence/dynamicConfidenceEngine";
import { computeGlobalWinner, isGlobalWinner } from "@/lib/intelligence/globalWinnerEngine";
import type { GlobalBuyOpportunity } from "@/lib/intelligence/globalBuyOpportunityEngine";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";
import type { MerchantTrustSignal } from "@/lib/intelligence/merchantTrustEngineV2";
import type { OpportunityPriorityV2 } from "@/lib/intelligence/opportunityPriorityEngineV2";
import type { RealDiscountValidationV3 } from "@/lib/intelligence/realDiscountValidationV3Engine";
import { interpretOpportunityScore } from "@/lib/intelligence/opportunityLabelEngine";
import {
  rankSearchResults,
  searchRankOrder,
  type SearchRankEntry,
} from "@/lib/intelligence/searchRankingEngine";
import {
  resolveSearchRankingContradictions,
  validateSearchRankingConsistency,
} from "@/lib/intelligence/searchRankingContradictionEngine";
import { buildSearchDominanceSummary } from "@/lib/intelligence/searchDominanceSummaryEngine";
import { buildWaitForecastV2 } from "@/lib/intelligence/waitForecastEngineV2";
import type { MarketMemoryState } from "@/lib/intelligence/marketMemory";
import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import type { ExposureChip } from "@/lib/ui/intelligenceExposureActivation";
import { enrichDecisionBriefWithSearchRanking } from "@/lib/ui/searchRankingBriefEnrichment";
import {
  buildCommerceCalibrationDecisionMap,
  buildCommerceCalibrationDisplayCoherenceByLink,
  type Phase39TrayContext,
} from "@/lib/ui/phase39CommerceCalibrationActivation";
import type { ProductTrayMeta } from "@/lib/ui/productDifferentiationEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { overlayCoherentWithUniversal, type UniversalProductDecision } from "@/lib/ui/universalProductDecision";
import { resolveTruthRankDelta } from "@/lib/truth/trustDrivenCompositeRank";

function clipLine(text: string, max = 220): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function buildRankExposureChips(args: {
  searchRank: SearchRankEntry;
  opportunityLabel: ReturnType<typeof interpretOpportunityScore>;
  isWinner: boolean;
  existing: ExposureChip[];
}): ExposureChip[] {
  const chips: ExposureChip[] = [];

  if (args.isWinner) {
    chips.push({ label: "Best Overall Choice", tone: "emerald", evidence: "positive" });
  } else if (args.searchRank.label !== "Compare") {
    chips.push({ label: args.searchRank.label, tone: "blue", evidence: "positive" });
  }

  chips.push({
    label: args.opportunityLabel.shortLine,
    tone: args.opportunityLabel.score >= 61 ? "emerald" : "slate",
    evidence: args.opportunityLabel.score >= 41 ? "positive" : "caution",
  });

  const seen = new Set(chips.map((c) => c.label));
  for (const chip of args.existing) {
    if (!seen.has(chip.label)) chips.push(chip);
  }

  return chips.slice(0, 4);
}

function applyRankingIntelligence(
  decision: UniversalProductDecision,
  searchRank: SearchRankEntry,
  isWinner: boolean
): UniversalProductDecision {
  const intelligence = decision.productIntelligence;
  if (!intelligence) return decision;

  const rankReason = isWinner
    ? clipLine(`Best overall choice in this search — ${searchRank.rankHeadline}.`)
    : clipLine(`${searchRank.rankHeadline} — ranked by opportunity, trust, and value.`);

  return {
    ...decision,
    reasonLine: rankReason,
    primaryReason: rankReason,
    summaryLines: [rankReason, decision.summaryLines[1] ?? ""],
    displayChips: buildRankExposureChips({
      searchRank,
      opportunityLabel: intelligence.opportunityLabel!,
      isWinner,
      existing: decision.displayChips,
    }),
    productIntelligence: {
      ...intelligence,
      alignmentFlags: [
        ...(intelligence.alignmentFlags ?? []),
        "phase40_search_ranking",
        `phase40_rank_${searchRank.rank}`,
        isWinner ? "phase40_global_winner" : `phase40_label_${searchRank.label.replace(/\s+/g, "_").toLowerCase()}`,
      ].filter((flag, index, list) => list.indexOf(flag) === index),
    },
  };
}

export type Phase40TrayContext = Phase39TrayContext & {
  rankingApplied: true;
  searchDominanceSummary: ReturnType<typeof buildSearchDominanceSummary>;
  searchRankByLink: Map<string, SearchRankEntry>;
  intelligenceRankOrder: string[];
};

export function buildCommerceRankingDecisionMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>,
  productsByLink: Map<string, { product: QuantProduct; searchQuery: string }>,
  marketMemory: MarketMemoryState | null = null
): { decisions: Map<string, UniversalProductDecision>; trayContext: Phase40TrayContext } {
  const tray = [...productsByLink.values()].map((row) => row.product);
  const base = buildCommerceCalibrationDecisionMap(coherenceByLink, metaByLink, productsByLink, marketMemory);
  const coverage = base.trayContext.marketCoverage;
  const savings = computeBestSavings(tray);

  const winnerRows: Array<{
    link: string;
    product: QuantProduct;
    globalPrice: GlobalPriceIntelligence;
    merchantTrust: MerchantTrustSignal;
    buyOpportunity: GlobalBuyOpportunity;
    opportunity: OpportunityPriorityV2;
    realDiscount: RealDiscountValidationV3;
  }> = [];

  const rankingInputRows: Array<{
    link: string;
    product: QuantProduct;
    winnerScore: number;
    opportunityScore: number;
    valueScore: number;
    qualityScore: number;
    trustScore: number;
    verdict: UniversalProductDecision["verdict"];
    price: number;
    truthRankDelta?: number;
  }> = [];

  for (const [link, decision] of base.decisions) {
    const row = productsByLink.get(link);
    const intel = decision.productIntelligence;
    if (!row?.product || !intel) continue;

    const globalPrice = intel.globalPriceIntelligence;
    const merchantTrust = intel.merchantTrustIntelligence;
    const buyOpportunity = intel.globalBuyOpportunity;
    const opportunity = intel.opportunityPriorityV2;
    const realDiscount = intel.realDiscountValidationV3;

    if (!globalPrice || !merchantTrust || !buyOpportunity || !opportunity || !realDiscount) {
      continue;
    }

    winnerRows.push({
      link,
      product: row.product,
      globalPrice,
      merchantTrust,
      buyOpportunity,
      opportunity,
      realDiscount,
    });
  }

  const globalWinner = computeGlobalWinner({ rows: winnerRows });
  const winnerScoreByLink = new Map(globalWinner.candidates.map((c) => [c.link, c.winnerScore]));

  for (const [link, decision] of base.decisions) {
    const row = productsByLink.get(link);
    const intel = decision.productIntelligence;
    if (!row?.product || !intel?.globalBuyOpportunity || !intel.merchantTrustIntelligence) continue;

    rankingInputRows.push({
      link,
      product: row.product,
      winnerScore: winnerScoreByLink.get(link) ?? 0,
      opportunityScore: intel.opportunityPriorityV2?.opportunityScore ?? 0,
      valueScore: intel.globalBuyOpportunity.valueScore,
      qualityScore: intel.globalBuyOpportunity.qualityScore,
      trustScore: intel.merchantTrustIntelligence.trustScore,
      verdict: decision.verdict,
      price: row.product.price,
      truthRankDelta: resolveTruthRankDelta({
        product: row.product,
        searchQuery: row.searchQuery,
      }),
    });
  }

  const searchRanks = rankSearchResults({ winner: globalWinner, rows: rankingInputRows });
  const searchRankByLink = new Map(searchRanks.map((r) => [r.link, r]));
  const intelligenceRankOrder = searchRankOrder(searchRanks);

  let topOpportunity: ReturnType<typeof interpretOpportunityScore> | null = null;
  for (const entry of searchRanks) {
    const intel = base.decisions.get(entry.link)?.productIntelligence;
    const score = intel?.opportunityPriorityV2?.opportunityScore ?? 0;
    const label = interpretOpportunityScore(score);
    if (!topOpportunity || label.score > topOpportunity.score) topOpportunity = label;
  }

  const searchDominanceSummary = buildSearchDominanceSummary({
    coverage,
    savings,
    winner: globalWinner,
    topOpportunity,
    resultsAnalyzed: tray.length,
  });

  const result = new Map<string, UniversalProductDecision>();
  const confidenceValues: number[] = [];

  for (const link of intelligenceRankOrder) {
    const decision = base.decisions.get(link);
    if (!decision) continue;

    const row = productsByLink.get(link);
    const intel = decision.productIntelligence;
    const searchRank = searchRankByLink.get(link);
    if (!row?.product || !intel || !searchRank) {
      result.set(link, decision);
      continue;
    }

    const merchantTrust = intel.merchantTrustIntelligence;
    const globalPrice = intel.globalPriceIntelligence;
    const realDiscount = intel.realDiscountValidationV3;
    const buyOpportunity = intel.globalBuyOpportunity;
    if (!merchantTrust || !globalPrice || !realDiscount || !buyOpportunity) {
      result.set(link, decision);
      continue;
    }

    const opportunityLabel = interpretOpportunityScore(intel.opportunityPriorityV2?.opportunityScore ?? 0);
    const waitForecast = buildWaitForecastV2({
      wait: intel.waitPrediction ?? {
        version: 1,
        whyWait: "",
        expectedSavings: 0,
        dropProbabilityPct: 0,
        expectedTimeframe: "",
        stockLossRisk: "low",
        predictionLine: "",
        waitValid: false,
      },
      waitExplanation: intel.waitExplanation,
    });

    const buyReadyValidation = validateBuyReadyV2({
      currentVerdict: decision.verdict,
      opportunityLabel,
      merchantTrust,
      globalPrice,
      realDiscount,
      coverage,
      qualityScore: buyOpportunity.qualityScore,
      waitForecastValid: waitForecast.forecastValid,
    });

    let verdict = buyReadyValidation.validatedVerdict;
    const rankBoost = Math.max(0, 12 - searchRank.rank * 2);

    let dynamicConfidence = computeDynamicConfidence({
      link,
      verdict,
      merchantTrust,
      globalPrice,
      realDiscount,
      coverage,
      qualityScore: buyOpportunity.qualityScore,
      availabilityScore: buyOpportunity.availabilityScore,
      rankBoost,
    });

    const resolved = resolveSearchRankingContradictions({
      verdict,
      confidence: dynamicConfidence,
      opportunityLabel,
      merchantTrust,
      waitForecast,
    });
    verdict = resolved.verdict;
    dynamicConfidence = resolved.confidence;

    if (verdict === "WAIT" && !waitForecast.forecastValid) {
      verdict = "COMPARE";
    }

    const winner = isGlobalWinner(link, globalWinner);
    const commercePriorityLabel =
      winner && verdict === "BUY READY" ? "LIKELY DEAL SIGNAL" : intel.commercePriorityLabel;

    let primaryLine = decision.primaryReason ?? decision.reasonLine;
    if (verdict === "WAIT" && waitForecast.forecastValid) {
      primaryLine = clipLine(`Wait — ${waitForecast.formattedBlock}`);
    } else if (winner) {
      primaryLine = clipLine(
        `Best overall choice — ${searchRank.rankHeadline}. ${opportunityLabel.displayLine}. Buy at ${intel.bestPlaceToBuy?.merchant ?? row.product.store}.`
      );
    } else {
      primaryLine = clipLine(`${searchRank.rankHeadline}. ${opportunityLabel.displayLine}.`);
    }

    const rankingConsistency = validateSearchRankingConsistency({
      verdict,
      confidence: dynamicConfidence,
      opportunityLabel,
      merchantTrust,
      waitForecast,
      searchRank,
      globalWinner: winner,
    });

    confidenceValues.push(dynamicConfidence.confidence);

    let next: UniversalProductDecision = {
      ...decision,
      verdict,
      confidence: dynamicConfidence.confidence,
      confidenceReason: dynamicConfidence.reason,
      reasonLine: primaryLine,
      primaryReason: primaryLine,
      productIntelligence: {
        ...intel,
        commercePriorityLabel,
        opportunityLabel,
        dynamicConfidence,
        waitForecastV2: waitForecast,
        buyReadyValidationV2: buyReadyValidation,
        globalWinner: {
          isWinner: winner,
          winnerScore: winnerScoreByLink.get(link) ?? 0,
          winnerTitle: globalWinner.winnerTitle,
        },
        searchRank,
        rankingConsistency,
        bestSavings: savings,
      },
    };

    next = applyRankingIntelligence(next, searchRank, winner);
    result.set(link, next);
  }

  for (const [link, decision] of base.decisions) {
    if (!result.has(link)) result.set(link, decision);
  }

  if (confidenceValues.length >= 3 && hasStaticConfidenceCluster(confidenceValues)) {
    for (const [link, decision] of result) {
      const intel = decision.productIntelligence;
      const merchantTrust = intel?.merchantTrustIntelligence;
      const globalPrice = intel?.globalPriceIntelligence;
      const realDiscount = intel?.realDiscountValidationV3;
      const buyOpportunity = intel?.globalBuyOpportunity;
      const searchRank = intel?.searchRank;
      if (!merchantTrust || !globalPrice || !realDiscount || !buyOpportunity || !searchRank) continue;

      const dynamicConfidence = computeDynamicConfidence({
        link,
        verdict: decision.verdict,
        merchantTrust,
        globalPrice,
        realDiscount,
        coverage,
        qualityScore: buyOpportunity.qualityScore,
        availabilityScore: buyOpportunity.availabilityScore,
        rankBoost: Math.max(0, 14 - searchRank.rank),
      });

      result.set(link, {
        ...decision,
        confidence: dynamicConfidence.confidence,
        confidenceReason: dynamicConfidence.reason,
        productIntelligence: intel
          ? { ...intel, dynamicConfidence }
          : intel,
      });
    }
  }

  const leader = result.get(intelligenceRankOrder[0] ?? "");
  if (leader?.productIntelligence) {
    leader.productIntelligence.searchDominanceSummary = searchDominanceSummary;
  }

  return {
    decisions: result,
    trayContext: {
      ...base.trayContext,
      rankingApplied: true,
      searchDominanceSummary,
      searchRankByLink,
      intelligenceRankOrder,
    },
  };
}

export function buildCommerceRankingDisplayCoherenceByLink(
  coherenceByLink: Map<string, CoherentProductDecision>,
  universalByLink: Map<string, UniversalProductDecision>,
  trayContext: Phase40TrayContext
): Map<string, CoherentProductDecision> {
  const base = buildCommerceCalibrationDisplayCoherenceByLink(coherenceByLink, universalByLink, trayContext);
  const enriched = new Map<string, CoherentProductDecision>();

  for (const [link, coherent] of base) {
    const universal = universalByLink.get(link);
    const overlaid = universal ? overlayCoherentWithUniversal(coherent, universal) : coherent;
    enriched.set(link, {
      ...overlaid,
      decisionBrief: enrichDecisionBriefWithSearchRanking(
        overlaid.decisionBrief,
        trayContext.marketCoverage,
        trayContext.searchDominanceSummary
      ),
    });
  }

  return enriched;
}

/** Reorder products by intelligence rank — #1 Best Overall Choice first. */
export function orderProductsBySearchRank(products: QuantProduct[], rankOrder: string[]): QuantProduct[] {
  if (!rankOrder.length) return products;
  const byLink = new Map(products.map((p) => [p.link, p]));
  const ordered: QuantProduct[] = [];
  const seen = new Set<string>();

  for (const link of rankOrder) {
    const product = byLink.get(link);
    if (product) {
      ordered.push(product);
      seen.add(link);
    }
  }

  for (const product of products) {
    if (!seen.has(product.link)) ordered.push(product);
  }

  return ordered;
}

export {
  computeGlobalWinner,
  computeBestSavings,
  interpretOpportunityScore,
  rankSearchResults,
  buildSearchDominanceSummary,
};
