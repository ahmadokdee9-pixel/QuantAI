/**
 * Phase 4.0/4.1 — Intent Intelligence flags (meta on by default; apply off by default).
 */

export const INTENT_INTELLIGENCE_META_VERSION = "intent-intelligence-v1" as const;

export const INTENT_APPLY_VERSION = "intent-apply-v1" as const;

/** P4.1 bounded intent apply cap (below unified ±4). */
export const INTENT_APPLY_MAX_DELTA = 3;

/** P4.1 apply confidence gate. */
export const INTENT_APPLY_CONFIDENCE_MIN = 0.68;

/** Unified institutional coherence minimum when unified meta is active. */
export const INTENT_APPLY_COHERENCE_MIN = 0.55;

export const INTENT_APPLY_PRESTIGE_MIN = 0.68;

/** Meta emission — default on; set INTENT_INTELLIGENCE=false to disable. */
export function isIntentIntelligenceMetaEnabled(): boolean {
  return process.env.INTENT_INTELLIGENCE !== "false";
}

/**
 * P4.1 bounded intent apply — OFF by default.
 * Rollback: INTENT_INTELLIGENCE_APPLY_ENABLED=false
 */
export function isIntentIntelligenceApplyEnabled(): boolean {
  return process.env.INTENT_INTELLIGENCE_APPLY_ENABLED === "true";
}
