/**
 * Phase 35 — Personal Commerce Intelligence activation.
 * Chains after Phase 34 — intelligence only, no UI/layout changes.
 */

import { buildBuyerReasoning, buyerReasoningIsAnalystGrade } from "@/lib/intelligence/buyerReasoningEngine";
import { inferPersonalBuyerIdentity, computePersonalBuyerProductScore, type PersonalBuyerIdentity } from "@/lib/intelligence/personalBuyerIdentityEngine";
import {
  buildPersonalCommerceScores,
  hasExpandedConfidenceSpread,
  type PersonalCommerceScore,
} from "@/lib/intelligence/personalCommerceScoreEngine";
import {
  inferPersonalTasteProfile,
  scorePersonalTaste,
  type PersonalTasteProfile,
} from "@/lib/intelligence/personalTasteIntelligenceEngine";
import { mergePreferenceWithQuery } from "@/lib/intelligence/preferenceMemoryLayer";
import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import {
  buildPersonalCommerceBriefFields,
  enrichDecisionBriefWithPersonalCommerce,
} from "@/lib/ui/personalCommerceBriefEnrichment";
import {
  buildPreferenceIntelligenceDecisionMap,
  buildPreferenceIntelligenceDisplayCoherenceByLink,
} from "@/lib/ui/phase34PreferenceIntelligenceActivation";
import { assignPreferenceAwareVerdicts } from "@/lib/ui/preferenceVerdictEngine";
import type { ProductTrayMeta } from "@/lib/ui/productDifferentiationEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { overlayCoherentWithUniversal, type UniversalProductDecision } from "@/lib/ui/universalProductDecision";
import type { CommerceIntelligenceAuthority } from "@/lib/intelligence/commerceIntelligenceAuthorityEngine";

function clipLine(text: string, max = 180): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function applyPersonalCommerceIntelligence(
  decision: UniversalProductDecision,
  buyer: PersonalBuyerIdentity,
  taste: PersonalTasteProfile,
  personalScore: PersonalCommerceScore,
  buyerMatchPct: number,
  tasteMatchPct: number,
  reasoning: ReturnType<typeof buildBuyerReasoning>
): UniversalProductDecision {
  const intelligence = decision.productIntelligence;
  if (!intelligence) return decision;

  const decisionThesis = clipLine(reasoning.primaryLine);
  const primaryReason = clipLine(reasoning.primaryLine);
  const purchaseReasoning = clipLine(
    [reasoning.competitorComparison, reasoning.improvementPath].filter(Boolean).join(" ")
  );

  return {
    ...decision,
    confidence: personalScore.expandedConfidence,
    confidenceReason: clipLine(`${buyer.buyerIdentity} fit · ${taste.detectedTaste} taste alignment`),
    decisionThesis,
    reasonLine: primaryReason,
    primaryReason,
    secondaryReason: purchaseReasoning,
    summaryLines: [decisionThesis, primaryReason],
    reasonAuthority: {
      ...decision.reasonAuthority,
      primaryReason: {
        ...decision.reasonAuthority.primaryReason,
        line: primaryReason,
      },
      secondaryReasons: [
        {
          code: decision.reasonAuthority.secondaryReasons[0]?.code ?? ("FIT" as const),
          label: "Buyer-fit thesis",
          line: decisionThesis,
        },
        {
          code: decision.reasonAuthority.secondaryReasons[1]?.code ?? ("VALUE" as const),
          label: "Analyst reasoning",
          line: purchaseReasoning,
        },
      ],
    },
    productIntelligence: {
      ...intelligence,
      personalBuyerIdentity: buyer,
      personalTasteProfile: taste,
      personalCommerceScore: personalScore,
      buyerMatchPct,
      tasteMatchPct,
      buyerReasoning: reasoning,
      alignmentFlags: [
        ...(intelligence.alignmentFlags ?? []),
        "phase35_personal_commerce_intelligence",
        `phase35_buyer_${buyer.buyerIdentity.replace(/\s+/g, "_").toLowerCase()}`,
        `phase35_taste_${taste.detectedTaste.replace(/\s+/g, "_").toLowerCase()}`,
        `phase35_confidence_${personalScore.confidenceBand}`,
      ].filter((flag, index, list) => list.indexOf(flag) === index),
    },
  };
}

export function buildPersonalCommerceDecisionMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>,
  productsByLink: Map<string, { product: QuantProduct; searchQuery: string }>
): Map<string, UniversalProductDecision> {
  const preferenceMap = buildPreferenceIntelligenceDecisionMap(coherenceByLink, metaByLink, productsByLink);
  const searchQuery = [...productsByLink.values()][0]?.searchQuery?.trim() ?? "";
  const segment = preferenceMap.values().next().value?.productIntelligence?.segment ?? null;

  let buyer = inferPersonalBuyerIdentity(searchQuery);
  let taste = inferPersonalTasteProfile(searchQuery, segment);
  ({ buyer, taste } = mergePreferenceWithQuery({ profile: { version: 0, vector: { version: 0, brandAffinity: {}, budgetMin: null, budgetMax: null, styleAxes: {}, buyerTypeWeights: {} }, inferredBuyerLean: null, inferredTasteLean: null, signalCount: 0 }, buyer, taste }));

  const scoringRows: Array<{
    link: string;
    intelligence: NonNullable<UniversalProductDecision["productIntelligence"]>;
    commerce: CommerceIntelligenceAuthority;
    buyerScore: number;
    tasteScore: number;
    buyer: PersonalBuyerIdentity;
    avoid: boolean;
    product: QuantProduct;
    searchQuery: string;
  }> = [];

  const trayPrices = [...productsByLink.values()].map((row) => row.product.price).filter((p) => p > 0);
  const trayMedianPrice = trayPrices.length
    ? trayPrices.sort((a, b) => a - b)[Math.floor(trayPrices.length / 2)]!
    : 0;
  const trayMinPrice = trayPrices.length ? Math.min(...trayPrices) : 0;

  const commerceByLink = new Map<string, CommerceIntelligenceAuthority>();

  for (const [link, decision] of preferenceMap) {
    const row = productsByLink.get(link);
    const intel = decision.productIntelligence;
    if (!row?.product || !intel) continue;

    const commerce: CommerceIntelligenceAuthority = {
      version: 1,
      marketOpportunityScore: intel.marketOpportunityScore ?? 50,
      marketValueScore: intel.marketValueScore ?? 50,
      merchantTrustScore: intel.merchantTrustScore ?? 50,
      marketAveragePrice: intel.marketAveragePrice ?? 0,
      priceAdvantage: intel.priceAdvantage ?? 0,
      dealStrength: intel.dealStrength ?? 50,
      dealRarity: intel.dealRarity ?? 50,
      valueDelta: intel.valueDelta ?? 0,
      availabilityScore: 72,
      competitorPressure: intel.alternativePressure ?? 50,
      offerUniqueness: 55,
      intentAlignment: 55,
      commerceReasoning: intel.commerceReasoning ?? {
        whyWon: "",
        whyLost: "",
        competitorEdge: "",
        improvementPath: "",
      },
    };
    commerceByLink.set(link, commerce);

    const tasteResult = scorePersonalTaste(row.product, taste, row.searchQuery);
    const buyerScore = computePersonalBuyerProductScore(buyer, row.product, row.searchQuery, trayMedianPrice, trayMinPrice);

    scoringRows.push({
      link,
      intelligence: intel,
      commerce,
      buyerScore,
      tasteScore: tasteResult.tasteScore,
      buyer,
      avoid: decision.verdict === "AVOID",
      product: row.product,
      searchQuery: row.searchQuery,
    });
  }

  const personalScores = buildPersonalCommerceScores({ rows: scoringRows });

  const rerankRows = [...scoringRows]
    .map((row) => ({
      ...row,
      personal: personalScores.get(row.link)!,
    }))
    .sort((a, b) => b.personal.personalCommerceScore - a.personal.personalCommerceScore);

  const rerankedPreferenceMap = new Map(preferenceMap);
  for (const row of rerankRows) {
    const existing = preferenceMap.get(row.link);
    if (!existing) continue;
    rerankedPreferenceMap.set(row.link, {
      ...existing,
      productIntelligence: {
        ...existing.productIntelligence!,
        personalCommerceRank: rerankRows.findIndex((r) => r.link === row.link),
      },
    });
  }

  const verdictAuthority = assignPreferenceAwareVerdicts({
    decisions: rerankedPreferenceMap,
    personalizedByLink: new Map(
      [...personalScores.entries()].map(([link, score]) => [
        link,
        {
          version: 1 as const,
          rawScore: score.personalCommerceScore,
          spreadScore: score.personalCommerceScore,
          buyerIdentityScore: score.buyerScore,
          tasteMatchScore: score.tasteScore,
          categoryQualityScore: score.categoryScore,
          marketOpportunityScore: score.marketScore,
          merchantTrustScore: score.trustScore,
          rankBand: score.expandedConfidence >= 85 ? "top" : score.expandedConfidence >= 70 ? "strong" : "average",
        },
      ])
    ),
    commerceByLink,
  });

  const result = new Map<string, UniversalProductDecision>();

  for (const [link, decision] of preferenceMap) {
    const row = productsByLink.get(link);
    const intel = decision.productIntelligence;
    const commerce = commerceByLink.get(link);
    const personalScore = personalScores.get(link);
    const verdictRow = verdictAuthority.get(link);
    if (!row?.product || !intel || !commerce || !personalScore) {
      result.set(link, decision);
      continue;
    }

    const tasteResult = scorePersonalTaste(row.product, taste, row.searchQuery);
    const buyerScore = computePersonalBuyerProductScore(buyer, row.product, row.searchQuery, trayMedianPrice, trayMinPrice);
    const buyerMatchPct = buyerScore;
    const tasteMatchPct = tasteResult.tasteScore;
    const profileKey = intel.segmentLabel ?? "Product";

    const reasoning = buildBuyerReasoning({
      verdict: verdictRow?.verdict ?? decision.verdict,
      buyer,
      taste,
      tasteScore: tasteResult,
      intelligence: intel,
      commerce,
      personalScore,
      store: metaByLink.get(link)?.store ?? row.product.store,
      categoryLabel: profileKey,
    });

    let next = decision;
    if (verdictRow && verdictRow.verdict !== decision.verdict) {
      next = { ...next, verdict: verdictRow.verdict };
    }

    result.set(
      link,
      applyPersonalCommerceIntelligence(
        next,
        buyer,
        taste,
        personalScore,
        buyerMatchPct,
        tasteMatchPct,
        reasoning
      )
    );
  }

  return result;
}

export function buildPersonalCommerceDisplayCoherenceByLink(
  coherenceByLink: Map<string, CoherentProductDecision>,
  universalByLink: Map<string, UniversalProductDecision>
): Map<string, CoherentProductDecision> {
  const base = buildPreferenceIntelligenceDisplayCoherenceByLink(coherenceByLink, universalByLink);
  const enriched = new Map<string, CoherentProductDecision>();

  for (const [link, coherent] of base) {
    const universal = universalByLink.get(link);
    if (!universal?.productIntelligence?.personalBuyerIdentity) {
      enriched.set(link, universal ? overlayCoherentWithUniversal(coherent, universal) : coherent);
      continue;
    }

    const intel = universal.productIntelligence;
    const briefFields = buildPersonalCommerceBriefFields({
      buyer: intel.personalBuyerIdentity!,
      taste: intel.personalTasteProfile!,
      buyerMatchPct: intel.buyerMatchPct ?? intel.buyerIdentityScore ?? 50,
      tasteMatchPct: intel.tasteMatchPct ?? intel.tasteMatchScore ?? 50,
    });

    const overlaid = overlayCoherentWithUniversal(coherent, universal);
    enriched.set(link, {
      ...overlaid,
      alignmentScore: universal.confidence,
      decisionBrief: enrichDecisionBriefWithPersonalCommerce(overlaid.decisionBrief, briefFields),
    });
  }

  return enriched;
}

export {
  buyerReasoningIsAnalystGrade,
  hasExpandedConfidenceSpread,
  inferPersonalBuyerIdentity,
  inferPersonalTasteProfile,
};
