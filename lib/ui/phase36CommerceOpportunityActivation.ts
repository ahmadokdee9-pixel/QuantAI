/**
 * Phase 36 — Commerce Opportunity + Discount + BUY-READY Recovery activation.
 * Chains after Phase 35 — intelligence only, no UI/layout changes.
 */

import { buildDiscountOpportunityInsight } from "@/lib/intelligence/discountOpportunityEngine";
import {
  buildCommerceOpportunityReasoning,
  reasoningAvoidsBannedPhrases,
  reasoningIncludesDiscountContext,
} from "@/lib/intelligence/commerceOpportunityReasoningEngine";
import type { CommerceIntelligenceAuthority } from "@/lib/intelligence/commerceIntelligenceAuthorityEngine";
import { findEquivalentMatches } from "@/lib/intelligence/equivalentProductMatchingEngine";
import type { PersonalCommerceScore } from "@/lib/intelligence/personalCommerceScoreEngine";
import { enrichTrayImageReliability, trayImageCoverage } from "@/lib/intelligence/imageReliabilityEngine";
import { buildTrayCommerceSummary } from "@/lib/intelligence/trayVerdictSummaryEngine";
import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import {
  assignCommerceOpportunityVerdicts,
  commerceOpportunityVerdictDistribution,
  hasHealthyCommerceVerdictDistribution,
} from "@/lib/ui/commerceOpportunityVerdictEngine";
import { enrichDecisionBriefWithCommerceOpportunity } from "@/lib/ui/commerceOpportunityBriefEnrichment";
import {
  buildPersonalCommerceDecisionMap,
  buildPersonalCommerceDisplayCoherenceByLink,
} from "@/lib/ui/phase35PersonalCommerceActivation";
import type { ProductTrayMeta } from "@/lib/ui/productDifferentiationEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { overlayCoherentWithUniversal, type UniversalProductDecision } from "@/lib/ui/universalProductDecision";

function clipLine(text: string, max = 180): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function applyCommerceOpportunityIntelligence(
  decision: UniversalProductDecision,
  reasoning: ReturnType<typeof buildCommerceOpportunityReasoning>
): UniversalProductDecision {
  const intelligence = decision.productIntelligence;
  if (!intelligence) return decision;

  const decisionThesis = clipLine(reasoning.primaryLine);
  const primaryReason = clipLine(reasoning.primaryLine);
  const purchaseReasoning = clipLine(
    [reasoning.strongestReason, reasoning.weakestReason, reasoning.discountSituation, reasoning.trustLine]
      .filter(Boolean)
      .join(" ")
  );

  return {
    ...decision,
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
          label: "Commerce opportunity",
          line: decisionThesis,
        },
        {
          code: decision.reasonAuthority.secondaryReasons[1]?.code ?? ("VALUE" as const),
          label: "Price & discount context",
          line: purchaseReasoning,
        },
      ],
    },
    productIntelligence: {
      ...intelligence,
      commerceOpportunityReasoning: reasoning,
      buyerReasoning: {
        primaryLine: reasoning.primaryLine,
        buyerFit: reasoning.buyerIntentLine,
        valueAnalysis: reasoning.discountSituation,
        marketPosition: reasoning.discountSituation,
        trustAnalysis: reasoning.trustLine,
        tradeoffs: reasoning.weakestReason,
        competitorComparison: reasoning.strongestReason,
        improvementPath: reasoning.weakestReason,
      },
      alignmentFlags: [
        ...(intelligence.alignmentFlags ?? []),
        "phase36_commerce_opportunity_intelligence",
        `phase36_price_${intelligence.discountOpportunity?.priceOpportunityLabel?.replace(/\s+/g, "_").toLowerCase() ?? "fair"}`,
      ].filter((flag, index, list) => list.indexOf(flag) === index),
    },
  };
}

export function buildCommerceOpportunityDecisionMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>,
  productsByLink: Map<string, { product: QuantProduct; searchQuery: string }>
): Map<string, UniversalProductDecision> {
  const searchQuery = [...productsByLink.values()][0]?.searchQuery?.trim() ?? "";
  const rawTray = [...productsByLink.values()].map((row) => row.product);
  const enrichedTray = enrichTrayImageReliability(rawTray, searchQuery);

  const enrichedProductsByLink = new Map<string, { product: QuantProduct; searchQuery: string }>();
  for (const [link, row] of productsByLink) {
    const enrichedProduct = enrichedTray.find((p) => p.link === link) ?? row.product;
    enrichedProductsByLink.set(link, { product: enrichedProduct, searchQuery: row.searchQuery });
  }

  const baseMap = buildPersonalCommerceDecisionMap(coherenceByLink, metaByLink, enrichedProductsByLink);

  const discountByLink = new Map<
    string,
    ReturnType<typeof buildDiscountOpportunityInsight>
  >();
  const equivalentByLink = new Map<
    string,
    ReturnType<typeof findEquivalentMatches>
  >();
  const commerceByLink = new Map<string, CommerceIntelligenceAuthority>();
  const personalByLink = new Map<string, PersonalCommerceScore>();
  const pricesByLink = new Map<string, number>();

  for (const [link, decision] of baseMap) {
    const row = enrichedProductsByLink.get(link);
    const intel = decision.productIntelligence;
    if (!row?.product || !intel) continue;

    const equivalent = findEquivalentMatches(row.product, enrichedTray, row.searchQuery);
    const discount = buildDiscountOpportunityInsight({
      product: row.product,
      tray: enrichedTray,
      equivalent,
    });

    equivalentByLink.set(link, equivalent);
    discountByLink.set(link, discount);
    pricesByLink.set(link, row.product.price);

    if (intel.personalCommerceScore) personalByLink.set(link, intel.personalCommerceScore);

    commerceByLink.set(link, {
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
    });
  }

  const verdictAuthority = assignCommerceOpportunityVerdicts({
    decisions: baseMap,
    personalByLink,
    commerceByLink,
    discountByLink,
    productsByLink: enrichedProductsByLink,
  });

  const result = new Map<string, UniversalProductDecision>();

  for (const [link, decision] of baseMap) {
    const row = enrichedProductsByLink.get(link);
    const intel = decision.productIntelligence;
    const verdictRow = verdictAuthority.get(link);
    const discount = discountByLink.get(link);
    const equivalent = equivalentByLink.get(link);
    if (!row?.product || !intel || !discount || !equivalent) {
      result.set(link, decision);
      continue;
    }

    const buyer = intel.personalBuyerIdentity;
    const taste = intel.personalTasteProfile;
    if (!buyer || !taste) {
      result.set(link, decision);
      continue;
    }

    const reasoning = buildCommerceOpportunityReasoning({
      verdict: verdictRow?.verdict ?? decision.verdict,
      buyer,
      taste,
      intelligence: intel,
      discount,
      equivalent,
      store: metaByLink.get(link)?.store ?? row.product.store,
      categoryLabel: intel.segmentLabel ?? "Product",
      buyRecoveryNote: verdictRow?.buyRecoveryMessage,
    });

    let next: UniversalProductDecision = {
      ...decision,
      verdict: verdictRow?.verdict ?? decision.verdict,
      productIntelligence: {
        ...intel,
        discountOpportunity: discount,
        equivalentMatches: equivalent,
        imageConfidence: row.product.image_confidence,
      },
    };

    next = applyCommerceOpportunityIntelligence(next, reasoning);
    result.set(link, next);
  }

  const traySummary = buildTrayCommerceSummary({
    decisions: result,
    discountByLink,
    pricesByLink,
  });

  const leaderLink = traySummary.bestBuyNowLink ?? result.keys().next().value ?? null;
  if (leaderLink && result.has(leaderLink)) {
    const leader = result.get(leaderLink)!;
    result.set(leaderLink, {
      ...leader,
      productIntelligence: {
        ...leader.productIntelligence!,
        trayCommerceSummary: traySummary,
      },
    });
  }

  return result;
}

export function buildCommerceOpportunityDisplayCoherenceByLink(
  coherenceByLink: Map<string, CoherentProductDecision>,
  universalByLink: Map<string, UniversalProductDecision>
): Map<string, CoherentProductDecision> {
  const base = buildPersonalCommerceDisplayCoherenceByLink(coherenceByLink, universalByLink);
  const enriched = new Map<string, CoherentProductDecision>();

  const traySummary =
    [...universalByLink.values()]
      .map((d) => d.productIntelligence?.trayCommerceSummary)
      .find(Boolean) ?? null;

  for (const [link, coherent] of base) {
    const universal = universalByLink.get(link);
    const overlaid = universal ? overlayCoherentWithUniversal(coherent, universal) : coherent;

    enriched.set(link, {
      ...overlaid,
      decisionBrief: traySummary
        ? enrichDecisionBriefWithCommerceOpportunity(overlaid.decisionBrief, traySummary)
        : overlaid.decisionBrief,
    });
  }

  return enriched;
}

export {
  assignCommerceOpportunityVerdicts,
  buildDiscountOpportunityInsight,
  buildTrayCommerceSummary,
  commerceOpportunityVerdictDistribution,
  findEquivalentMatches,
  hasHealthyCommerceVerdictDistribution,
  reasoningAvoidsBannedPhrases,
  reasoningIncludesDiscountContext,
  trayImageCoverage,
};
