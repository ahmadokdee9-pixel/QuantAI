/**
 * Phase 10 — Seasonal commerce evolution signals.
 */

import type { SeasonalEvolutionProfile } from "../types";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

const MONTH = new Date().getUTCMonth();

export function detectSeasonalCommerceEvolution(query: string): SeasonalEvolutionProfile {
  const q = query.toLowerCase();
  let seasonalShift01 = 0.25;
  let holidayProximity01 = 0.2;
  let launchWindow01 = 0.2;
  let endOfLife01 = 0.15;

  if (/\b(black friday|cyber monday|christmas|holiday|gift)\b/.test(q)) holidayProximity01 += 0.5;
  if (/\b(back to school|summer sale|winter sale)\b/.test(q)) seasonalShift01 += 0.45;
  if (/\b(new|launch|2025|2026|latest)\b/.test(q)) launchWindow01 += 0.4;
  if (/\b(clearance|end of life|discontinued|last gen)\b/.test(q)) endOfLife01 += 0.5;

  if (MONTH === 10 || MONTH === 11) holidayProximity01 += 0.25;
  if (MONTH >= 8 && MONTH <= 9) seasonalShift01 += 0.15;

  return {
    seasonalShift01: round4(clamp01(seasonalShift01)),
    holidayProximity01: round4(clamp01(holidayProximity01)),
    launchWindow01: round4(clamp01(launchWindow01)),
    endOfLife01: round4(clamp01(endOfLife01)),
  };
}
