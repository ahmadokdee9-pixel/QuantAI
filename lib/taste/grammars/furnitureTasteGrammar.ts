/**
 * Furniture / desk-setup vertical taste grammar — shadow + P2.6 apply lanes.
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { QuantProduct } from "@/lib/shoppingScore";
import {
  TASTE_COMPARE_AXES_BY_VERTICAL,
  TASTE_EVIDENCE_DICTIONARIES,
  TASTE_VIOLATION_CODES,
  clamp01,
  listingText,
  pickEvidenceTier,
} from "@/lib/taste/tasteGrammarEvidence";
import type {
  TasteListingEvidenceResult,
  TasteModifierResult,
  VerticalTasteGrammarLaneId,
  VerticalTasteGrammarModule,
} from "@/lib/taste/verticalTasteContracts";

function envelopeOf(query: string, canonicalQuery?: CanonicalQueryContract): string {
  return canonicalQuery?.semantic.envelope ?? query;
}

export function furnitureIntent01(text: string, canonicalQuery?: CanonicalQueryContract): number {
  const sem = canonicalQuery?.semantic;
  let score = 0.12;
  const s = text.toLowerCase();

  if (sem?.aestheticDirection === "minimal_clean" || /\b(minimal|clean|scandi|matte|white desk)\b/i.test(s)) score += 0.34;
  if (/\b(desk setup|standing desk|office chair|work from home|bureau)\b/i.test(s)) score += 0.28;
  if (/\b(sofa|couch|hoekbank)\b/i.test(s) && /\b(luxury|premium|minimal)\b/i.test(s)) score += 0.22;
  if (/\b(ergonomic|lumbar|sit[-\s]?stand|executive workspace|studio desk)\b/i.test(s)) score += 0.26;
  if (/\b(مكتب|كرسي|مريح|فخم|office chair|desk chair)\b/i.test(s)) score += 0.28;
  if (sem?.premiumIntent01 && sem.premiumIntent01 >= 0.48) score += 0.1;
  if (canonicalQuery?.intent?.primary === "premium") score += 0.18;
  if (/\b(office|desk|chair|كرسي|مكتب|walnut|oak)\b/i.test(s)) score += 0.14;

  return clamp01(score);
}

const WORKSPACE_LANES = new Set<VerticalTasteGrammarLaneId>([
  "furniture_minimal_office",
  "furniture_executive_workspace",
  "furniture_ergonomic_premium",
  "furniture_studio_clean",
  "furniture_architectural_minimal",
  "furniture_premium_minimal_desk",
  "furniture_ergonomic_work_setup",
]);

function resolveLane(text: string, canonicalQuery?: CanonicalQueryContract): VerticalTasteGrammarLaneId | null {
  if (furnitureIntent01(text, canonicalQuery) < 0.3) return null;
  const s = text.toLowerCase();

  if (/\b(architectural|architect|bespoke|designer desk)\b/i.test(s)) return "furniture_architectural_minimal";
  if (/\b(studio|creator desk|clean desk|white desk|monochrome desk)\b/i.test(s)) return "furniture_studio_clean";
  if (/\b(executive|corner office|premium workspace|executive desk)\b/i.test(s)) return "furniture_executive_workspace";
  if (
    /\b(ergonomic|lumbar|sit[-\s]?stand|herman|steelcase)\b/i.test(s) ||
    /(?:مريح|كرسي\s*مكتب|مكتب\s*مريح)/u.test(s)
  ) {
    return "furniture_ergonomic_premium";
  }
  if (canonicalQuery?.category === "desk_setup" || /\b(desk setup|minimal desk|minimal office)\b/i.test(s)) {
    return "furniture_minimal_office";
  }
  if (/\b(minimal|oak|walnut|scandi|office minimal)\b/i.test(s)) return "furniture_minimal_office";
  return "furniture_minimal_office";
}

function detectListing(text: string, lane: VerticalTasteGrammarLaneId | null): TasteListingEvidenceResult {
  const violations: string[] = [];
  let fit01 = 0.5;
  let hasE0 = false;
  let hasE1 = false;

  if (lane && TASTE_EVIDENCE_DICTIONARIES.furniture_gamer_pollution.test(text)) {
    violations.push(TASTE_VIOLATION_CODES.gaming_pollution);
    violations.push(TASTE_VIOLATION_CODES.gaming_rgb_pollution);
    if (/\b(rgb|led)\b/i.test(text)) violations.push(TASTE_VIOLATION_CODES.rgb_overload);
    violations.push(TASTE_VIOLATION_CODES.aesthetic_mismatch);
    fit01 = Math.min(fit01, 0.15);
    hasE0 = true;
  }

  if (lane && WORKSPACE_LANES.has(lane)) {
    if (
      lane === "furniture_minimal_office" ||
      lane === "furniture_premium_minimal_desk" ||
      lane === "furniture_executive_workspace" ||
      lane === "furniture_architectural_minimal"
    ) {
      if (TASTE_EVIDENCE_DICTIONARIES.furniture_minimal.test(text)) {
        fit01 = Math.max(fit01, 0.78);
        hasE0 = true;
        if (/\b(walnut|oak|steel frame|cable management|matte)\b/i.test(text)) hasE1 = true;
      }
    }

    if (lane === "furniture_studio_clean" && TASTE_EVIDENCE_DICTIONARIES.furniture_studio.test(text)) {
      fit01 = Math.max(fit01, 0.76);
      hasE0 = true;
      if (/\b(cable management|matte|steel|monochrome)\b/i.test(text)) hasE1 = true;
    }

    if (
      lane === "furniture_architectural_minimal" &&
      TASTE_EVIDENCE_DICTIONARIES.furniture_architectural.test(text)
    ) {
      fit01 = Math.max(fit01, 0.8);
      hasE0 = true;
      if (/\b(walnut|oak|bespoke|steel)\b/i.test(text)) hasE1 = true;
    }

    if (
      lane === "furniture_ergonomic_premium" ||
      lane === "furniture_ergonomic_work_setup" ||
      lane === "furniture_executive_workspace"
    ) {
      if (TASTE_EVIDENCE_DICTIONARIES.furniture_ergonomic.test(text)) {
        fit01 = Math.max(fit01, 0.76);
        hasE0 = true;
        hasE1 = /\b(lumbar|adjustable height|steelcase|herman)\b/i.test(text);
      }
      if (
        /\b(ergonomic|racing|gamer)\b/i.test(text) &&
        !/\b(lumbar|adjustable|steelcase|herman miller|office chair)\b/i.test(text)
      ) {
        violations.push(TASTE_VIOLATION_CODES.fake_ergonomic);
        fit01 = Math.min(fit01, 0.22);
      }
    }

    if (TASTE_EVIDENCE_DICTIONARIES.furniture_plastic_luxury.test(text)) {
      violations.push(TASTE_VIOLATION_CODES.low_material_integrity);
      fit01 = Math.min(fit01, 0.28);
    }

    if (
      /\b(luxury look|premium look|designer style|fake leather)\b/i.test(text) &&
      !TASTE_EVIDENCE_DICTIONARIES.furniture_minimal.test(text) &&
      !TASTE_EVIDENCE_DICTIONARIES.furniture_ergonomic.test(text)
    ) {
      violations.push(TASTE_VIOLATION_CODES.false_minimal_posture);
      fit01 = Math.min(fit01, 0.32);
    }
  }

  if (/\b(monitor stand only|desk mat only|mouse pad)\b/i.test(text)) {
    violations.push(TASTE_VIOLATION_CODES.accessory_not_main);
    fit01 = Math.min(fit01, 0.3);
  }

  return {
    fit01,
    evidenceTier: pickEvidenceTier(text, hasE1, hasE0),
    violations,
  };
}

function buildModule(
  grammarId: string,
  productCategory: VerticalTasteGrammarModule["productCategory"],
  compareAxes: string[]
): VerticalTasteGrammarModule {
  return {
    grammarId,
    productCategory,
    compareAxes,
    detectIntent(query, canonicalQuery) {
      const env = envelopeOf(query, canonicalQuery);
      const intent01 = furnitureIntent01(env, canonicalQuery);
      return { intent01, lane: resolveLane(env, canonicalQuery) };
    },
    resolveGrammarLane(query, canonicalQuery) {
      return resolveLane(envelopeOf(query, canonicalQuery), canonicalQuery);
    },
    detectListingEvidence(product, canonicalQuery) {
      const env = canonicalQuery?.semantic.envelope ?? "";
      const lane = resolveLane(env, canonicalQuery);
      return detectListing(listingText(product.title, product.store), lane);
    },
    computeTasteModifiers(query, product, canonicalQuery) {
      const env = envelopeOf(query, canonicalQuery);
      const lane = resolveLane(env, canonicalQuery);
      const listing = detectListing(listingText(product.title, product.store), lane);
      let delta = 0;
      if (lane && furnitureIntent01(env, canonicalQuery) >= 0.3) {
        const hardPollution =
          listing.violations.includes(TASTE_VIOLATION_CODES.gaming_pollution) ||
          listing.violations.includes(TASTE_VIOLATION_CODES.rgb_overload) ||
          listing.violations.includes(TASTE_VIOLATION_CODES.fake_ergonomic) ||
          listing.violations.includes(TASTE_VIOLATION_CODES.false_minimal_posture);
        if (hardPollution) delta = -12;
        else if (listing.violations.includes(TASTE_VIOLATION_CODES.low_material_integrity)) delta = -8;
        else if (listing.violations.includes(TASTE_VIOLATION_CODES.aesthetic_mismatch)) delta = -12;
        else if (listing.fit01 >= 0.72) delta = 6;
      }
      return {
        delta,
        tasteFit01: listing.fit01,
        violations: listing.violations,
        evidenceTier: listing.evidenceTier,
        lane,
      };
    },
  };
}

export const furnitureTasteGrammar = buildModule(
  "furniture_taste_v2",
  "furniture",
  [...TASTE_COMPARE_AXES_BY_VERTICAL.furniture]
);

export const deskSetupTasteGrammar = buildModule(
  "desk_setup_taste_v2",
  "desk_setup",
  [...TASTE_COMPARE_AXES_BY_VERTICAL.desk_setup]
);

export function furnitureGrammarForCategory(
  category: "furniture" | "desk_setup" | string | null | undefined
): VerticalTasteGrammarModule {
  return category === "desk_setup" ? deskSetupTasteGrammar : furnitureTasteGrammar;
}
