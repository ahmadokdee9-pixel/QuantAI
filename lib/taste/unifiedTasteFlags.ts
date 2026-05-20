/**
 * Phase 3.1/3.2/3.3 unified taste flags — meta on by default; apply off by default.
 */

export const TASTE_UNIFIED_META_VERSION = "unified-taste-v1" as const;

export const TASTE_UNIFIED_APPLY_CANARY_VERSION = "unified-taste-apply-canary-v1" as const;

/** P3.3 live staging soak telemetry version. */
export const TASTE_UNIFIED_LIVE_SOAK_VERSION = "unified-taste-live-soak-v1" as const;

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

/** P3.3 hard rollback — forces unified apply OFF everywhere. */
export function isUnifiedCanaryHardRollback(): boolean {
  return process.env.ENABLE_UNIFIED_CANARY === "false";
}

/**
 * P3.3 staging/canary environment guard.
 * Production apply blocked unless ENABLE_UNIFIED_CANARY=true (default false).
 */
export function isUnifiedCanaryEnvironmentAllowed(): boolean {
  if (isUnifiedCanaryHardRollback()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.ENABLE_UNIFIED_CANARY === "true";
}

/**
 * P3.2/P3.3 unified bounded apply — OFF by default (staging/canary only).
 * Rollback: ENABLE_UNIFIED_CANARY=false or TASTE_UNIFIED_APPLY_ENABLED=false
 */
export function isUnifiedTasteApplyEnabled(): boolean {
  if (!isUnifiedCanaryEnvironmentAllowed()) return false;
  return (
    process.env.TASTE_UNIFIED_APPLY_ENABLED === "true" ||
    process.env.ENABLE_UNIFIED_CANARY === "true"
  );
}

/** True when production blocks apply without explicit ENABLE_UNIFIED_CANARY=true. */
export function isUnifiedApplyBlockedInProduction(): boolean {
  return process.env.NODE_ENV === "production" && process.env.ENABLE_UNIFIED_CANARY !== "true";
}
