/**
 * Public beta production env manifest — APPLY off, Phases 11–18 off.
 * Used by verify-beta-production-env.mjs and docs/PRODUCTION_ENV_MANIFEST.md.
 */

/** Must be false or unset in Production for public beta. */
export const BETA_APPLY_FLAGS_FALSE = [
  "QUANTAI_NORMALIZATION_APPLY",
  "QUANTAI_NORMALIZATION_APPLY_PRODUCTION_CONFIRMED",
  "QUANTAI_NORMALIZATION_APPLY_CANARY",
  "QUANTAI_NORMALIZATION_CANARY_CONFIRMED",
  "TASTE_UNIFIED_APPLY_ENABLED",
  "INTENT_INTELLIGENCE_APPLY_ENABLED",
  "INTENT_INTELLIGENCE_PROD_APPLY",
  "INTENT_INTELLIGENCE_CANARY_APPLY",
  "INTENT_RUNTIME_PROD_APPLY",
  "INTENT_RUNTIME_CANARY_APPLY",
  "INTENT_ORCHESTRATION_PROD_APPLY",
  "INTENT_ORCHESTRATION_CANARY_APPLY",
];

/** Intelligence layers 11–18 + related — must be false or unset for beta. */
export const BETA_PHASE_11_18_OFF = [
  "QUANTAI_COMMERCE_BRAIN_ENABLED",
  "QUANTAI_LIVE_COMMERCE_SIGNALS_ENABLED",
  "QUANTAI_AUTONOMOUS_COMMERCE_IDENTITY_ENABLED",
  "QUANTAI_PREDICTIVE_COMMERCE_INTENT_ENABLED",
  "QUANTAI_AUTONOMOUS_COMMERCE_STRATEGY_ENABLED",
  "QUANTAI_UNIVERSAL_COMMERCE_INTELLIGENCE_ENABLED",
  "QUANTAI_EMOTIONAL_COMMERCE_INTELLIGENCE_ENABLED",
  "QUANTAI_AUTONOMOUS_COMMERCE_EVOLUTION_ENABLED",
];

/** Earlier shadow phases — recommended OFF for beta (latency + meta only). */
export const BETA_RECOMMENDED_SHADOW_OFF = [
  "QUANTAI_COMMERCE_EVOLUTION_ENABLED",
  "QUANTAI_CONTROLLED_ACTIVATION_ENABLED",
  "QUANTAI_AUTONOMOUS_COMMERCE_OS_ENABLED",
  "QUANTAI_RECOMMENDATION_COGNITION_ENABLED",
  "QUANTAI_COMMERCE_MEMORY_ENABLED",
  "QUANTAI_TRUST_ENGINE_ENABLED",
  "QUANTAI_IDENTITY_FOUNDATION_ENABLED",
];

/** Required non-empty in Production. */
export const BETA_REQUIRED_SECRETS = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SERPAPI_KEY",
  "OPENAI_API_KEY",
];

/** Strongly recommended Production. */
export const BETA_RECOMMENDED_SECRETS = [
  "NEXT_PUBLIC_APP_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "QUANTAI_ANALYTICS_SINK_URL",
];

/** Safe beta normalization (optional shadow telemetry). */
export const BETA_NORMALIZATION_SAFE = {
  QUANTAI_NORMALIZATION_ENABLED: "true",
  QUANTAI_NORMALIZATION_MODE: "shadow",
  QUANTAI_NORMALIZATION_APPLY: "false",
  QUANTAI_NORMALIZATION_SHADOW_TELEMETRY: "true",
  QUANTAI_SEARCH_META_LITE: "true",
};

export function parseEnvBool(raw) {
  if (raw == null || String(raw).trim() === "") return null;
  const v = String(raw).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(v)) return true;
  if (["false", "0", "no", "off"].includes(v)) return false;
  return null;
}

export function isTruthyEnv(env, key) {
  return parseEnvBool(env[key]) === true;
}
