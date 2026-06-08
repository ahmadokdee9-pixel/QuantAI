/**
 * Phase 31 — Decision brief authority activation (after Phase 30 alignment).
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import { assignTrayVerdictAuthority, standardizeCategoryDimensions } from "@/lib/ui/decisionAlignmentEngine";
import { resolveDecisionBriefAuthority } from "@/lib/ui/decisionBriefAuthorityEngine";
import {
  buildAlignedDecisionMap,
  buildAlignedDisplayCoherenceByLink,
} from "@/lib/ui/phase30DecisionAlignmentActivation";
import type { ProductTrayMeta } from "@/lib/ui/productDifferentiationEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";

function applyDecisionBriefAuthority(
  decision: UniversalProductDecision,
  store: string,
  authority?: import("@/lib/ui/decisionAlignmentEngine").TrayVerdictAuthorityRow
): UniversalProductDecision {
  const intelligence = decision.productIntelligence;
  if (!intelligence) return decision;

  const dimensions = standardizeCategoryDimensions(
    intelligence.segment,
    intelligence.dimensions,
    intelligence
  );

  const brief = resolveDecisionBriefAuthority(
    decision.verdict,
    dimensions,
    store,
    intelligence,
    authority
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
        label: "Purchase reasoning",
        line: brief.purchaseReasoning,
      },
    ],
  };

  return {
    ...decision,
    decisionThesis: brief.decisionThesis,
    reasonLine: brief.primaryReason,
    primaryReason: brief.primaryReason,
    secondaryReason: brief.purchaseReasoning,
    summaryLines: [brief.decisionThesis, brief.primaryReason],
    reasonAuthority,
    productIntelligence: {
      ...intelligence,
      dimensions,
      alignmentFlags: [
        ...(intelligence.alignmentFlags ?? []),
        "phase31_decision_brief_authority",
      ].filter((flag, index, list) => list.indexOf(flag) === index),
    },
  };
}

export function buildBriefAuthorityDecisionMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>,
  productsByLink: Map<string, { product: QuantProduct; searchQuery: string }>
): Map<string, UniversalProductDecision> {
  const aligned = buildAlignedDecisionMap(coherenceByLink, metaByLink, productsByLink);
  const trayAuthority = assignTrayVerdictAuthority(aligned);
  const briefMap = new Map<string, UniversalProductDecision>();

  for (const [link, decision] of aligned) {
    const store = metaByLink.get(link)?.store ?? "Retailer";
    briefMap.set(link, applyDecisionBriefAuthority(decision, store, trayAuthority.get(link)));
  }

  return briefMap;
}

export { buildAlignedDisplayCoherenceByLink as buildBriefAuthorityDisplayCoherenceByLink };
