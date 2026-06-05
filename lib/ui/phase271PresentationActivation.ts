/** QUANTAI_PHASE_27_1_STABLE_FROZEN — distribution + spread presentation overlay. */
/**
 * Phase 27.1 — Decision distribution + confidence spread presentation overlay.
 * Does not modify Phase 26.2 verdict/reason authority modules.
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import type { ExposureChip } from "@/lib/ui/intelligenceExposureActivation";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { UnifiedTrayVerdict } from "@/lib/ui/unifiedVerdictAuthority";
import { resolveUnifiedTrayVerdict } from "@/lib/ui/unifiedVerdictAuthority";
import { resolveConfidenceAuthority } from "@/lib/ui/confidenceAuthority";
import {
  resolveProductAlternativePressure,
  resolveTrayAlternativeAuthority,
  type ActivatedAlternativeAuthority,
} from "@/lib/ui/alternativeAuthority";
import {
  resolveDecisionDistribution,
  type DistributionTrayContext,
} from "@/lib/ui/decisionDistributionAuthority";
import { resolveConfidenceSpread } from "@/lib/ui/confidenceSpreadEngine";
import { filterChipsForPhase270Presentation } from "@/lib/ui/phase270PresentationActivation";
import {
  buildSurfaceSummaryLines,
  resolveProductReasonAuthority,
  type VerdictReasonAuthority,
} from "@/lib/ui/verdictReasonAuthority";

export type Phase271ProductPresentation = {
  distributionVerdict: PrimaryVerdict;
  distributionReason: string;
  spreadConfidence: number;
  spreadConfidenceReason: string;
  reasonAuthority: VerdictReasonAuthority;
  displayChips: ExposureChip[];
  summaryLines: [string, string];
  alternativePressureScore: number;
};

export type Phase271TrayPresentation = {
  alternativeAuthority: ActivatedAlternativeAuthority;
  trayConfidence: number;
  winningReasonLine: string;
  alternativePressureLine: string;
};

function countCloseAlternatives(
  scores: Array<{ link: string; score: number }>,
  productLink: string,
  window = 10
): number {
  const self = scores.find((row) => row.link === productLink)?.score ?? 0;
  return scores.filter((row) => Math.abs(row.score - self) <= window).length;
}

function buildTrayContext(
  link: string,
  spreadConfidence: number,
  trayAlt: ActivatedAlternativeAuthority,
  scoreboard: Array<{ link: string; score: number }>
): DistributionTrayContext {
  const best = trayAlt.bestConfidence;
  return {
    bestConfidence: best,
    productConfidence: spreadConfidence,
    confidenceGapFromBest: Math.max(0, best - spreadConfidence),
    closeAlternativeCount: countCloseAlternatives(scoreboard, link),
    trayAlternativePressure: trayAlt.pressureScore,
  };
}

export function activatePhase271ProductPresentation(
  coherent: CoherentProductDecision,
  trayContext: DistributionTrayContext,
  spreadKey: string
): Phase271ProductPresentation {
  const preliminaryConfidence = resolveConfidenceAuthority({
    verdict: coherent.verdict,
    intentIntelligence: coherent.intentIntelligence,
    trustRisk: coherent.trustRisk,
    discountTruth: coherent.discountTruth,
    priceTarget: coherent.priceTarget,
    buyWait: coherent.buyWait,
    categoryIntelligence: coherent.categoryIntelligence,
    alternativeAdvantage: coherent.alternativeAdvantage,
    alternativePressureScore: trayContext.trayAlternativePressure,
  });

  const distribution = resolveDecisionDistribution(coherent, trayContext);
  const spread = resolveConfidenceSpread({
    verdict: distribution.verdict,
    factors: preliminaryConfidence.factors,
    spreadKey,
    alternativePressureScore: trayContext.trayAlternativePressure,
  });

  const reasonAuthority = resolveProductReasonAuthority({
    verdict: distribution.verdict,
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

  const summaryLines = buildSurfaceSummaryLines(reasonAuthority);

  return {
    distributionVerdict: distribution.verdict,
    distributionReason: distribution.reason,
    spreadConfidence: spread.confidenceScore,
    spreadConfidenceReason: spread.confidenceReason,
    reasonAuthority,
    displayChips,
    summaryLines,
    alternativePressureScore: trayContext.trayAlternativePressure,
  };
}

export function buildPhase271ProductMap(
  coherenceByLink: Map<string, CoherentProductDecision>
): Map<string, Phase271ProductPresentation> {
  const preliminary = new Map<string, number>();
  for (const [link, coherent] of coherenceByLink) {
    const conf = resolveConfidenceAuthority({
      verdict: coherent.verdict,
      intentIntelligence: coherent.intentIntelligence,
      trustRisk: coherent.trustRisk,
      discountTruth: coherent.discountTruth,
      priceTarget: coherent.priceTarget,
      buyWait: coherent.buyWait,
      categoryIntelligence: coherent.categoryIntelligence,
      alternativeAdvantage: coherent.alternativeAdvantage,
      alternativePressureScore: 0,
    });
    preliminary.set(link, conf.confidenceScore);
  }

  const scoreboard = [...preliminary.entries()].map(([link, score]) => ({ link, score }));
  const trayAlt = resolveTrayAlternativeAuthority({
    presentations: [...coherenceByLink.entries()].map(([link]) => ({
      link,
      confidenceScore: preliminary.get(link) ?? 0,
      verdict: coherenceByLink.get(link)!.verdict,
    })),
  });

  const map = new Map<string, Phase271ProductPresentation>();
  for (const [link, coherent] of coherenceByLink) {
    const spreadPre = resolveConfidenceSpread({
      verdict: coherent.verdict,
      factors: resolveConfidenceAuthority({
        verdict: coherent.verdict,
        intentIntelligence: coherent.intentIntelligence,
        trustRisk: coherent.trustRisk,
        discountTruth: coherent.discountTruth,
        priceTarget: coherent.priceTarget,
        buyWait: coherent.buyWait,
        categoryIntelligence: coherent.categoryIntelligence,
        alternativeAdvantage: coherent.alternativeAdvantage,
        alternativePressureScore: resolveProductAlternativePressure(
          preliminary.get(link) ?? 0,
          trayAlt
        ),
      }).factors,
      spreadKey: link,
    });
    const trayContext = buildTrayContext(link, spreadPre.confidenceScore, trayAlt, scoreboard);
    map.set(link, activatePhase271ProductPresentation(coherent, trayContext, link));
  }
  return map;
}

/** Tray verdict from distribution labels (Phase 26.1 authority on card-majority). */
export function resolveUnifiedTrayVerdictFromPhase271(
  coherenceByLink: Map<string, CoherentProductDecision>,
  phase271ByLink: Map<string, Phase271ProductPresentation>
): UnifiedTrayVerdict {
  const adapted: CoherentProductDecision[] = [...coherenceByLink.entries()].map(([link, row]) => {
    const phase271 = phase271ByLink.get(link);
    if (!phase271) return row;
    return {
      ...row,
      verdict: phase271.distributionVerdict,
      alignmentScore: phase271.spreadConfidence,
      reasonLine: phase271.distributionReason,
      reasonAuthority: phase271.reasonAuthority,
      summaryLines: [...phase271.summaryLines],
    };
  });
  return resolveUnifiedTrayVerdict(adapted);
}

export function activatePhase271TrayPresentation(
  phase271ByLink: Map<string, Phase271ProductPresentation>,
  unifiedTrayVerdict: UnifiedTrayVerdict
): Phase271TrayPresentation {
  const ranked = [...phase271ByLink.entries()].map(([link, row]) => ({
    link,
    confidenceScore: row.spreadConfidence,
    verdict: row.distributionVerdict,
  }));
  const alternativeAuthority = resolveTrayAlternativeAuthority({ presentations: ranked });
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
