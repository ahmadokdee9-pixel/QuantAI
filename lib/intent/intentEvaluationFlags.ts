/**
 * P4.6 — Production intelligence evaluation thresholds (meta-only).
 */

export const INTENT_EVALUATION_VERSION = "intent-evaluation-v1" as const;

export const INTENT_EVAL_MIN_QUALITY_SCORE = 55;

export const INTENT_EVAL_MIN_TRUST_SCORE = 60;

export const INTENT_EVAL_MIN_EXPLANATION_FIELDS = 4;

/** Meta emission — default on; set INTENT_EVALUATION=false to disable. */
export function isIntentEvaluationEnabled(): boolean {
  return process.env.INTENT_EVALUATION !== "false";
}
