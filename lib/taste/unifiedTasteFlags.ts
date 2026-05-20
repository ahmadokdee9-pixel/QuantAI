/**
 * Phase 3.1 unified taste flags — meta on by default; apply off by default.
 */

export const TASTE_UNIFIED_META_VERSION = "unified-taste-v1" as const;

/** Max bounded unified influence (well below vertical canary ±12). */
export const TASTE_UNIFIED_APPLY_MAX_DELTA = 4;

export const TASTE_UNIFIED_CONFIDENCE_THRESHOLD = 0.52;

export const TASTE_UNIFIED_PRESTIGE_INTEGRITY_MIN = 0.68;

/** Unified meta emission — default on; set TASTE_UNIFIED_TASTE=false to disable. */
export function isUnifiedTasteMetaEnabled(): boolean {
  return process.env.TASTE_UNIFIED_TASTE !== "false";
}

/**
 * Unified bounded apply — OFF by default (P3.1 meta-only).
 * Rollback: TASTE_UNIFIED_APPLY_ENABLED=false
 */
export function isUnifiedTasteApplyEnabled(): boolean {
  return process.env.TASTE_UNIFIED_APPLY_ENABLED === "true";
}
