/**
 * P4.9 — Adaptive intelligence calibration thresholds (advisory meta-only).
 */

export const INTENT_CALIBRATION_VERSION = "intent-calibration-v1" as const;

export const INTENT_CAL_MIN_CALIBRATION_SCORE = 55;

export const INTENT_CAL_WEIGHT_MIN = 0.35;

export const INTENT_CAL_WEIGHT_MAX = 1;

/** Meta emission — default on; set INTENT_CALIBRATION=false to disable. */
export function isIntentCalibrationEnabled(): boolean {
  return process.env.INTENT_CALIBRATION !== "false";
}

export function isIntentCalibrationAdvisoryOnly(): boolean {
  return true;
}

export function isIntentCalibrationAutonomousBlocked(): boolean {
  return true;
}
