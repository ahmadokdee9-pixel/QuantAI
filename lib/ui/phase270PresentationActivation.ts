/**
 * Phase 27.0 — Presentation overlay (does not modify Phase 26.2 verdict/reason authority).
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import type { ExposureChip } from "@/lib/ui/intelligenceExposureActivation";
import {
  resolveConfidenceAuthority,
  type ActivatedConfidenceAuthority,
} from "@/lib/ui/confidenceAuthority";
import {
  resolveProductAlternativePressure,
  resolveTrayAlternativeAuthority,
  type ActivatedAlternativeAuthority,
} from "@/lib/ui/alternativeAuthority";
import {
  reasonCodeForChipLabel,
  reasonCodesForAuthority,
  type VerdictReasonAuthority,
} from "@/lib/ui/verdictReasonAuthority";

export type Phase270ProductPresentation = {
  confidence: ActivatedConfidenceAuthority;
  alternativePressureScore: number;
  displayChips: ExposureChip[];
  displayConfidenceScore: number;
  displayConfidenceReason: string;
};

export type Phase270TrayPresentation = {
  alternativeAuthority: ActivatedAlternativeAuthority;
  trayConfidence: number;
  winningReasonLine: string;
  alternativePressureLine: string;
};

function confidenceKeywords(reason: string): string[] {
  const t = reason.toLowerCase();
  const keys: string[] = [];
  if (t.includes("intent")) keys.push("FIT", "intent");
  if (t.includes("trust")) keys.push("TRUST", "trust");
  if (t.includes("price")) keys.push("PRICE", "VALUE", "price");
  if (t.includes("category")) keys.push("QUALITY", "category");
  if (t.includes("market") || t.includes("timing")) keys.push("PRICE", "MARKET_RISK");
  if (t.includes("data")) keys.push("INSUFFICIENT_DATA", "INSUFFICIENT_VERIFICATION");
  return keys;
}

function chipSupportsPresentation(
  chip: ExposureChip,
  reasonAuthority: VerdictReasonAuthority,
  confidenceReason: string
): boolean {
  const code = reasonCodeForChipLabel(chip.label);
  if (!code) return false;
  const allowedReason = reasonCodesForAuthority(reasonAuthority);
  if (allowedReason.has(code)) return true;
  const keywords = confidenceKeywords(confidenceReason);
  const label = chip.label.toLowerCase();
  if (keywords.some((key) => label.includes(key.toLowerCase()))) return true;
  if (code === "FIT" && keywords.includes("intent")) return true;
  if (code === "TRUST" && keywords.includes("trust")) return true;
  if ((code === "VALUE" || code === "PRICE") && keywords.some((k) => k === "PRICE" || k === "VALUE"))
    return true;
  return false;
}

export function filterChipsForPhase270Presentation(
  chips: ExposureChip[],
  reasonAuthority: VerdictReasonAuthority,
  confidenceReason: string
): ExposureChip[] {
  return chips
    .filter((chip) => chipSupportsPresentation(chip, reasonAuthority, confidenceReason))
    .slice(0, 3);
}

export function activatePhase270ProductPresentation(
  coherent: CoherentProductDecision,
  alternativePressureScore: number
): Phase270ProductPresentation {
  const confidence = resolveConfidenceAuthority({
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

  const displayChips = filterChipsForPhase270Presentation(
    coherent.intelligenceExposure.chips,
    coherent.reasonAuthority,
    confidence.confidenceReason
  );

  return {
    confidence,
    alternativePressureScore,
    displayChips,
    displayConfidenceScore: confidence.confidenceScore,
    displayConfidenceReason: confidence.confidenceReason,
  };
}

export function activatePhase270TrayPresentation(
  coherenceByLink: Map<string, CoherentProductDecision>,
  unifiedVerdict: {
    winningReason: string;
    reasonAuthority?: { primaryReason: { line: string } };
  }
): Phase270TrayPresentation {
  const productMap = buildPhase270ProductMap(coherenceByLink);
  const ranked = [...productMap.entries()].map(([link, presentation]) => ({
    link,
    confidenceScore: presentation.displayConfidenceScore,
    verdict: coherenceByLink.get(link)!.verdict,
  }));

  const alternativeAuthority = resolveTrayAlternativeAuthority({ presentations: ranked });
  const trayConfidence = ranked.length > 0 ? Math.max(...ranked.map((row) => row.confidenceScore)) : 0;
  const winningReasonLine =
    unifiedVerdict.reasonAuthority?.primaryReason.line || unifiedVerdict.winningReason;

  return {
    alternativeAuthority,
    trayConfidence,
    winningReasonLine,
    alternativePressureLine: `${alternativeAuthority.pressureLevel === "high" ? "High" : alternativeAuthority.pressureLevel === "moderate" ? "Moderate" : "Low"} — ${alternativeAuthority.pressureLine}`,
  };
}

export function buildPhase270ProductMap(
  coherenceByLink: Map<string, CoherentProductDecision>
): Map<string, Phase270ProductPresentation> {
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

  const trayAlt = resolveTrayAlternativeAuthority({
    presentations: [...preliminary.entries()].map(([link, confidenceScore]) => ({
      link,
      confidenceScore,
      verdict: coherenceByLink.get(link)!.verdict,
    })),
  });

  const map = new Map<string, Phase270ProductPresentation>();
  for (const [link, coherent] of coherenceByLink) {
    const pressure = resolveProductAlternativePressure(preliminary.get(link) ?? 0, trayAlt);
    map.set(link, activatePhase270ProductPresentation(coherent, pressure));
  }
  return map;
}
