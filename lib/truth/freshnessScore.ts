/**
 * Phase 1B.2 — Freshness scoring from observation age.
 */

const MS_PER_HOUR = 60 * 60 * 1000;

export type FreshnessBand = "fresh" | "aging" | "stale" | "expired";

export type FreshnessScoreResult = {
  freshnessScore: number;
  ageHours: number;
  band: FreshnessBand;
};

function parseTimestamp(value: string | Date): number | null {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/** Hours elapsed since observation (non-negative). */
export function computeObservationAgeHours(
  observedAt: string | Date,
  now: string | Date = new Date()
): number {
  const observedMs = parseTimestamp(observedAt);
  const nowMs = parseTimestamp(now);
  if (observedMs == null || nowMs == null) return 0;
  return Math.max(0, (nowMs - observedMs) / MS_PER_HOUR);
}

/**
 * Age-based freshness score (0–100).
 * - <24h → 100
 * - 24–48h → 80
 * - 48–72h → 60
 * - >72h → 30
 */
export function computeFreshnessScoreFromAgeHours(ageHours: number): number {
  if (!Number.isFinite(ageHours) || ageHours < 0) return 100;
  if (ageHours < 24) return 100;
  if (ageHours < 48) return 80;
  if (ageHours < 72) return 60;
  return 30;
}

export function computeFreshnessScoreFromObservedAt(
  observedAt: string | Date,
  now: string | Date = new Date()
): FreshnessScoreResult {
  const ageHours = computeObservationAgeHours(observedAt, now);
  const freshnessScore = computeFreshnessScoreFromAgeHours(ageHours);
  const band: FreshnessBand =
    freshnessScore >= 100
      ? "fresh"
      : freshnessScore >= 80
        ? "aging"
        : freshnessScore >= 60
          ? "stale"
          : "expired";

  return { freshnessScore, ageHours, band };
}
