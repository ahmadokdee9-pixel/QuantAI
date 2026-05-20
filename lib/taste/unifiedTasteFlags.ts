/**
 * Phase 3.1/3.2 unified taste flags — meta on by default; apply off by default.
 */

export const TASTE_UNIFIED_META_VERSION = "unified-taste-v1" as const;

export const TASTE_UNIFIED_APPLY_CANARY_VERSION = "unified-taste-apply-canary-v1" as const;

/** Max bounded unified influence (well below vertical canary ±12). */
export const TASTE_UNIFIED_APPLY_MAX_DELTA = 4;

export const TASTE_UNIFIED_CONFIDENCE_THRESHOLD = 0.52;

/** P3.2 apply gates — institutional minimums. */
export const TASTE_UNIFIED_COHERENCE_MIN = 0.55;

export const TASTE_UNIFIED_PRESTIGE_INTEGRITY_MIN = 0.68;

export const TASTE_UNIFIED_CROSS_VERTICAL_MIN = 0.45;

/** Unified meta emission — default on; set TASTE_UNIFIED_TASTE=false to disable. */
export function isUnifiedTasteMetaEnabled(): boolean {
  return process.env.TASTE_UNIFIED_TASTE !== "false";
}

/**
 * P3.2 unified bounded apply — OFF by default (canary/staging only).
 * Rollback: TASTE_UNIFIED_APPLY_ENABLED=false
 */
export function isUnifiedTasteApplyEnabled(): boolean {
  return process.env.TASTE_UNIFIED_APPLY_ENABLED === "true";
}
