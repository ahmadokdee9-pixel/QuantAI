/**
 * Phase 29 — Buy Opportunity activation (after Phase 28 product intelligence).
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import {
  computeBuyOpportunityScore,
  isCoreProductListing,
  resolveBuyOpportunityAuthority,
} from "@/lib/ui/buyOpportunityEngine";
import { buildUniversalProductIntelligenceMap } from "@/lib/ui/phase28ProductIntelligenceActivation";
import type { ProductTrayMeta } from "@/lib/ui/productDifferentiationEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";
import { buildSurfaceSummaryLines } from "@/lib/ui/verdictReasonAuthority";

function applyBuyOpportunityToDecision(
  decision: UniversalProductDecision,
  coherent: CoherentProductDecision,
  store: string,
  productTitle: string,
  trayBuyLeader: boolean
): UniversalProductDecision {
  const intelligence = decision.productIntelligence;
  if (!intelligence) return decision;

  const buy = resolveBuyOpportunityAuthority({
    intelligence,
    coherent,
    store,
    priorVerdict: decision.verdict,
    productTitle,
    trayBuyLeader,
  });

  if (!buy.buyEligible) {
    return {
      ...decision,
      productIntelligence: {
        ...intelligence,
        buyOpportunityScore: buy.buyOpportunityScore,
        buyEligible: false,
      },
    };
  }

  const reasonAuthority = {
    ...decision.reasonAuthority,
    verdict: buy.finalVerdict,
    primaryReason: {
      code: "QUALITY" as const,
      label: intelligence.segmentLabel || "Buy opportunity",
      line: buy.primaryReason,
    },
    secondaryReasons: [
      {
        code: "FIT" as const,
        label: "Buy opportunity",
        line: buy.secondaryReason,
      },
    ],
  };

  return {
    ...decision,
    verdict: buy.finalVerdict,
    reasonLine: buy.primaryReason,
    primaryReason: buy.primaryReason,
    secondaryReason: buy.secondaryReason,
    reasonAuthority,
    summaryLines: buildSurfaceSummaryLines(reasonAuthority),
    confidenceReason: buy.secondaryReason,
    productIntelligence: {
      ...intelligence,
      finalVerdict: buy.finalVerdict,
      buyOpportunityScore: buy.buyOpportunityScore,
      buyEligible: true,
      buyOpportunityFlags: buy.buyOpportunityFlags,
    },
  };
}

function resolveTrayBuyLeaderLink(
  intelligenceMap: Map<string, UniversalProductDecision>,
  productsByLink: Map<string, { product: QuantProduct; searchQuery: string }>
): string | null {
  let bestLink: string | null = null;
  let bestScore = -Infinity;

  for (const [link, decision] of intelligenceMap) {
    const intel = decision.productIntelligence;
    const title = productsByLink.get(link)?.product.title ?? "";
    if (!intel) continue;
    if (!isCoreProductListing(title, intel.segment)) continue;
    if (
      intel.productQualityScore < 58 ||
      intel.categoryFitScore < 54 ||
      intel.valueScore < 52 ||
      intel.trustScore < 50
    ) {
      continue;
    }
    const score = computeBuyOpportunityScore(intel);
    if (score > bestScore) {
      bestScore = score;
      bestLink = link;
    }
  }

  return bestScore >= 80 ? bestLink : null;
}

export function buildBuyOpportunityDecisionMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>,
  productsByLink: Map<string, { product: QuantProduct; searchQuery: string }>
): Map<string, UniversalProductDecision> {
  const intelligenceMap = buildUniversalProductIntelligenceMap(
    coherenceByLink,
    metaByLink,
    productsByLink
  );
  const trayBuyLeaderLink = resolveTrayBuyLeaderLink(intelligenceMap, productsByLink);
  const enriched = new Map<string, UniversalProductDecision>();

  for (const [link, decision] of intelligenceMap) {
    const coherent = coherenceByLink.get(link);
    const meta = metaByLink.get(link);
    const productRow = productsByLink.get(link);
    const store = meta?.store ?? "Retailer";
    const title = productRow?.product.title ?? "";
    enriched.set(
      link,
      coherent
        ? applyBuyOpportunityToDecision(
            decision,
            coherent,
            store,
            title,
            link === trayBuyLeaderLink
          )
        : decision
    );
  }

  return enriched;
}
