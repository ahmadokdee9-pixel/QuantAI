/**
 * Phase 37 — Global Commerce Intelligence Engine activation.
 * Chains after Phase 36 — intelligence only, no UI/layout changes.
 */

import { buildDiscountIntelligenceV2 } from "@/lib/intelligence/discountIntelligenceV2Engine";
import { buildGlobalAlternatives } from "@/lib/intelligence/globalAlternativeEngine";
import { computeGlobalBuyOpportunity } from "@/lib/intelligence/globalBuyOpportunityEngine";
import {
  buildGlobalDecisionReasoning,
  globalReasoningIsUnique,
  globalReasoningReferencesContext,
} from "@/lib/intelligence/globalDecisionReasoningEngine";
import { buildGlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";
import { resolveGlobalProductIdentity } from "@/lib/intelligence/globalProductIdentityEngine";
import {
  buildUniversalOfferGraph,
  findEntityForOffer,
} from "@/lib/intelligence/universalOfferGraphEngine";
import { buildUnifiedMarketGroup } from "@/lib/intelligence/unifiedMarketMatching";
import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import { enrichDecisionBriefWithGlobalCommerce } from "@/lib/ui/globalCommerceBriefEnrichment";
import {
  assignGlobalCommerceVerdicts,
  globalCommerceVerdictDistribution,
} from "@/lib/ui/globalCommerceVerdictEngine";
import {
  buildCommerceOpportunityDecisionMap,
  buildCommerceOpportunityDisplayCoherenceByLink,
} from "@/lib/ui/phase36CommerceOpportunityActivation";
import type { ProductTrayMeta } from "@/lib/ui/productDifferentiationEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { overlayCoherentWithUniversal, type UniversalProductDecision } from "@/lib/ui/universalProductDecision";

function clipLine(text: string, max = 200): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function applyGlobalCommerceIntelligence(
  decision: UniversalProductDecision,
  reasoning: ReturnType<typeof buildGlobalDecisionReasoning>
): UniversalProductDecision {
  const intelligence = decision.productIntelligence;
  if (!intelligence) return decision;

  const decisionThesis = clipLine(reasoning.primaryLine);
  const primaryReason = clipLine(reasoning.primaryLine);
  const purchaseReasoning = clipLine(
    [reasoning.whyBuy, reasoning.whyThisPrice, reasoning.whyThisSeller, reasoning.whyNotCompetitor]
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
          label: "Global buy thesis",
          line: reasoning.whyBuy,
        },
        {
          code: decision.reasonAuthority.secondaryReasons[1]?.code ?? ("VALUE" as const),
          label: "Price & seller context",
          line: purchaseReasoning,
        },
      ],
    },
    productIntelligence: {
      ...intelligence,
      globalDecisionReasoning: reasoning,
      commercePriorityLabel: reasoning.commercePriorityLabel,
      commerceOpportunityReasoning: {
        primaryLine: reasoning.primaryLine,
        strongestReason: reasoning.whyBuy,
        weakestReason: reasoning.whyWait,
        discountSituation: intelligence.discountIntelligenceV2?.discountReasoning ?? "",
        buyerIntentLine: reasoning.whyBuy,
        trustLine: reasoning.whyThisSeller,
        analystSummary: reasoning.analystSummary,
      },
      buyerReasoning: {
        primaryLine: reasoning.primaryLine,
        buyerFit: reasoning.whyBuy,
        valueAnalysis: reasoning.whyThisPrice,
        marketPosition: reasoning.whyThisPrice,
        trustAnalysis: reasoning.whyThisSeller,
        tradeoffs: reasoning.whyWait,
        competitorComparison: reasoning.whyNotCompetitor,
        improvementPath: reasoning.whyAvoid,
      },
      alignmentFlags: [
        ...(intelligence.alignmentFlags ?? []),
        "phase37_global_commerce_intelligence",
        `phase37_priority_${reasoning.commercePriorityLabel.replace(/\s+/g, "_").toLowerCase()}`,
        `phase37_price_${intelligence.globalPriceIntelligence?.priceLabel?.replace(/\s+/g, "_").toLowerCase() ?? "fair"}`,
      ].filter((flag, index, list) => list.indexOf(flag) === index),
    },
  };
}

export function buildGlobalCommerceDecisionMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>,
  productsByLink: Map<string, { product: QuantProduct; searchQuery: string }>
): Map<string, UniversalProductDecision> {
  const searchQuery = [...productsByLink.values()][0]?.searchQuery?.trim() ?? "";
  const tray = [...productsByLink.values()].map((row) => row.product);

  const baseMap = buildCommerceOpportunityDecisionMap(coherenceByLink, metaByLink, productsByLink);
  const offerGraph = buildUniversalOfferGraph(tray, searchQuery);
  const marketGroup = buildUnifiedMarketGroup(tray, searchQuery);

  const trayMedianQuality =
    tray.reduce((sum, p) => sum + ((p.rating as number) || 4) * 20, 0) / Math.max(1, tray.length);

  const globalPriceByLink = new Map<string, ReturnType<typeof buildGlobalPriceIntelligence>>();
  const discountV2ByLink = new Map<string, ReturnType<typeof buildDiscountIntelligenceV2>>();
  const alternativesByLink = new Map<string, ReturnType<typeof buildGlobalAlternatives>>();
  const buyOpportunityByLink = new Map<string, ReturnType<typeof computeGlobalBuyOpportunity>>();
  const identityByLink = new Map<string, ReturnType<typeof resolveGlobalProductIdentity>>();

  for (const [link, decision] of baseMap) {
    const row = productsByLink.get(link);
    if (!row?.product || !decision.productIntelligence) continue;

    const marketInsight = marketGroup.byLink.get(link) ?? null;
    const identity = resolveGlobalProductIdentity(row.product, row.searchQuery, trayMedianQuality);
    const globalPrice = buildGlobalPriceIntelligence({
      product: row.product,
      tray,
      marketInsight,
    });
    const discountV2 = buildDiscountIntelligenceV2({
      product: row.product,
      tray,
      phase36Discount: decision.productIntelligence.discountOpportunity,
      globalPrice,
    });
    const alternatives = buildGlobalAlternatives({
      product: row.product,
      tray,
      searchQuery: row.searchQuery,
      marketInsight,
      trayMedianQuality,
    });
    const buyOpportunity = computeGlobalBuyOpportunity({
      product: row.product,
      decision,
      globalPrice,
      discountV2,
      alternatives,
    });

    identityByLink.set(link, identity);
    globalPriceByLink.set(link, globalPrice);
    discountV2ByLink.set(link, discountV2);
    alternativesByLink.set(link, alternatives);
    buyOpportunityByLink.set(link, buyOpportunity);
  }

  const verdictAuthority = assignGlobalCommerceVerdicts({
    decisions: baseMap,
    buyOpportunityByLink,
    globalPriceByLink,
    discountV2ByLink,
    productsByLink,
  });

  const result = new Map<string, UniversalProductDecision>();

  for (const [link, decision] of baseMap) {
    const row = productsByLink.get(link);
    const intel = decision.productIntelligence;
    const verdictRow = verdictAuthority.get(link);
    const identity = identityByLink.get(link);
    const globalPrice = globalPriceByLink.get(link);
    const discountV2 = discountV2ByLink.get(link);
    const alternatives = alternativesByLink.get(link);
    const buyOpportunity = buyOpportunityByLink.get(link);

    if (!row?.product || !intel || !identity || !globalPrice || !discountV2 || !alternatives || !buyOpportunity) {
      result.set(link, decision);
      continue;
    }

    const reasoning = buildGlobalDecisionReasoning({
      verdict: verdictRow?.verdict ?? decision.verdict,
      productTitle: row.product.title,
      store: metaByLink.get(link)?.store ?? row.product.store,
      price: row.product.price,
      link,
      intelligence: intel,
      identity,
      globalPrice,
      discountV2,
      alternatives,
      buyOpportunity,
      commercePriorityLabel: verdictRow?.commercePriorityLabel ?? "COMPARE",
    });

    let next: UniversalProductDecision = {
      ...decision,
      verdict: verdictRow?.verdict ?? decision.verdict,
      confidence: buyOpportunity.buyOpportunityScore,
      productIntelligence: {
        ...intel,
        globalProductIdentity: identity,
        globalPriceIntelligence: globalPrice,
        discountIntelligenceV2: discountV2,
        globalAlternatives: alternatives,
        globalBuyOpportunity: buyOpportunity,
        universalOfferGraph: offerGraph,
        buyOpportunityScore: buyOpportunity.buyOpportunityScore,
        buyEligible: buyOpportunity.buyNowEligible,
      },
    };

    next = applyGlobalCommerceIntelligence(next, reasoning);
    result.set(link, next);
  }

  const leaderLink =
    [...result.entries()]
      .filter(([, d]) => d.verdict === "BUY READY")
      .sort(
        (a, b) =>
          (b[1].productIntelligence?.globalBuyOpportunity?.buyOpportunityScore ?? 0) -
          (a[1].productIntelligence?.globalBuyOpportunity?.buyOpportunityScore ?? 0)
      )[0]?.[0] ??
    result.keys().next().value ??
    null;

  if (leaderLink && result.has(leaderLink)) {
    const leader = result.get(leaderLink)!;
    const entity = findEntityForOffer(offerGraph, leaderLink);
    result.set(leaderLink, {
      ...leader,
      productIntelligence: {
        ...leader.productIntelligence!,
        trayCommerceSummary: {
          ...(leader.productIntelligence?.trayCommerceSummary ?? {
            version: 1 as const,
            bestBuyNowLink: leaderLink,
            bestDiscountLink: leaderLink,
            bestCheaperAlternativeLink: alternativesByLink.get(leaderLink)?.bestSameProductCheaper?.link ?? null,
            bestPremiumLink: null,
            avoidLinks: [],
            shouldBuyNow: true,
            shouldWait: false,
            headline: "Global buy opportunity identified.",
          }),
          headline: `Global commerce: ${entity?.offerCount ?? 1} offers tracked across ${offerGraph.storeCount} merchants.`,
        },
      },
    });
  }

  return result;
}

export function buildGlobalCommerceDisplayCoherenceByLink(
  coherenceByLink: Map<string, CoherentProductDecision>,
  universalByLink: Map<string, UniversalProductDecision>
): Map<string, CoherentProductDecision> {
  const base = buildCommerceOpportunityDisplayCoherenceByLink(coherenceByLink, universalByLink);
  const enriched = new Map<string, CoherentProductDecision>();

  const leader =
    [...universalByLink.values()]
      .filter((d) => d.verdict === "BUY READY")
      .sort(
        (a, b) =>
          (b.productIntelligence?.globalBuyOpportunity?.buyOpportunityScore ?? 0) -
          (a.productIntelligence?.globalBuyOpportunity?.buyOpportunityScore ?? 0)
      )[0] ?? universalByLink.values().next().value;

  const offerGraph = leader?.productIntelligence?.universalOfferGraph;
  const priorityLabel = leader?.productIntelligence?.commercePriorityLabel ?? "COMPARE";

  for (const [link, coherent] of base) {
    const universal = universalByLink.get(link);
    const overlaid = universal ? overlayCoherentWithUniversal(coherent, universal) : coherent;

    enriched.set(link, {
      ...overlaid,
      decisionBrief:
        offerGraph && leader
          ? enrichDecisionBriefWithGlobalCommerce(overlaid.decisionBrief, {
              offerGraph,
              commercePriorityLabel: priorityLabel,
              headline:
                leader.productIntelligence?.trayCommerceSummary?.headline ??
                "Global commerce decision ready.",
              shouldBuyNow: (leader.productIntelligence?.globalBuyOpportunity?.buyNowEligible ?? false) ||
                leader.verdict === "BUY READY",
            })
          : overlaid.decisionBrief,
    });
  }

  return enriched;
}

export {
  assignGlobalCommerceVerdicts,
  buildUniversalOfferGraph,
  globalCommerceVerdictDistribution,
  globalReasoningIsUnique,
  globalReasoningReferencesContext,
};
