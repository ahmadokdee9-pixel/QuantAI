/**
 * Phase 30 — Decision alignment activation (after Phase 29 buy opportunity).
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import { assignTrayVerdictAuthority, resolveDecisionAlignment } from "@/lib/ui/decisionAlignmentEngine";
import { buildBuyOpportunityDecisionMap } from "@/lib/ui/phase29BuyOpportunityActivation";
import type { ProductTrayMeta } from "@/lib/ui/productDifferentiationEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";
import { buildDisplayCoherenceByLink } from "@/lib/ui/phase274PresentationActivation";

export function buildAlignedDecisionMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>,
  productsByLink: Map<string, { product: QuantProduct; searchQuery: string }>
): Map<string, UniversalProductDecision> {
  const buyMap = buildBuyOpportunityDecisionMap(coherenceByLink, metaByLink, productsByLink);
  const trayAuthority = assignTrayVerdictAuthority(buyMap);
  const aligned = new Map<string, UniversalProductDecision>();

  for (const [link, decision] of buyMap) {
    const store = metaByLink.get(link)?.store ?? "Retailer";
    aligned.set(link, resolveDecisionAlignment(decision, store, trayAuthority.get(link)));
  }

  return aligned;
}

export function buildAlignedDisplayCoherenceByLink(
  coherenceByLink: Map<string, CoherentProductDecision>,
  alignedByLink: Map<string, UniversalProductDecision>
) {
  return buildDisplayCoherenceByLink(coherenceByLink, alignedByLink);
}
