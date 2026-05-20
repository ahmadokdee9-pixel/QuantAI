/**
 * Institutional evidence dictionaries + violation classifiers (Phase 2.2 shadow).
 */

import type { TasteEvidenceTier } from "@/lib/taste/verticalTasteContracts";

export const TASTE_VIOLATION_CODES = {
  fitness_pollution: "fitness_pollution",
  false_luxury_posture: "false_luxury_posture",
  gaming_rgb_pollution: "gaming_rgb_pollution",
  aesthetic_mismatch: "aesthetic_mismatch",
  inspired_by_dupe: "inspired_by_dupe",
  concentration_mismatch: "concentration_mismatch",
  authenticity_risk: "authenticity_risk",
  accessory_not_main: "accessory_not_main",
  party_audio_pollution: "party_audio_pollution",
} as const;

export type TasteViolationCode = (typeof TASTE_VIOLATION_CODES)[keyof typeof TASTE_VIOLATION_CODES];

/** E0 title-token evidence buckets per vertical (shadow classification only). */
export const TASTE_EVIDENCE_DICTIONARIES = {
  electronics_focus: /\b(anc|noise cancel|quietcomfort|wh-1000|focus|deep work|distraction|over[-\s]?ear)\b/i,
  electronics_audio_ref: /\b(studio|reference|neutral|wired|dac|amp|open[-\s]?back|monitor headphone)\b/i,
  electronics_workstation: /\b(monitor|dock|thunderbolt|usb-c pd|vesa|ips|oled|mechanical keyboard|workstation)\b/i,
  electronics_gaming_pollution: /\b(gaming|rgb|bass boost|party|led ear)\b/i,
  furniture_minimal: /\b(minimal|matte|scandi|walnut|oak|slim|monochrome|cable management|standing desk)\b/i,
  furniture_gamer_pollution: /\b(gaming chair|racer|rgb|led trim|gamer)\b/i,
  furniture_ergonomic: /\b(ergonomic|lumbar|adjustable|sit[-\s]?stand|office chair|herman|steelcase)\b/i,
  fragrance_designer: /\b(eau de parfum|edp|designer|libre|ysl|chanel|dior|tom ford|90ml|100ml)\b/i,
  fragrance_niche: /\b(niche|artisan|indie|perfume house|attar)\b/i,
  fragrance_luxury: /\b(extrait|haute|parfum|luxury|refillable|collection privée)\b/i,
  fragrance_dupe: /\b(inspired by|dupe|clone|imitation|type scent|smell like)\b/i,
  fragrance_concentration: /\b(edp|edt|extrait|eau de parfum|eau de toilette|parfum)\b/i,
} as const;

export const TASTE_COMPARE_AXES_BY_VERTICAL = {
  watch: ["movement_class", "case_material_honesty", "category_pollution", "seller_trust", "price_under_constraint"],
  electronics: ["distraction_profile", "connectivity_class", "workstation_integration", "seller_trust"],
  audio: ["signal_path", "isolation_class", "long_term_support", "seller_trust"],
  furniture: ["visual_restraint", "material_consistency", "desk_footprint", "ergonomic_claims"],
  desk_setup: ["ergonomic_claims", "footprint", "cable_management", "seller_trust"],
  fragrance: ["concentration_class", "wear_context", "authenticity_risk", "seller_trust"],
} as const;

export function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

export function listingText(title: string, store = ""): string {
  return `${title} ${store}`.toLowerCase();
}

export function classifyFalseLuxuryPosture(text: string): boolean {
  return (
    /\b(luxury|premium|designer|haute)\b/i.test(text) &&
    !TASTE_EVIDENCE_DICTIONARIES.fragrance_concentration.test(text) &&
    !TASTE_EVIDENCE_DICTIONARIES.electronics_workstation.test(text) &&
    !/\b(automatic|mechanical|swiss|edp|parfum)\b/i.test(text)
  );
}

export function pickEvidenceTier(text: string, hasE1: boolean, hasE0: boolean): TasteEvidenceTier {
  if (hasE1) return "E1";
  if (hasE0) return "E0";
  if (/\b(authorized|official store|boutique)\b/i.test(text)) return "E2";
  return "none";
}
