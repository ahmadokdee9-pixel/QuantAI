/**
 * Phase 4.0/4.1/4.3 — Intent Intelligence flags (meta on by default; apply off by default).
 */

export const INTENT_INTELLIGENCE_META_VERSION = "intent-intelligence-v1" as const;

export const INTENT_APPLY_VERSION = "intent-apply-v1" as const;

/** P4.3 production activation telemetry version. */
export const INTENT_PRODUCTION_APPLY_VERSION = "intent-production-apply-v1" as const;

/** P4.1 bounded intent apply cap (below unified ±4). */
export const INTENT_APPLY_MAX_DELTA = 3;

/** P4.1 apply confidence gate. */
export const INTENT_APPLY_CONFIDENCE_MIN = 0.68;

/** Unified institutional coherence minimum when unified meta is active. */
export const INTENT_APPLY_COHERENCE_MIN = 0.55;

export const INTENT_APPLY_PRESTIGE_MIN = 0.68;

export type IntentRolloutMode = "off" | "staging" | "canary" | "production";

/** Meta emission — default on; set INTENT_INTELLIGENCE=false to disable. */
export function isIntentIntelligenceMetaEnabled(): boolean {
  return process.env.INTENT_INTELLIGENCE !== "false";
}

/** P4.3 hard rollback — forces intent apply OFF everywhere. */
export function isIntentApplyHardRollback(): boolean {
  return process.env.INTENT_INTELLIGENCE_APPLY_ENABLED === "false";
}

/**
 * P4.3 production environment guard.
 * NODE_ENV=production alone must NOT allow apply — explicit prod or canary opt-in required.
 */
export function isIntentApplyEnvironmentAllowed(): boolean {
  if (isIntentApplyHardRollback()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return (
    process.env.INTENT_INTELLIGENCE_PROD_APPLY === "true" ||
    process.env.INTENT_INTELLIGENCE_CANARY_APPLY === "true"
  );
}

/** True when production blocks apply without explicit prod/canary opt-in. */
export function isIntentApplyBlockedInProduction(): boolean {
  return process.env.NODE_ENV === "production" && !isIntentApplyEnvironmentAllowed();
}

export function isIntentProdApplyOptIn(): boolean {
  return process.env.INTENT_INTELLIGENCE_PROD_APPLY === "true";
}

export function isIntentCanaryApplyOptIn(): boolean {
  return process.env.INTENT_INTELLIGENCE_CANARY_APPLY === "true";
}

/** Resolves rollout lane for telemetry and gradual activation. */
export function resolveIntentRolloutMode(): IntentRolloutMode {
  if (isIntentApplyHardRollback()) return "off";
  if (process.env.INTENT_INTELLIGENCE_APPLY_ENABLED !== "true") return "off";
  if (!isIntentApplyEnvironmentAllowed()) return "off";
  if (process.env.NODE_ENV !== "production") return "staging";
  if (isIntentProdApplyOptIn()) return "production";
  if (isIntentCanaryApplyOptIn()) return "canary";
  return "off";
}

/**
 * P4.1/P4.3/P4.5 bounded intent apply — gated via canary controller (session buckets in production).
 * @see lib/intent/intentCanaryController.ts
 */
export { isIntentIntelligenceApplyEnabled } from "@/lib/intent/intentCanaryController";
