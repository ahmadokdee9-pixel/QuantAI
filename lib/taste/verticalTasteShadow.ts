/**
 * Vertical taste shadow pass — meta-only; never mutates ranking order.
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { SemanticProductCategory } from "@/lib/search/queryUnderstanding";
import type { QuantProduct } from "@/lib/shoppingScore";
import {
  compareAxesForCategory,
  getActiveGrammarModulesForCategory,
} from "@/lib/taste/verticalTasteRegistry";
import type { VerticalTasteShadowMeta, VerticalTasteShadowRow } from "@/lib/taste/verticalTasteContracts";
import { isFragranceTasteApplyEnabled } from "@/lib/taste/fragranceTasteApply";
import { isWatchTasteApplyEnabled } from "@/lib/taste/watchTasteApply";
import {
  getShadowIntentThreshold,
  isTasteGrammarApplyEnabled,
  isTasteGrammarShadowEnabled,
  TASTE_GRAMMAR_SHADOW_BUDGET_MS,
  TASTE_GRAMMAR_SHADOW_META_VERSION,
  TASTE_GRAMMAR_SHADOW_TOP_N,
} from "@/lib/taste/verticalTasteFlags";

function inactiveShadow(
  category: SemanticProductCategory | null,
  skippedReason: string,
  latencyMs: number
): VerticalTasteShadowMeta {
  const applyEnabled =
    category === "watch"
      ? isWatchTasteApplyEnabled()
      : category === "fragrance"
        ? isFragranceTasteApplyEnabled()
        : false;
  return {
    version: TASTE_GRAMMAR_SHADOW_META_VERSION,
    active: false,
    vertical: category,
    productCategory: category,
    grammarLane: null,
    grammarId: null,
    intent01: 0,
    applyEnabled,
    tasteFit: null,
    tasteFit01: null,
    tasteViolations: [],
    violations: [],
    evidenceTier: "none",
    compareAxes: category ? compareAxesForCategory(category) : [],
    rows: [],
    latencyMs,
    skippedReason,
  };
}

function budgetExceeded(
  partial: Omit<VerticalTasteShadowMeta, "latencyMs" | "skippedReason">,
  started: number
): VerticalTasteShadowMeta {
  return {
    ...partial,
    latencyMs: Date.now() - started,
    skippedReason: "shadow_budget_exceeded",
    active: true,
  };
}

/**
 * Shadow-only taste evaluation after category resolution.
 * Does not reorder products or alter composite scores.
 */
export function buildVerticalTasteShadowMeta(args: {
  query: string;
  canonicalQuery: CanonicalQueryContract;
  products: QuantProduct[];
}): VerticalTasteShadowMeta {
  const started = Date.now();
  const { query, canonicalQuery, products } = args;
  const category = canonicalQuery.category as SemanticProductCategory;

  if (!isTasteGrammarShadowEnabled()) {
    return inactiveShadow(category, "shadow_disabled", Date.now() - started);
  }

  if (category === "unknown") {
    return inactiveShadow(category, "unknown_category", Date.now() - started);
  }

  const modules = getActiveGrammarModulesForCategory(category);
  if (modules.length === 0) {
    return inactiveShadow(category, "no_registry_modules", Date.now() - started);
  }

  const intentThreshold = getShadowIntentThreshold(category);
  let bestIntent01 = 0;
  let activeModule = modules[0];
  let grammarLane = activeModule.resolveGrammarLane(query, canonicalQuery);

  for (const mod of modules) {
    if (Date.now() - started > TASTE_GRAMMAR_SHADOW_BUDGET_MS) {
      return budgetExceeded(
        {
          version: TASTE_GRAMMAR_SHADOW_META_VERSION,
          active: true,
          vertical: category,
          productCategory: category,
          grammarLane,
          grammarId: activeModule.grammarId,
          intent01: bestIntent01,
          applyEnabled: false,
          tasteFit: null,
          tasteFit01: null,
          tasteViolations: [],
          violations: [],
          evidenceTier: "none",
          compareAxes: compareAxesForCategory(category),
          rows: [],
        },
        started
      );
    }
    const intent = mod.detectIntent(query, canonicalQuery);
    if (intent.intent01 > bestIntent01) {
      bestIntent01 = intent.intent01;
      activeModule = mod;
      grammarLane = intent.lane ?? mod.resolveGrammarLane(query, canonicalQuery);
    }
  }

  if (bestIntent01 < intentThreshold) {
    return inactiveShadow(category, "intent_below_threshold", Date.now() - started);
  }

  const compareAxes = activeModule.compareAxes.length
    ? [...activeModule.compareAxes]
    : compareAxesForCategory(category);

  const rows: VerticalTasteShadowRow[] = [];
  const top = products.slice(0, TASTE_GRAMMAR_SHADOW_TOP_N);
  const aggregateViolations = new Set<string>();
  let aggregateFit = 0;
  let aggregateTier = "none" as VerticalTasteShadowMeta["evidenceTier"];

  for (const product of top) {
    if (Date.now() - started > TASTE_GRAMMAR_SHADOW_BUDGET_MS) {
      const violations = [...aggregateViolations];
      const tasteFit01 = top.length ? aggregateFit / Math.max(1, rows.length) : null;
      return budgetExceeded(
        {
          version: TASTE_GRAMMAR_SHADOW_META_VERSION,
          active: true,
          vertical: category,
          productCategory: category,
          grammarLane,
          grammarId: activeModule.grammarId,
          intent01: bestIntent01,
          applyEnabled: false,
          tasteFit: tasteFit01,
          tasteFit01,
          tasteViolations: violations,
          violations,
          evidenceTier: aggregateTier,
          compareAxes,
          rows,
        },
        started
      );
    }

    const modifiers = activeModule.computeTasteModifiers(query, product, canonicalQuery);
    const listing = activeModule.detectListingEvidence(product, canonicalQuery);
    for (const v of [...modifiers.violations, ...listing.violations]) aggregateViolations.add(v);
    aggregateFit += modifiers.tasteFit01;
    if (listing.evidenceTier !== "none") aggregateTier = listing.evidenceTier;
    if (modifiers.evidenceTier !== "none" && aggregateTier === "none") aggregateTier = modifiers.evidenceTier;

    rows.push({
      title: product.title.slice(0, 80),
      store: product.store,
      grammarLane: modifiers.lane ?? grammarLane,
      tasteFit01: modifiers.tasteFit01,
      tasteViolations: [...new Set([...modifiers.violations, ...listing.violations])],
      evidenceTier: modifiers.evidenceTier !== "none" ? modifiers.evidenceTier : listing.evidenceTier,
      shadowDelta:
        (category === "watch" && isWatchTasteApplyEnabled()) ||
        (category === "fragrance" && isFragranceTasteApplyEnabled())
          ? modifiers.delta
          : 0,
    });
  }

  const tasteFit01 = top.length ? aggregateFit / top.length : null;
  const violations = [...aggregateViolations];

  return {
    version: TASTE_GRAMMAR_SHADOW_META_VERSION,
    active: true,
    vertical: category,
    productCategory: category,
    grammarLane,
    grammarId: activeModule.grammarId,
    intent01: bestIntent01,
    applyEnabled:
      category === "watch"
        ? isWatchTasteApplyEnabled()
        : category === "fragrance"
          ? isFragranceTasteApplyEnabled()
          : false,
    tasteFit: tasteFit01,
    tasteFit01,
    tasteViolations: violations,
    violations,
    evidenceTier: aggregateTier,
    compareAxes,
    rows,
    latencyMs: Date.now() - started,
  };
}
