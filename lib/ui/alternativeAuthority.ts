/**
 * Phase 27.0 — Alternative Authority.
 * Measures whether tray alternatives are genuinely competitive (presentation only).
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";

export type AlternativePressureLevel = "low" | "moderate" | "high";

export type ActivatedAlternativeAuthority = {
  bestConfidence: number;
  secondConfidence: number;
  confidenceGap: number;
  pressureScore: number;
  pressureLevel: AlternativePressureLevel;
  label: string;
  pressureLine: string;
};

export type AlternativeAuthorityTrayInput = {
  presentations: Array<{
    link: string;
    confidenceScore: number;
    verdict: CoherentProductDecision["verdict"];
  }>;
};

function clipLine(text: string, max = 160): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function pressureLevelFromGap(gap: number): AlternativePressureLevel {
  if (gap >= 18) return "low";
  if (gap >= 8) return "moderate";
  return "high";
}

function pressureScoreFromGap(gap: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - gap * 1.15)));
}

/** Tray-level alternative competitiveness from confidence-ranked listings. */
export function resolveTrayAlternativeAuthority(
  input: AlternativeAuthorityTrayInput
): ActivatedAlternativeAuthority {
  const ranked = [...input.presentations]
    .filter((row) => row.verdict !== "AVOID")
    .sort((a, b) => b.confidenceScore - a.confidenceScore);

  const best = ranked[0]?.confidenceScore ?? 0;
  const second = ranked[1]?.confidenceScore ?? 0;
  const gap = Math.max(0, best - second);
  const level = pressureLevelFromGap(gap);
  const pressureScore = pressureScoreFromGap(gap);

  const label = gap < 8 ? "Strong Alternative Exists" : "Decision Dominance Established";
  const pressureLine =
    level === "high"
      ? clipLine(`High — two close options (${best}% vs ${second}%) remain viable.`)
      : level === "moderate"
        ? clipLine(`Moderate — two viable alternatives exist (${best}% vs ${second}%).`)
        : clipLine(`Low — lead confidence ${best}% stands ${gap} points above the next option.`);

  return {
    bestConfidence: best,
    secondConfidence: second,
    confidenceGap: gap,
    pressureScore,
    pressureLevel: level,
    label,
    pressureLine,
  };
}

/** Per-product alternative pressure relative to tray leader confidence. */
export function resolveProductAlternativePressure(
  productConfidence: number,
  trayAuthority: ActivatedAlternativeAuthority
): number {
  if (trayAuthority.bestConfidence <= 0) return 0;
  const gapFromBest = Math.max(0, trayAuthority.bestConfidence - productConfidence);
  return Math.max(0, Math.min(100, Math.round(trayAuthority.pressureScore + gapFromBest * 0.35)));
}
