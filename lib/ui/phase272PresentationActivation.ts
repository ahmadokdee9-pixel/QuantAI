/**
 * Phase 27.2 — Compare dominance elimination presentation overlay.
 * Extends Phase 27.1 without modifying frozen 27.1 authority modules.
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { UnifiedTrayVerdict } from "@/lib/ui/unifiedVerdictAuthority";
import { resolveUnifiedTrayVerdict } from "@/lib/ui/unifiedVerdictAuthority";
import { resolveConfidenceAuthority } from "@/lib/ui/confidenceAuthority";
import {
  resolveTrayAlternativeAuthority,
  type ActivatedAlternativeAuthority,
} from "@/lib/ui/alternativeAuthority";
import { resolveConfidenceSpread } from "@/lib/ui/confidenceSpreadEngine";
import { filterChipsForPhase270Presentation } from "@/lib/ui/phase270PresentationActivation";
import {
  buildSurfaceSummaryLines,
  resolveProductReasonAuthority,
} from "@/lib/ui/verdictReasonAuthority";
import {
  buildPhase271ProductMap,
  type Phase271ProductPresentation,
  type Phase271TrayPresentation,
} from "@/lib/ui/phase271PresentationActivation";
import {
  balanceTrayVerdictDistribution,
  resolveCompareDominanceVerdict,
  type CompareTraySignals,
} from "@/lib/ui/compareDominanceAuthority";

export type Phase272ProductPresentation = Phase271ProductPresentation;
export type Phase272TrayPresentation = Phase271TrayPresentation;

function effectiveTrust(coherent: CoherentProductDecision): number {
  const { trustRisk } = coherent;
  if (Number.isFinite(trustRisk.trustScore) && trustRisk.trustScore > 0) {
    return trustRisk.trustScore;
  }
  const risk = Number.isFinite(trustRisk.riskScore) ? trustRisk.riskScore : 50;
  return Math.max(0, Math.min(100, 100 - risk));
}

function rebuildPresentation(
  coherent: CoherentProductDecision,
  verdict: PrimaryVerdict,
  reason: string,
  spreadKey: string,
  alternativePressureScore: number
): Phase272ProductPresentation {
  const preliminaryConfidence = resolveConfidenceAuthority({
    verdict: coherent.verdict,
    intentIntelligence: coherent.intentIntelligence,
    trustRisk: coherent.trustRisk,
    discountTruth: coherent.discountTruth,
    priceTarget: coherent.priceTarget,
    buyWait: coherent.buyWait,
    categoryIntelligence: coherent.categoryIntelligence,
    alternativeAdvantage: coherent.alternativeAdvantage,
    alternativePressureScore,
  });

  const spread = resolveConfidenceSpread({
    verdict,
    factors: preliminaryConfidence.factors,
    spreadKey,
    alternativePressureScore,
  });

  const reasonAuthority = resolveProductReasonAuthority({
    verdict,
    alignmentScore: spread.confidenceScore,
    isLeadProduct: coherent.isLeadProduct,
    rankingRationaleLine: coherent.rankingRationaleLine,
    discountTruth: coherent.discountTruth,
    buyWait: coherent.buyWait,
    priceTarget: coherent.priceTarget,
    alternativeAdvantage: coherent.alternativeAdvantage,
    categoryIntelligence: coherent.categoryIntelligence,
    intentIntelligence: coherent.intentIntelligence,
    trustRisk: coherent.trustRisk,
  });

  const displayChips = filterChipsForPhase270Presentation(
    coherent.intelligenceExposure.chips,
    reasonAuthority,
    spread.confidenceReason
  );

  return {
    distributionVerdict: verdict,
    distributionReason: reason,
    spreadConfidence: spread.confidenceScore,
    spreadConfidenceReason: spread.confidenceReason,
    reasonAuthority,
    displayChips,
    summaryLines: buildSurfaceSummaryLines(reasonAuthority),
    alternativePressureScore,
  };
}

export function buildPhase272ProductMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  priceByLink: Map<string, number>
): Map<string, Phase272ProductPresentation> {
  const phase271ByLink = buildPhase271ProductMap(coherenceByLink);

  const baseSignals: CompareTraySignals[] = [...coherenceByLink.entries()].map(([link, coherent]) => {
    const phase271 = phase271ByLink.get(link)!;
    return {
      link,
      price: priceByLink.get(link) ?? 0,
      trust: effectiveTrust(coherent),
      spreadConfidence: phase271.spreadConfidence,
      verdict: phase271.distributionVerdict,
      coherent,
      alternativePressureScore: phase271.alternativePressureScore,
    };
  });

  const dominancePass = baseSignals.map((row) => {
    const phase271 = phase271ByLink.get(row.link)!;
    const resolved = resolveCompareDominanceVerdict(
      baseSignals,
      row,
      phase271.distributionVerdict,
      phase271.distributionReason
    );
    return {
      ...row,
      verdict: resolved.verdict,
      reason: resolved.reason,
    };
  });

  const balanced = balanceTrayVerdictDistribution(dominancePass);

  const map = new Map<string, Phase272ProductPresentation>();
  for (const [link, coherent] of coherenceByLink) {
    const phase271 = phase271ByLink.get(link)!;
    const finalVerdict = balanced.get(link);
    const verdict = finalVerdict?.verdict ?? phase271.distributionVerdict;
    const reason = finalVerdict?.reason ?? phase271.distributionReason;

    if (verdict === phase271.distributionVerdict && reason === phase271.distributionReason) {
      map.set(link, phase271);
      continue;
    }

    map.set(
      link,
      rebuildPresentation(
        coherent,
        verdict,
        reason,
        link,
        phase271.alternativePressureScore
      )
    );
  }

  return map;
}

export function resolveUnifiedTrayVerdictFromPhase272(
  coherenceByLink: Map<string, CoherentProductDecision>,
  phase272ByLink: Map<string, Phase272ProductPresentation>
): UnifiedTrayVerdict {
  const adapted: CoherentProductDecision[] = [...coherenceByLink.entries()].map(([link, row]) => {
    const phase272 = phase272ByLink.get(link);
    if (!phase272) return row;
    return {
      ...row,
      verdict: phase272.distributionVerdict,
      alignmentScore: phase272.spreadConfidence,
      reasonLine: phase272.distributionReason,
      reasonAuthority: phase272.reasonAuthority,
      summaryLines: [...phase272.summaryLines],
    };
  });
  return resolveUnifiedTrayVerdict(adapted);
}

export function activatePhase272TrayPresentation(
  phase272ByLink: Map<string, Phase272ProductPresentation>,
  unifiedTrayVerdict: UnifiedTrayVerdict
): Phase272TrayPresentation {
  const ranked = [...phase272ByLink.entries()].map(([link, row]) => ({
    link,
    confidenceScore: row.spreadConfidence,
    verdict: row.distributionVerdict,
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
