/**
 * Phase 33 — Commerce Intelligence Authority activation.
 * Chains after Phase 32 category reasoning — intelligence only, no UI changes.
 */

import {
  buildCommerceIntelligenceAuthority,
  commerceReasoningReferencesMarket,
  type CommerceIntelligenceAuthority,
} from "@/lib/intelligence/commerceIntelligenceAuthorityEngine";
import { detectIntentProfile, type IntentProfile } from "@/lib/intelligence/intentUnderstandingEngine";
import { enrichProductImageReliability, enrichTrayImageReliability, trayImageCoverage } from "@/lib/intelligence/imageReliabilityEngine";
import { getCategoryProfile, resolveCategoryProfileKey } from "@/lib/intelligence/categoryProfileRegistry";
import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import { assignCommerceAwareTrayVerdictAuthority } from "@/lib/ui/marketOpportunityBalancingEngine";
import {
  buildCategoryReasoningDecisionMap,
  buildCategoryReasoningDisplayCoherenceByLink,
} from "@/lib/ui/phase32CategoryReasoningActivation";
import type { ProductTrayMeta } from "@/lib/ui/productDifferentiationEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";

function clipLine(text: string, max = 160): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function applyCommerceIntelligenceAuthority(
  decision: UniversalProductDecision,
  product: QuantProduct,
  tray: QuantProduct[],
  searchQuery: string,
  intentProfile: IntentProfile,
  authority?: CommerceIntelligenceAuthority
): UniversalProductDecision {
  const intelligence = decision.productIntelligence;
  if (!intelligence || !authority) return decision;

  const reasoning = authority.commerceReasoning;
  const profileKey = resolveCategoryProfileKey(intelligence.segment, product.title, searchQuery);
  const profile = getCategoryProfile(profileKey);

  const marketLine =
    authority.priceAdvantage > 0.05
      ? `${Math.round(authority.priceAdvantage * 100)}% below market average in this tray.`
      : authority.dealRarity >= 75
        ? "Offer ranks among the strongest currently available in this tray."
        : "";

  const decisionThesis = clipLine(
    [
      reasoning.whyWon,
      marketLine,
      profile.reasoningFocus[0] ? `Category focus: ${profile.reasoningFocus[0]}.` : "",
    ]
      .filter(Boolean)
      .join(" ")
  );

  const primaryReason = clipLine(
    verdictPrimaryReason(decision.verdict, authority, product.store, profile.label)
  );

  const purchaseReasoning = clipLine(
    [reasoning.competitorEdge, reasoning.improvementPath].filter(Boolean).join(" ")
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
          label: "Commerce thesis",
          line: decisionThesis,
        },
        {
          code: decision.reasonAuthority.secondaryReasons[1]?.code ?? ("VALUE" as const),
          label: "Market reasoning",
          line: purchaseReasoning,
        },
      ],
    },
    productIntelligence: {
      ...intelligence,
      marketOpportunityScore: authority.marketOpportunityScore,
      marketValueScore: authority.marketValueScore,
      merchantTrustScore: authority.merchantTrustScore,
      marketAveragePrice: authority.marketAveragePrice,
      priceAdvantage: authority.priceAdvantage,
      dealStrength: authority.dealStrength,
      dealRarity: authority.dealRarity,
      valueDelta: authority.valueDelta,
      intentProfile,
      commerceReasoning: authority.commerceReasoning,
      alignmentFlags: [
        ...(intelligence.alignmentFlags ?? []),
        "phase33_commerce_intelligence_authority",
        `phase33_retrieval_${intentProfile.retrievalStrategy}`,
        `phase33_ranking_${intentProfile.rankingStrategy}`,
        `phase33_profile_${profileKey}`,
      ].filter((flag, index, list) => list.indexOf(flag) === index),
    },
  };
}

function verdictPrimaryReason(
  verdict: UniversalProductDecision["verdict"],
  authority: CommerceIntelligenceAuthority,
  store: string,
  categoryLabel: string
): string {
  if (verdict === "BUY READY") {
    return clipLine(
      `Best available purchase opportunity now — strong ${categoryLabel.toLowerCase()} fit, favorable price position, and trusted ${store} fulfillment.`
    );
  }
  if (verdict === "COMPARE") {
    return clipLine(
      `Strong ${categoryLabel.toLowerCase()} option but challenged by rivals on market opportunity and pricing pressure.`
    );
  }
  if (verdict === "WAIT") {
    return clipLine(
      `Weak current opportunity — wait for better pricing or stronger merchant trust before committing.`
    );
  }
  return clipLine(
    `Poor opportunity — low market value and merchant trust (${authority.merchantTrustScore}/100) outweigh category strengths.`
  );
}

export function buildCommerceIntelligenceDecisionMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>,
  productsByLink: Map<string, { product: QuantProduct; searchQuery: string }>
): Map<string, UniversalProductDecision> {
  const enrichedProductsByLink = new Map<string, { product: QuantProduct; searchQuery: string }>();
  const rawTray = [...productsByLink.values()].map((row) => row.product);
  const searchQuerySeed =
    [...productsByLink.values()][0]?.searchQuery?.trim() ?? "";
  const enrichedTray = enrichTrayImageReliability(rawTray, searchQuerySeed);

  for (const [link, row] of productsByLink) {
    const enriched = enrichedTray.find((p) => p.link === link) ?? row.product;
    enrichedProductsByLink.set(link, { product: enriched, searchQuery: row.searchQuery });
  }

  const searchQuery =
    [...enrichedProductsByLink.values()][0]?.searchQuery?.trim() ??
    searchQuerySeed;
  const intentProfile = detectIntentProfile(searchQuery);

  const categoryMap = buildCategoryReasoningDecisionMap(
    coherenceByLink,
    metaByLink,
    enrichedProductsByLink
  );

  const authorityByLink = new Map<string, CommerceIntelligenceAuthority>();
  for (const [link, decision] of categoryMap) {
    const row = enrichedProductsByLink.get(link);
    if (!row?.product || !decision.productIntelligence) continue;
    authorityByLink.set(
      link,
      buildCommerceIntelligenceAuthority({
        product: row.product,
        tray: enrichedTray,
        searchQuery: row.searchQuery,
        intentProfile,
        intelligence: decision.productIntelligence,
        verdict: decision.verdict,
        store: metaByLink.get(link)?.store ?? row.product.store,
      })
    );
  }

  const trayAuthority = assignCommerceAwareTrayVerdictAuthority(categoryMap, authorityByLink);
  const result = new Map<string, UniversalProductDecision>();

  for (const [link, decision] of categoryMap) {
    const row = enrichedProductsByLink.get(link);
    const authority = authorityByLink.get(link);
    const trayRow = trayAuthority.get(link);

    let next = decision;
    if (trayRow && trayRow.verdict !== decision.verdict) {
      next = { ...next, verdict: trayRow.verdict };
    }

    next = applyCommerceIntelligenceAuthority(
      next,
      row?.product ?? ({ title: "", store: "", price: 0, link } as QuantProduct),
      enrichedTray,
      row?.searchQuery ?? searchQuery,
      intentProfile,
      authority
    );

    result.set(link, next);
  }

  return result;
}

export {
  buildCategoryReasoningDisplayCoherenceByLink as buildCommerceIntelligenceDisplayCoherenceByLink,
  commerceReasoningReferencesMarket,
  detectIntentProfile,
  trayImageCoverage,
};
