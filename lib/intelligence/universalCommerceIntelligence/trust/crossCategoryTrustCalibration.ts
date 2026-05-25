/**
 * Phase 16 — Cross-category trust calibration.
 */

import type { UniversalVerticalId } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function calibrateCrossCategoryTrust(
  verticalIntelligence: Record<UniversalVerticalId, { score01: number }>,
  normalizedTrust01: number
): number {
  const active = Object.values(verticalIntelligence).filter((v) => v.score01 > 0.25);
  const spread = active.length / 10;
  return round4(Math.min(1, normalizedTrust01 * (1 - spread * 0.08)));
}
