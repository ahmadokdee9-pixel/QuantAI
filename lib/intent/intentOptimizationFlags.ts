/**
 * P4.7 — Adaptive intelligence optimization (advisory meta-only; no autonomous apply).
 */

export const INTENT_OPTIMIZATION_VERSION = "intent-optimization-v1" as const;

/** Minimum evaluation quality before emitting threshold recommendations. */
export const INTENT_OPT_MIN_EVAL_QUALITY = 50;

/** Confidence floor for medium-risk recommendations. */
export const INTENT_OPT_MIN_CONFIDENCE = 52;

/** Meta emission — default on; set INTENT_OPTIMIZATION=false to disable. */
export function isIntentOptimizationEnabled(): boolean {
  return process.env.INTENT_OPTIMIZATION !== "false";
}

/** Optimization never mutates ranking or env at runtime. */
export function isIntentOptimizationAutonomousBlocked(): boolean {
  return true;
}
