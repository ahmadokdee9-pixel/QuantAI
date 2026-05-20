/**
 * Phase 2.1 taste grammar feature flags — apply off by default; shadow on unless disabled.
 */

/** Bump when grammar rules change (rollback-safe cache invalidation). */
export const TASTE_GRAMMAR_PIPELINE_CACHE_KEY = "quantai-search-pipeline-v49-taste-grammar-shadow-v1";

export const TASTE_GRAMMAR_SHADOW_META_VERSION = "vertical-taste-shadow-v1";

/** Max CPU time budget for shadow pass (ms). */
export const TASTE_GRAMMAR_SHADOW_BUDGET_MS = 8;

/** Max listings evaluated in shadow pass. */
export const TASTE_GRAMMAR_SHADOW_TOP_N = 5;

/** Intent threshold to activate grammar shadow (matches Phase 1 luxury watch gate). */
export const TASTE_GRAMMAR_INTENT_THRESHOLD = 0.42;

/**
 * When true, taste modifiers may be applied to ranking (Phase 2.2+).
 * Phase 2.1: must remain false in production.
 */
export function isTasteGrammarApplyEnabled(): boolean {
  return process.env.TASTE_GRAMMAR_ENABLED === "true";
}

/** Shadow meta emission — default on; set TASTE_GRAMMAR_SHADOW=false to disable. */
export function isTasteGrammarShadowEnabled(): boolean {
  return process.env.TASTE_GRAMMAR_SHADOW !== "false";
}
