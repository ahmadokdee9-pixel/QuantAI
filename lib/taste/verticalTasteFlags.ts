/**
 * Phase 2.2 taste grammar feature flags — apply off by default; shadow on unless disabled.
 */

import type { SemanticProductCategory } from "@/lib/search/queryUnderstanding";

/** Bump when grammar rules change (rollback-safe cache invalidation). */
export const TASTE_GRAMMAR_PIPELINE_CACHE_KEY = "quantai-search-pipeline-v50-taste-grammar-shadow-v2";

export const TASTE_GRAMMAR_SHADOW_META_VERSION = "vertical-taste-shadow-v2";

/** Max CPU time budget for shadow pass (ms) — hard skip beyond this. */
export const TASTE_GRAMMAR_SHADOW_BUDGET_MS = 12;

/** Max listings evaluated in shadow pass. */
export const TASTE_GRAMMAR_SHADOW_TOP_N = 5;

/** Default intent threshold (watch / Phase 1 parity). */
export const TASTE_GRAMMAR_INTENT_THRESHOLD = 0.42;

const SHADOW_INTENT_BY_CATEGORY: Partial<Record<SemanticProductCategory, number>> = {
  watch: 0.42,
  electronics: 0.32,
  audio: 0.32,
  furniture: 0.3,
  desk_setup: 0.3,
  fragrance: 0.32,
};

export function getShadowIntentThreshold(category: SemanticProductCategory): number {
  return SHADOW_INTENT_BY_CATEGORY[category] ?? TASTE_GRAMMAR_INTENT_THRESHOLD;
}

/**
 * When true, taste modifiers may be applied to ranking (Phase 2.3+).
 * Phase 2.2: must remain false in production.
 */
export function isTasteGrammarApplyEnabled(): boolean {
  return process.env.TASTE_GRAMMAR_ENABLED === "true";
}

/** Shadow meta emission — default on; set TASTE_GRAMMAR_SHADOW=false to disable. */
export function isTasteGrammarShadowEnabled(): boolean {
  return process.env.TASTE_GRAMMAR_SHADOW !== "false";
}

/** Full-search latency regression allowance vs baseline (ms). */
export const TASTE_GATE_LATENCY_REGRESSION_MS = Number(process.env.TASTE_GATE_LATENCY_REGRESSION_MS || 200);
