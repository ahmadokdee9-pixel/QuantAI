/**
 * P4.4 — Live production observability thresholds (meta-only; no ranking changes).
 */

export const INTENT_OBSERVABILITY_VERSION = "intent-observability-v1" as const;

/** Max top-5 position drift allowed per tray (matches P4.1/P4.2). */
export const INTENT_OBS_MAX_DRIFT = 3;

/** Instability warnings above this count fail integrity checks. */
export const INTENT_OBS_INSTABILITY_CEILING = 4;

/** Suppression rate above this triggers over-suppression warning. */
export const INTENT_OBS_SUPPRESSION_RATE_MAX = 0.72;

/** Per-request observability compute budget. */
export const INTENT_OBS_LATENCY_BUDGET_MS = 18;

/** Confidence bucket boundaries. */
export const INTENT_OBS_CONFIDENCE_LOW = 0.55;
export const INTENT_OBS_CONFIDENCE_HIGH = 0.72;

export function isIntentObservabilityEnabled(): boolean {
  return process.env.INTENT_OBSERVABILITY !== "false";
}
