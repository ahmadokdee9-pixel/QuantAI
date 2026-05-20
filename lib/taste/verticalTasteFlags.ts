/**
 * Phase 2.2 taste grammar feature flags — apply off by default; shadow on unless disabled.
 */

import type { SemanticProductCategory } from "@/lib/search/queryUnderstanding";

/** Bump when grammar rules change (rollback-safe cache invalidation). */
export const TASTE_GRAMMAR_PIPELINE_CACHE_KEY = "quantai-search-pipeline-v56-unified-live-soak-v1";

/** Max bounded taste score delta (watches canary). */
export const TASTE_WATCH_APPLY_MAX_DELTA = 12;

/** Max bounded taste score delta (fragrance canary). */
export const TASTE_FRAGRANCE_APPLY_MAX_DELTA = 12;

/** Fragrance apply intent threshold. */
export const TASTE_FRAGRANCE_APPLY_INTENT_THRESHOLD = 0.32;

/** Max bounded taste score delta (furniture canary). */
export const TASTE_FURNITURE_APPLY_MAX_DELTA = 12;

/** Furniture apply intent threshold. */
export const TASTE_FURNITURE_APPLY_INTENT_THRESHOLD = 0.3;

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
 * When true, WATCHES-ONLY taste apply is active (Phase 2.4 canary).
 * Rollback: set TASTE_GRAMMAR_ENABLED=false.
 */
export function isTasteGrammarApplyEnabled(): boolean {
  return process.env.TASTE_GRAMMAR_ENABLED === "true";
}

/** When true, FRAGRANCE-ONLY taste apply is active (Phase 2.5 canary). */
export function isFragranceTasteApplyEnabled(): boolean {
  return process.env.TASTE_FRAGRANCE_GRAMMAR_ENABLED === "true";
}

/** When true, FURNITURE/DESK_SETUP-ONLY taste apply is active (Phase 2.6 canary). */
export function isFurnitureTasteApplyEnabled(): boolean {
  return process.env.TASTE_FURNITURE_GRAMMAR_ENABLED === "true";
}

export function isWatchOnlyTasteApplyEnabled(): boolean {
  return isTasteGrammarApplyEnabled();
}

/** Shadow meta emission — default on; set TASTE_GRAMMAR_SHADOW=false to disable. */
export function isTasteGrammarShadowEnabled(): boolean {
  return process.env.TASTE_GRAMMAR_SHADOW !== "false";
}

/** Full-search latency regression allowance vs baseline (ms). */
export const TASTE_GATE_LATENCY_REGRESSION_MS = Number(process.env.TASTE_GATE_LATENCY_REGRESSION_MS || 200);
