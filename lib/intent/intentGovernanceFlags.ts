/**
 * P4.8 — Intelligence governance thresholds (advisory meta-only; no autonomous enforcement).
 */

export const INTENT_GOVERNANCE_VERSION = "intent-governance-v1" as const;

export const INTENT_GOV_MIN_GOVERNANCE_SCORE = 55;

export const INTENT_GOV_MIN_SUPPRESSION_SAFETY = 60;

export const INTENT_GOV_MIN_TRUST_SAFETY = 60;

export const INTENT_GOV_MERCHANT_DIVERSITY_MIN = 2;

/** Meta emission — default on; set INTENT_GOVERNANCE=false to disable. */
export function isIntentGovernanceEnabled(): boolean {
  return process.env.INTENT_GOVERNANCE !== "false";
}

/** Governance never mutates ranking or applies policy at runtime. */
export function isIntentGovernanceAdvisoryOnly(): boolean {
  return true;
}

export function isIntentGovernanceAutonomousBlocked(): boolean {
  return true;
}
