/**
 * Vertical Taste Grammar — institutional contracts (Phase 2.1).
 * Shadow-only; no embeddings; no memory-in-ranking.
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { SemanticProductCategory } from "@/lib/search/queryUnderstanding";
import type { QuantProduct } from "@/lib/shoppingScore";

export type TasteEvidenceTier = "E0" | "E1" | "E2" | "E3" | "none";

export type VerticalTasteGrammarLaneId =
  | "watch_mechanical_collector"
  | "watch_swiss_dress"
  | "watch_luxury_quiet"
  | "electronics_focus_deep_work"
  | "electronics_audio_reference"
  | "electronics_workstation_pro"
  | "furniture_premium_minimal_desk"
  | "furniture_ergonomic_work_setup"
  | "fragrance_designer_signature"
  | "fragrance_niche_artisan"
  | "fragrance_luxury_haute";

export type TasteIntentResult = {
  intent01: number;
  lane: VerticalTasteGrammarLaneId | null;
};

export type TasteListingEvidenceResult = {
  fit01: number;
  evidenceTier: TasteEvidenceTier;
  violations: string[];
};

export type TasteModifierResult = {
  /** Bounded delta — not applied to ranking until TASTE_GRAMMAR_ENABLED=true */
  delta: number;
  tasteFit01: number;
  violations: string[];
  evidenceTier: TasteEvidenceTier;
  lane: VerticalTasteGrammarLaneId | null;
};

export type VerticalTasteGrammarModule = {
  grammarId: string;
  productCategory: SemanticProductCategory;
  compareAxes: string[];
  detectIntent(query: string, canonicalQuery?: CanonicalQueryContract): TasteIntentResult;
  resolveGrammarLane(query: string, canonicalQuery?: CanonicalQueryContract): VerticalTasteGrammarLaneId | null;
  detectListingEvidence(
    product: QuantProduct,
    canonicalQuery?: CanonicalQueryContract
  ): TasteListingEvidenceResult;
  computeTasteModifiers(
    query: string,
    product: QuantProduct,
    canonicalQuery?: CanonicalQueryContract
  ): TasteModifierResult;
};

export type VerticalTasteRegistryEntry = {
  productCategory: SemanticProductCategory;
  grammarLaneId: VerticalTasteGrammarLaneId;
  grammarId: string;
  intentModule: VerticalTasteGrammarModule;
  listingEvidenceModule: VerticalTasteGrammarModule;
  tasteModifierModule: VerticalTasteGrammarModule;
  compareAxes: string[];
};

export type VerticalTasteShadowRow = {
  title: string;
  store: string;
  grammarLane: VerticalTasteGrammarLaneId | null;
  tasteFit01: number;
  tasteViolations: string[];
  evidenceTier: TasteEvidenceTier;
  shadowDelta: number;
};

export type VerticalTasteShadowMeta = {
  version: string;
  active: boolean;
  /** Institutional vertical key (canonical category). */
  vertical: SemanticProductCategory | null;
  productCategory: SemanticProductCategory | null;
  grammarLane: VerticalTasteGrammarLaneId | null;
  grammarId: string | null;
  intent01: number;
  applyEnabled: boolean;
  /** Aggregate tray taste fit (0–1). */
  tasteFit: number | null;
  tasteFit01: number | null;
  tasteViolations: string[];
  /** Alias for tasteViolations (telemetry contract). */
  violations: string[];
  evidenceTier: TasteEvidenceTier;
  compareAxes: string[];
  rows: VerticalTasteShadowRow[];
  latencyMs: number;
  skippedReason?: string;
};
