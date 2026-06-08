/**
 * Phase 27.4 — Universal intelligence consistency activation.
 * One product decision object for cards, drawer, expand, brief, and tray voting.
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import type { UnifiedTrayVerdict } from "@/lib/ui/unifiedVerdictAuthority";
import { resolveUnifiedTrayVerdict } from "@/lib/ui/unifiedVerdictAuthority";
import {
  resolveTrayAlternativeAuthority,
  type ActivatedAlternativeAuthority,
} from "@/lib/ui/alternativeAuthority";
import {
  buildPhase273ProductMap,
  type Phase273TrayPresentation,
} from "@/lib/ui/phase273PresentationActivation";
import type { ProductTrayMeta } from "@/lib/ui/productDifferentiationEngine";
import {
  overlayCoherentWithUniversal,
  universalFromPhase273,
  type UniversalProductDecision,
} from "@/lib/ui/universalProductDecision";

export type UniversalTrayPresentation = Phase273TrayPresentation;

export function buildUniversalProductDecisionMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>
): Map<string, UniversalProductDecision> {
  const phase273 = buildPhase273ProductMap(coherenceByLink, metaByLink);
  const map = new Map<string, UniversalProductDecision>();
  for (const [link, presentation] of phase273) {
    map.set(link, universalFromPhase273(link, presentation));
  }
  return map;
}

export function buildDisplayCoherenceByLink(
  coherenceByLink: Map<string, CoherentProductDecision>,
  universalByLink: Map<string, UniversalProductDecision>
): Map<string, CoherentProductDecision> {
  const map = new Map<string, CoherentProductDecision>();
  for (const [link, coherent] of coherenceByLink) {
    const universal = universalByLink.get(link);
    map.set(link, universal ? overlayCoherentWithUniversal(coherent, universal) : coherent);
  }
  return map;
}

/** Tray verdict from the same display coherence objects shown on cards. */
export function resolveUnifiedTrayVerdictFromUniversal(
  displayCoherenceByLink: Map<string, CoherentProductDecision>
): UnifiedTrayVerdict {
  return resolveUnifiedTrayVerdict(displayCoherenceByLink.values());
}

export function activateUniversalTrayPresentation(
  universalByLink: Map<string, UniversalProductDecision>,
  unifiedTrayVerdict: UnifiedTrayVerdict
): UniversalTrayPresentation {
  const ranked = [...universalByLink.entries()].map(([link, row]) => ({
    link,
    confidenceScore: row.confidence,
    verdict: row.verdict,
  }));
  const alternativeAuthority: ActivatedAlternativeAuthority = resolveTrayAlternativeAuthority({
    presentations: ranked,
  });
  const trayConfidence = ranked.length > 0 ? Math.max(...ranked.map((row) => row.confidenceScore)) : 0;
  const winningReasonLine =
    unifiedTrayVerdict.reasonAuthority?.primaryReason.line || unifiedTrayVerdict.winningReason;

  return {
    alternativeAuthority,
    trayConfidence,
    winningReasonLine,
    alternativePressureLine: `${alternativeAuthority.pressureLevel === "high" ? "High" : alternativeAuthority.pressureLevel === "moderate" ? "Moderate" : "Low"} — ${alternativeAuthority.pressureLine}`,
  };
}
