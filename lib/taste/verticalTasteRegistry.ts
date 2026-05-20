/**
 * Vertical Taste Grammar registry — Phase 2.2 shadow-active lanes.
 */

import { audioTasteGrammar, electronicsTasteGrammar } from "@/lib/taste/grammars/electronicsTasteGrammar";
import { deskSetupTasteGrammar, furnitureTasteGrammar } from "@/lib/taste/grammars/furnitureTasteGrammar";
import { fragranceTasteGrammar } from "@/lib/taste/grammars/fragranceTasteGrammar";
import { luxuryWatchGrammar } from "@/lib/taste/grammars/luxuryWatchGrammar";
import { TASTE_COMPARE_AXES_BY_VERTICAL } from "@/lib/taste/tasteGrammarEvidence";
import type { SemanticProductCategory } from "@/lib/search/queryUnderstanding";
import type {
  VerticalTasteGrammarLaneId,
  VerticalTasteGrammarModule,
  VerticalTasteRegistryEntry,
} from "@/lib/taste/verticalTasteContracts";

function entry(
  grammarLaneId: VerticalTasteGrammarLaneId,
  module: VerticalTasteGrammarModule
): VerticalTasteRegistryEntry {
  return {
    productCategory: module.productCategory,
    grammarLaneId,
    grammarId: module.grammarId,
    intentModule: module,
    listingEvidenceModule: module,
    tasteModifierModule: module,
    compareAxes: module.compareAxes,
  };
}

/** Canonical lane registry — compareAxes from module or vertical fallback. */
export const VERTICAL_TASTE_REGISTRY: VerticalTasteRegistryEntry[] = [
  entry("watch_luxury_quiet", luxuryWatchGrammar),
  entry("watch_mechanical_collector", luxuryWatchGrammar),
  entry("watch_swiss_dress", luxuryWatchGrammar),
  entry("electronics_focus_deep_work", electronicsTasteGrammar),
  entry("electronics_audio_reference", audioTasteGrammar),
  entry("electronics_workstation_pro", electronicsTasteGrammar),
  entry("furniture_premium_minimal_desk", furnitureTasteGrammar),
  entry("furniture_ergonomic_work_setup", deskSetupTasteGrammar),
  entry("fragrance_designer_signature", fragranceTasteGrammar),
  entry("fragrance_niche_artisan", fragranceTasteGrammar),
  entry("fragrance_luxury_haute", fragranceTasteGrammar),
];

export const VERTICAL_COMPARE_AXES_MAP: Record<string, readonly string[]> = {
  ...TASTE_COMPARE_AXES_BY_VERTICAL,
};

const CATEGORY_INDEX = new Map<SemanticProductCategory, VerticalTasteRegistryEntry[]>();

for (const row of VERTICAL_TASTE_REGISTRY) {
  const list = CATEGORY_INDEX.get(row.productCategory) ?? [];
  list.push(row);
  CATEGORY_INDEX.set(row.productCategory, list);
}

/** Lazy lookup — only grammars for resolved category (latency discipline). */
export function getRegistryEntriesForCategory(
  category: SemanticProductCategory
): VerticalTasteRegistryEntry[] {
  return CATEGORY_INDEX.get(category) ?? [];
}

/** Active modules for category (deduped by grammarId). */
export function getActiveGrammarModulesForCategory(
  category: SemanticProductCategory
): VerticalTasteGrammarModule[] {
  const seen = new Set<string>();
  const modules: VerticalTasteGrammarModule[] = [];
  for (const row of getRegistryEntriesForCategory(category)) {
    if (seen.has(row.grammarId)) continue;
    seen.add(row.grammarId);
    modules.push(row.intentModule);
  }
  return modules;
}

export function findRegistryEntryByLane(
  lane: VerticalTasteGrammarLaneId
): VerticalTasteRegistryEntry | undefined {
  return VERTICAL_TASTE_REGISTRY.find((r) => r.grammarLaneId === lane);
}

export function compareAxesForCategory(category: SemanticProductCategory): string[] {
  const modules = getActiveGrammarModulesForCategory(category);
  if (modules[0]?.compareAxes.length) return [...modules[0].compareAxes];
  const axes = VERTICAL_COMPARE_AXES_MAP[category];
  return axes ? [...axes] : [];
}
