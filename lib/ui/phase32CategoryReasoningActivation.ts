/**
 * Phase 32 — Category reasoning authority activation (after Phase 31 brief authority).
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import { assignTrayVerdictAuthority, standardizeCategoryDimensions } from "@/lib/ui/decisionAlignmentEngine";
import {
  explanationMatchesCategoryProfile,
  resolveCategoryDecisionBriefAuthority,
  resolveCategoryReasoningProfile,
} from "@/lib/ui/categoryReasoningAuthorityEngine";
import {
  buildBriefAuthorityDecisionMap,
  buildBriefAuthorityDisplayCoherenceByLink,
} from "@/lib/ui/phase31DecisionBriefActivation";
import type { ProductTrayMeta } from "@/lib/ui/productDifferentiationEngine";
import type { TrayVerdictAuthorityRow } from "@/lib/ui/marketOpportunityBalancingEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";

function applyCategoryReasoningAuthority(
  decision: UniversalProductDecision,
  store: string,
  productTitle: string,
  searchQuery: string,
  authority?: TrayVerdictAuthorityRow
): UniversalProductDecision {
  const intelligence = decision.productIntelligence;
  if (!intelligence) return decision;

  const verdict = authority?.verdict ?? decision.verdict;
  const decisionWithVerdict =
    verdict === decision.verdict ? decision : { ...decision, verdict };

  const dimensions = standardizeCategoryDimensions(
    intelligence.segment,
    intelligence.dimensions,
    intelligence
  );
  const profile = resolveCategoryReasoningProfile(
    intelligence.segment,
    productTitle,
    searchQuery
  );
  const brief = resolveCategoryDecisionBriefAuthority(
    verdict,
    dimensions,
    store,
    intelligence,
    profile,
    authority,
    productTitle,
    searchQuery
  );

  const reasonAuthority = {
    ...decision.reasonAuthority,
    primaryReason: {
      ...decision.reasonAuthority.primaryReason,
      line: brief.primaryReason,
    },
    secondaryReasons: [
      {
        code: decision.reasonAuthority.secondaryReasons[0]?.code ?? ("FIT" as const),
        label: "Decision thesis",
        line: brief.decisionThesis,
      },
      {
        code: decision.reasonAuthority.secondaryReasons[0]?.code ?? ("QUALITY" as const),
        label: "Category purchase reasoning",
        line: brief.purchaseReasoning,
      },
    ],
  };

  return {
    ...decisionWithVerdict,
    verdict,
    decisionThesis: brief.decisionThesis,
    reasonLine: brief.primaryReason,
    primaryReason: brief.primaryReason,
    secondaryReason: brief.purchaseReasoning,
    summaryLines: [brief.decisionThesis, brief.primaryReason],
    reasonAuthority,
    productIntelligence: {
      ...intelligence,
      dimensions,
      finalVerdict: verdict,
      alignmentFlags: [
        ...(intelligence.alignmentFlags ?? []),
        "phase32_category_reasoning_authority",
        "phase325_market_opportunity_balanced",
        `phase32_profile_${profile}`,
        authority?.marketRole ? `phase325_role_${authority.marketRole}` : "phase325_role_balanced",
      ].filter((flag, index, list) => list.indexOf(flag) === index),
    },
  };
}

export function buildCategoryReasoningDecisionMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>,
  productsByLink: Map<string, { product: QuantProduct; searchQuery: string }>
): Map<string, UniversalProductDecision> {
  const briefMap = buildBriefAuthorityDecisionMap(coherenceByLink, metaByLink, productsByLink);
  const trayAuthority = assignTrayVerdictAuthority(briefMap);
  const enriched = new Map<string, UniversalProductDecision>();

  for (const [link, decision] of briefMap) {
    const store = metaByLink.get(link)?.store ?? "Retailer";
    const productRow = productsByLink.get(link);
    const authority = trayAuthority.get(link);
    enriched.set(
      link,
      applyCategoryReasoningAuthority(
        decision,
        store,
        productRow?.product.title ?? "",
        productRow?.searchQuery ?? "",
        authority
      )
    );
  }

  return enriched;
}

export { buildBriefAuthorityDisplayCoherenceByLink as buildCategoryReasoningDisplayCoherenceByLink };
export { explanationMatchesCategoryProfile, resolveCategoryReasoningProfile };
