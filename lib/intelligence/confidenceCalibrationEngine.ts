/**
 * Phase 39 — Confidence Calibration Engine.
 * Decision confidence must align mathematically with verdict bands.
 */

import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";

export type CalibratedConfidence = {
  confidence: number;
  band: PrimaryVerdict | "STRONG BUY";
  aligned: boolean;
  reason: string;
};

const BANDS: Record<PrimaryVerdict | "STRONG BUY", { min: number; max: number }> = {
  "STRONG BUY": { min: 85, max: 99 },
  "BUY READY": { min: 70, max: 84 },
  COMPARE: { min: 40, max: 69 },
  WAIT: { min: 30, max: 60 },
  AVOID: { min: 0, max: 39 },
  "INSUFFICIENT DATA": { min: 20, max: 45 },
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/** Calibrate confidence to verdict band — no contradictory combinations. */
export function calibrateConfidenceForVerdict(args: {
  verdict: PrimaryVerdict;
  rawScore: number;
  strongBuy?: boolean;
  rankBoost?: number;
}): CalibratedConfidence {
  const { verdict, rawScore, strongBuy = false, rankBoost = 0 } = args;

  if (strongBuy && verdict === "BUY READY") {
    const confidence = clamp(Math.round(Math.max(85, rawScore, 70 + rankBoost)), 85, 99);
    return {
      confidence,
      band: "STRONG BUY",
      aligned: true,
      reason: "Strong buy confidence band — exceptional opportunity with trusted checkout path.",
    };
  }

  const band = BANDS[verdict];
  let confidence = clamp(Math.round(rawScore + rankBoost), band.min, band.max);

  if (confidence < band.min) confidence = band.min;
  if (confidence > band.max) confidence = band.max;

  return {
    confidence,
    band: verdict,
    aligned: confidence >= band.min && confidence <= band.max,
    reason: `Confidence ${confidence}% aligned to ${verdict} band (${band.min}-${band.max}).`,
  };
}

export function confidenceBandForVerdict(verdict: PrimaryVerdict): { min: number; max: number } {
  return BANDS[verdict];
}

export function isConfidenceVerdictAligned(verdict: PrimaryVerdict, confidence: number, strongBuy = false): boolean {
  if (strongBuy && verdict === "BUY READY") return confidence >= 85;
  const band = BANDS[verdict];
  return confidence >= band.min && confidence <= band.max;
}
