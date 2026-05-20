/**
 * Vertical Taste Grammar registry — Phase 2.1 institutional architecture.
 * Maps productCategory + grammarLaneId → grammar modules (shadow-ready).
 */

import { luxuryWatchGrammar } from "@/lib/taste/grammars/luxuryWatchGrammar";
import {
  electronicsAudioGrammar,
  electronicsFocusGrammar,
  fragranceDesignerGrammar,
  furnitureDeskSetupGrammar,
  furnitureMinimalGrammar,
} from "@/lib/taste/grammars/stubVerticalGrammars";
import type {
  SemanticProductCategory,
} from "@/lib/search/queryUnderstanding";
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

/** All registered lanes — stubs remain inactive (intent01=0) until P2.2+. */
export const VERTICAL_TASTE_REGISTRY: VerticalTasteRegistryEntry[] = [
  entry("watch_luxury_quiet", luxuryWatchGrammar),
  entry("watch_mechanical_collector", luxuryWatchGrammar),
  entry("watch_swiss_dress", luxuryWatchGrammar),
  entry("electronics_focus_deep_work", electronicsFocusGrammar),
  entry("electronics_audio_reference", electronicsAudioGrammar),
  entry("electronics_workstation_pro", electronicsFocusGrammar),
  entry("furniture_premium_minimal_desk", furnitureMinimalGrammar),
  entry("furniture_ergonomic_work_setup", furnitureDeskSetupGrammar),
  entry("fragrance_designer_signature", fragranceDesignerGrammar),
  entry("fragrance_niche_artisan", fragranceDesignerGrammar),
  entry("fragrance_luxury_haute", fragranceDesignerGrammar),
];

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

/** Primary active module for category (deduped by grammarId). */
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
