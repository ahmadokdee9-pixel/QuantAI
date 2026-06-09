/** QUANTAI_PHASE_27_1_STABLE_FROZEN — confidence spread engine. */
/**
 * Phase 27.1 — Confidence Spread Engine.
 * Independent per-product confidence with verdict-bounded spread (no fixed buckets).
 */

import type { ConfidenceFactorScores } from "@/lib/ui/confidenceAuthority";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";

export type ConfidenceSpreadResult = {
  confidenceScore: number;
  confidenceReason: string;
};

const VERDICT_RANGES: Record<PrimaryVerdict, [number, number]> = {
  "BUY READY": [78, 96],
  COMPARE: [55, 82],
  WAIT: [38, 68],
  AVOID: [15, 45],
  "INSUFFICIENT DATA": [25, 50],
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function stableUnit(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

function rawEvidenceScore(factors: ConfidenceFactorScores, alternativePressure: number): number {
  const weighted =
    factors.intentMatch * 0.2 +
    factors.trustScore * 0.2 +
    factors.priceQuality * 0.18 +
    factors.categoryQuality * 0.14 +
    factors.dataCompleteness * 0.1 +
    factors.marketConditions * 0.12 +
    (100 - factors.alternativePressure) * 0.06;
  return clampScore(weighted - alternativePressure * 0.08);
}

function clipLine(text: string, max = 96): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function buildSpreadReason(factors: ConfidenceFactorScores, score: number): string {
  const ranked = [
    { label: "trust", value: factors.trustScore },
    { label: "intent match", value: factors.intentMatch },
    { label: "price attractiveness", value: factors.priceQuality },
    { label: "category fit", value: factors.categoryQuality },
    { label: "listing completeness", value: factors.dataCompleteness },
    { label: "market position", value: factors.marketConditions },
  ].sort((a, b) => b.value - a.value);
  const lead = ranked[0]!;
  const support = ranked[1]!;
  return clipLine(
    `Decision confidence ${score}% — led by ${lead.label} (${lead.value}/100), supported by ${support.label} (${support.value}/100).`
  );
}

/** Spread confidence within verdict-specific ranges using evidence + stable product variance. */
export function resolveConfidenceSpread(args: {
  verdict: PrimaryVerdict;
  factors: ConfidenceFactorScores;
  spreadKey: string;
  alternativePressureScore?: number;
}): ConfidenceSpreadResult {
  const { verdict, factors, spreadKey, alternativePressureScore = factors.alternativePressure } = args;
  const [min, max] = VERDICT_RANGES[verdict];
  const raw = rawEvidenceScore(factors, alternativePressureScore);
  const unit = stableUnit(`${spreadKey}:${verdict}:${raw}`);
  const evidencePos = raw / 100;
  const position = evidencePos * 0.68 + unit * 0.32;
  const confidenceScore = clampScore(min + position * (max - min));
  return {
    confidenceScore,
    confidenceReason: buildSpreadReason(factors, confidenceScore),
  };
}

/** Validation helper — scores must land inside verdict spread bands. */
export function confidenceWithinVerdictBand(verdict: PrimaryVerdict, score: number): boolean {
  const [min, max] = VERDICT_RANGES[verdict];
  return score >= min && score <= max;
}
