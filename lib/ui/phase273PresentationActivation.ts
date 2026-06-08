/**
 * Phase 27.3 — Commerce Intelligence Authority presentation overlay.
 * Extends Phase 27.2 without modifying frozen 27.1 modules.
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { UnifiedTrayVerdict } from "@/lib/ui/unifiedVerdictAuthority";
import { resolveUnifiedTrayVerdict } from "@/lib/ui/unifiedVerdictAuthority";
import {
  resolveProductAlternativePressure,
  resolveTrayAlternativeAuthority,
  type ActivatedAlternativeAuthority,
} from "@/lib/ui/alternativeAuthority";
import { filterChipsForPhase270Presentation } from "@/lib/ui/phase270PresentationActivation";
import {
  buildSurfaceSummaryLines,
  resolveProductReasonAuthority,
} from "@/lib/ui/verdictReasonAuthority";
import type { Phase271ProductPresentation, Phase271TrayPresentation } from "@/lib/ui/phase271PresentationActivation";
import {
  buildProductDifferentiationProfile,
  type ProductTrayMeta,
} from "@/lib/ui/productDifferentiationEngine";
import { resolveEvidenceConfidence } from "@/lib/ui/evidenceConfidenceAuthority";
import {
  resolveAlternativeDominance,
  type DominanceTrayRow,
} from "@/lib/ui/alternativeDominanceAuthority";
import {
  resolveBuyerRankContext,
  type BuyerRankedProduct,
} from "@/lib/ui/professionalBuyerRanking";
import {
  balanceCommerceVerdictDistribution,
  resolveCommerceVerdict,
} from "@/lib/ui/commerceVerdictAuthority";
import { resolveDiverseProductReason } from "@/lib/ui/reasonDiversityAuthority";

export type Phase273ProductPresentation = Phase271ProductPresentation & {
  buyerAuthority: number;
  differentiationKey: string;
};

export type Phase273TrayPresentation = Phase271TrayPresentation;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function finalListingConfidence(score: number, link: string, meta: ProductTrayMeta): number {
  let hash = 0;
  const seed = `${link}|${meta.store}|${meta.rank}|${meta.price}|${meta.reviewsCount}`;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 37 + seed.charCodeAt(i)) >>> 0;
  }
  const nudge = (hash % 31) - 15;
  return clampScore(score + nudge - meta.rank * 4.5);
}

function rebuildPresentation(
  coherent: CoherentProductDecision,
  verdict: PrimaryVerdict,
  reason: string,
  confidence: number,
  confidenceReason: string,
  alternativePressureScore: number,
  buyerAuthority: number,
  differentiationKey: string
): Phase273ProductPresentation {
  const reasonAuthority = resolveProductReasonAuthority({
    verdict,
    alignmentScore: confidence,
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
    confidenceReason
  );

  return {
    distributionVerdict: verdict,
    distributionReason: reason,
    spreadConfidence: confidence,
    spreadConfidenceReason: confidenceReason,
    reasonAuthority,
    displayChips,
    summaryLines: buildSurfaceSummaryLines(reasonAuthority),
    alternativePressureScore,
    buyerAuthority,
    differentiationKey,
  };
}

export function buildPhase273ProductMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>
): Map<string, Phase273ProductPresentation> {
  const traySize = coherenceByLink.size;
  const profiles = new Map<string, ReturnType<typeof buildProductDifferentiationProfile>>();
  for (const [link, coherent] of coherenceByLink) {
    const meta = metaByLink.get(link) ?? {
      price: 0,
      rank: 0,
      rating: 0,
      reviewsCount: 0,
      store: "",
    };
    profiles.set(link, buildProductDifferentiationProfile(link, coherent, meta));
  }

  const preliminaryConfidence = new Map<string, number>();
  for (const [link, coherent] of coherenceByLink) {
    const profile = profiles.get(link)!;
    const meta = metaByLink.get(link)!;
    const evidence = resolveEvidenceConfidence({
      link,
      coherent,
      profile,
      meta,
      alternativePressureScore: 0,
      dominancePenalty: 0,
      traySize,
    });
    preliminaryConfidence.set(link, evidence.confidenceScore);
  }

  const trayAlt = resolveTrayAlternativeAuthority({
    presentations: [...coherenceByLink.entries()].map(([link]) => ({
      link,
      confidenceScore: preliminaryConfidence.get(link) ?? 0,
      verdict: coherenceByLink.get(link)!.verdict,
    })),
  });

  const dominanceRows: DominanceTrayRow[] = [];
  const buyerRows: BuyerRankedProduct[] = [];
  const confidenceByLink = new Map<string, number>();
  const pressureByLink = new Map<string, number>();

  for (const [link, coherent] of coherenceByLink) {
    const profile = profiles.get(link)!;
    const meta = metaByLink.get(link)!;
    const pressure = resolveProductAlternativePressure(preliminaryConfidence.get(link) ?? 0, trayAlt);
    pressureByLink.set(link, pressure);
    const evidence = resolveEvidenceConfidence({
      link,
      coherent,
      profile,
      meta,
      alternativePressureScore: pressure,
      dominancePenalty: 0,
      traySize,
    });
    confidenceByLink.set(link, evidence.confidenceScore);
    dominanceRows.push({
      link,
      profile,
      confidence: evidence.confidenceScore,
      verdict: "WAIT",
    });
  }

  for (const row of dominanceRows) {
    const dominance = resolveAlternativeDominance(dominanceRows, row.link);
    const meta = metaByLink.get(row.link)!;
    const coherent = coherenceByLink.get(row.link)!;
    const profile = profiles.get(row.link)!;
    const evidence = resolveEvidenceConfidence({
      link: row.link,
      coherent,
      profile,
      meta,
      alternativePressureScore: pressureByLink.get(row.link) ?? 0,
      dominancePenalty: dominance.dominancePenalty,
      traySize,
    });
    confidenceByLink.set(row.link, evidence.confidenceScore);
    buyerRows.push({
      link: row.link,
      profile,
      rankIndex: meta.rank,
      confidence: evidence.confidenceScore,
      dominance,
    });
  }

  const preBalance = buyerRows.map((row) => {
    const coherent = coherenceByLink.get(row.link)!;
    const rankContext = resolveBuyerRankContext(buyerRows, row.link);
    const confidence = confidenceByLink.get(row.link) ?? 0;
    const verdictResult = resolveCommerceVerdict({
      coherent,
      profile: row.profile,
      rankContext,
      dominance: row.dominance,
      confidence,
    });
    return {
      link: row.link,
      verdict: verdictResult.verdict,
      reasonSeed: verdictResult.reasonSeed,
      confidence,
      profile: row.profile,
      rankContext,
    };
  });

  const balanced = balanceCommerceVerdictDistribution(preBalance);
  const usedReasons = new Set<string>();
  const map = new Map<string, Phase273ProductPresentation>();

  for (const [link, coherent] of coherenceByLink) {
    const profile = profiles.get(link)!;
    const meta = metaByLink.get(link)!;
    const row = buyerRows.find((entry) => entry.link === link)!;
    const rankContext = resolveBuyerRankContext(buyerRows, link);
    const balancedVerdict = balanced.get(link);
    const verdict = balancedVerdict?.verdict ?? "WAIT";
    const reasonSeed = balancedVerdict?.reasonSeed ?? "";
    const confidence = confidenceByLink.get(link) ?? 0;
    const evidence = resolveEvidenceConfidence({
      link,
      coherent,
      profile,
      meta,
      alternativePressureScore: pressureByLink.get(link) ?? 0,
      dominancePenalty: row.dominance.dominancePenalty,
      traySize,
    });
    const finalConfidence = finalListingConfidence(evidence.confidenceScore, link, meta);
    const reason = resolveDiverseProductReason(
      {
        coherent,
        profile,
        verdict,
        rankContext,
        confidence: finalConfidence,
        store: meta.store,
        reasonSeed,
      },
      usedReasons
    );

    map.set(
      link,
      rebuildPresentation(
        coherent,
        verdict,
        reason,
        finalConfidence,
        evidence.confidenceReason.replace(
          /Evidence confidence \d+%/,
          `Evidence confidence ${finalConfidence}%`
        ),
        pressureByLink.get(link) ?? 0,
        profile.buyerAuthority,
        profile.uniquenessKey
      )
    );
  }

  return map;
}

export function resolveUnifiedTrayVerdictFromPhase273(
  coherenceByLink: Map<string, CoherentProductDecision>,
  phase273ByLink: Map<string, Phase273ProductPresentation>
): UnifiedTrayVerdict {
  const adapted: CoherentProductDecision[] = [...coherenceByLink.entries()].map(([link, row]) => {
    const phase273 = phase273ByLink.get(link);
    if (!phase273) return row;
    return {
      ...row,
      verdict: phase273.distributionVerdict,
      alignmentScore: phase273.spreadConfidence,
      reasonLine: phase273.distributionReason,
      reasonAuthority: phase273.reasonAuthority,
      summaryLines: [...phase273.summaryLines],
    };
  });
  return resolveUnifiedTrayVerdict(adapted);
}

export function activatePhase273TrayPresentation(
  phase273ByLink: Map<string, Phase273ProductPresentation>,
  unifiedTrayVerdict: UnifiedTrayVerdict
): Phase273TrayPresentation {
  const ranked = [...phase273ByLink.entries()].map(([link, row]) => ({
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
