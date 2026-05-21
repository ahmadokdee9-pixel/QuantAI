/**
 * P4.5 — Controlled production canary rollout constants.
 */

export const INTENT_CANARY_VERSION = "intent-canary-v1" as const;

export const INTENT_CANARY_STAGES = [1, 5, 10, 25, 50, 100] as const;

export type IntentCanaryRolloutStage = (typeof INTENT_CANARY_STAGES)[number];

export const INTENT_CANARY_BUCKET_COUNT = 100;

/** FNV-1a salt for stable session partitions. */
export const INTENT_CANARY_HASH_SALT = "quantai-intent-canary-v1";
