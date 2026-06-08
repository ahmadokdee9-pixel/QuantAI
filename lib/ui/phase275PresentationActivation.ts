/**
 * Phase 27.5 — Confidence / verdict integrity activation (after Phase 27.4).
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import { resolveTrayAlternativeAuthority } from "@/lib/ui/alternativeAuthority";
import type { ProductTrayMeta } from "@/lib/ui/productDifferentiationEngine";
import { buildUniversalProductDecisionMap } from "@/lib/ui/phase274PresentationActivation";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";
import {
  enforceTrayCompareIntegrity,
  mergeIntegrityIntoUniversalDecision,
  universalFinalDecisionIntegrity,
} from "@/lib/ui/universalFinalDecisionIntegrity";

export function buildIntegrityUniversalProductDecisionMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>
): Map<string, UniversalProductDecision> {
  const base = buildUniversalProductDecisionMap(coherenceByLink, metaByLink);
  const traySize = coherenceByLink.size;

  const preliminary = [...base.entries()].map(([link, decision]) => ({
    link,
    confidenceScore: decision.confidence,
    verdict: decision.verdict,
  }));
  const trayAlt = resolveTrayAlternativeAuthority({ presentations: preliminary });

  const integrityMap = new Map<string, UniversalProductDecision>();
  for (const [link, decision] of base) {
    const coherent = coherenceByLink.get(link)!;
    const meta = metaByLink.get(link)!;
    const integrity = universalFinalDecisionIntegrity({
      decision,
      coherent,
      meta,
      trayAlternativePressure: trayAlt.pressureScore,
      traySize,
    });
    integrityMap.set(link, mergeIntegrityIntoUniversalDecision(decision, integrity));
  }

  return enforceTrayCompareIntegrity(integrityMap, trayAlt.pressureScore);
}
