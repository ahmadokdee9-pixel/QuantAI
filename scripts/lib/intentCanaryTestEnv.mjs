/**
 * P4.5 — Shared canary test environment presets.
 */

export const CANARY_PRODUCTION_ENV = {
  NODE_ENV: "production",
  INTENT_INTELLIGENCE_APPLY_ENABLED: "true",
  INTENT_INTELLIGENCE_CANARY_APPLY: "true",
  TASTE_UNIFIED_APPLY_ENABLED: "false",
  TASTE_GRAMMAR_ENABLED: "false",
  TASTE_FRAGRANCE_GRAMMAR_ENABLED: "false",
  TASTE_FURNITURE_GRAMMAR_ENABLED: "false",
};

export function applyCanaryEnv(extra = {}) {
  for (const [k, v] of Object.entries({ ...CANARY_PRODUCTION_ENV, ...extra })) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = String(v);
  }
  if (!("INTENT_INTELLIGENCE_PROD_APPLY" in extra)) {
    delete process.env.INTENT_INTELLIGENCE_PROD_APPLY;
  }
}

export function snapshotCanaryEnv() {
  return {
    NODE_ENV: process.env.NODE_ENV,
    INTENT_INTELLIGENCE_APPLY_ENABLED: process.env.INTENT_INTELLIGENCE_APPLY_ENABLED,
    INTENT_INTELLIGENCE_PROD_APPLY: process.env.INTENT_INTELLIGENCE_PROD_APPLY,
    INTENT_INTELLIGENCE_CANARY_APPLY: process.env.INTENT_INTELLIGENCE_CANARY_APPLY,
    INTENT_CANARY_PERCENTAGE: process.env.INTENT_CANARY_PERCENTAGE,
    INTENT_CANARY_ROLLOUT_STAGE: process.env.INTENT_CANARY_ROLLOUT_STAGE,
    INTENT_CANARY_EMERGENCY_DISABLE: process.env.INTENT_CANARY_EMERGENCY_DISABLE,
    TASTE_UNIFIED_APPLY_ENABLED: process.env.TASTE_UNIFIED_APPLY_ENABLED,
  };
}

export function restoreCanaryEnv(saved) {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}
