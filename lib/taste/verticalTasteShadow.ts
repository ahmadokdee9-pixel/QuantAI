/**
 * Vertical taste shadow pass — meta-only; never mutates ranking order.
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { SemanticProductCategory } from "@/lib/search/queryUnderstanding";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getActiveGrammarModulesForCategory } from "@/lib/taste/verticalTasteRegistry";
import type { VerticalTasteShadowMeta, VerticalTasteShadowRow } from "@/lib/taste/verticalTasteContracts";
import {
  isTasteGrammarApplyEnabled,
  isTasteGrammarShadowEnabled,
  TASTE_GRAMMAR_INTENT_THRESHOLD,
  TASTE_GRAMMAR_SHADOW_BUDGET_MS,
  TASTE_GRAMMAR_SHADOW_META_VERSION,
  TASTE_GRAMMAR_SHADOW_TOP_N,
} from "@/lib/taste/verticalTasteFlags";

function inactiveShadow(
  category: SemanticProductCategory | null,
  skippedReason: string,
  latencyMs: number
): VerticalTasteShadowMeta {
  return {
    version: TASTE_GRAMMAR_SHADOW_META_VERSION,
    active: false,
    productCategory: category,
    grammarLane: null,
    grammarId: null,
    intent01: 0,
    applyEnabled: isTasteGrammarApplyEnabled(),
    tasteFit01: null,
    tasteViolations: [],
    evidenceTier: "none",
    rows: [],
    latencyMs,
    skippedReason,
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

  let bestIntent01 = 0;
  let activeModule = modules[0];
  let grammarLane = activeModule.resolveGrammarLane(query, canonicalQuery);

  for (const mod of modules) {
    const intent = mod.detectIntent(query, canonicalQuery);
    if (intent.intent01 > bestIntent01) {
      bestIntent01 = intent.intent01;
      activeModule = mod;
      grammarLane = intent.lane ?? mod.resolveGrammarLane(query, canonicalQuery);
    }
  }

  if (bestIntent01 < TASTE_GRAMMAR_INTENT_THRESHOLD) {
    return inactiveShadow(category, "intent_below_threshold", Date.now() - started);
  }

  const rows: VerticalTasteShadowRow[] = [];
  const top = products.slice(0, TASTE_GRAMMAR_SHADOW_TOP_N);
  const aggregateViolations = new Set<string>();
  let aggregateFit = 0;
  let aggregateTier = "none" as VerticalTasteShadowMeta["evidenceTier"];

  for (const product of top) {
    if (Date.now() - started > TASTE_GRAMMAR_SHADOW_BUDGET_MS) {
      return {
        ...inactiveShadow(category, "shadow_budget_exceeded", Date.now() - started),
        intent01: bestIntent01,
        grammarId: activeModule.grammarId,
        grammarLane,
        active: true,
      };
    }

    const modifiers = activeModule.computeTasteModifiers(query, product, canonicalQuery);
    const listing = activeModule.detectListingEvidence(product, canonicalQuery);
    for (const v of [...modifiers.violations, ...listing.violations]) aggregateViolations.add(v);
    aggregateFit += modifiers.tasteFit01;
    if (listing.evidenceTier !== "none") aggregateTier = listing.evidenceTier;

    rows.push({
      title: product.title.slice(0, 80),
      store: product.store,
      grammarLane: modifiers.lane ?? grammarLane,
      tasteFit01: modifiers.tasteFit01,
      tasteViolations: [...new Set([...modifiers.violations, ...listing.violations])],
      evidenceTier: modifiers.evidenceTier !== "none" ? modifiers.evidenceTier : listing.evidenceTier,
      shadowDelta: isTasteGrammarApplyEnabled() ? modifiers.delta : 0,
    });
  }

  const tasteFit01 = top.length ? aggregateFit / top.length : null;

  return {
    version: TASTE_GRAMMAR_SHADOW_META_VERSION,
    active: true,
    productCategory: category,
    grammarLane,
    grammarId: activeModule.grammarId,
    intent01: bestIntent01,
    applyEnabled: isTasteGrammarApplyEnabled(),
    tasteFit01,
    tasteViolations: [...aggregateViolations],
    evidenceTier: aggregateTier,
    rows,
    latencyMs: Date.now() - started,
  };
}
