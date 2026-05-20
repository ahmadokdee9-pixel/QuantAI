/**
 * Phase 2.1 registry placeholders — shadow-inactive until lane rules land in P2.2+.
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { QuantProduct } from "@/lib/shoppingScore";
import type {
  TasteIntentResult,
  TasteListingEvidenceResult,
  TasteModifierResult,
  VerticalTasteGrammarLaneId,
  VerticalTasteGrammarModule,
} from "@/lib/taste/verticalTasteContracts";

function inactiveIntent(): TasteIntentResult {
  return { intent01: 0, lane: null };
}

function inactiveListing(): TasteListingEvidenceResult {
  return { fit01: 0.5, evidenceTier: "none", violations: [] };
}

function inactiveModifiers(lane: VerticalTasteGrammarLaneId | null): TasteModifierResult {
  return { delta: 0, tasteFit01: 0.5, violations: [], evidenceTier: "none", lane };
}

function stubGrammar(
  grammarId: string,
  productCategory: VerticalTasteGrammarModule["productCategory"],
  lane: VerticalTasteGrammarLaneId,
  compareAxes: string[]
): VerticalTasteGrammarModule {
  return {
    grammarId,
    productCategory,
    compareAxes,
    detectIntent: () => inactiveIntent(),
    resolveGrammarLane: () => null,
    detectListingEvidence: () => inactiveListing(),
    computeTasteModifiers: () => inactiveModifiers(lane),
  };
}

export const electronicsFocusGrammar = stubGrammar(
  "electronics_focus_v0",
  "electronics",
  "electronics_focus_deep_work",
  ["distraction_profile", "connectivity_class", "workstation_integration"]
);

export const electronicsAudioGrammar = stubGrammar(
  "electronics_audio_v0",
  "audio",
  "electronics_audio_reference",
  ["signal_path", "isolation_class", "long_term_support"]
);

export const furnitureMinimalGrammar = stubGrammar(
  "furniture_minimal_v0",
  "furniture",
  "furniture_premium_minimal_desk",
  ["visual_restraint", "material_consistency", "desk_footprint"]
);

export const furnitureDeskSetupGrammar = stubGrammar(
  "furniture_desk_v0",
  "desk_setup",
  "furniture_ergonomic_work_setup",
  ["ergonomic_claims", "footprint", "cable_management"]
);

export const fragranceDesignerGrammar = stubGrammar(
  "fragrance_designer_v0",
  "fragrance",
  "fragrance_designer_signature",
  ["concentration_class", "wear_context", "authenticity_risk"]
);
