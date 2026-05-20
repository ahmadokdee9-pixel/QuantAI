/**
 * Furniture / desk-setup vertical taste grammar — shadow-only (Phase 2.2).
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
  TasteIntentResult,
  TasteListingEvidenceResult,
  TasteModifierResult,
  VerticalTasteGrammarLaneId,
  VerticalTasteGrammarModule,
} from "@/lib/taste/verticalTasteContracts";

function envelopeOf(query: string, canonicalQuery?: CanonicalQueryContract): string {
  return canonicalQuery?.semantic.envelope ?? query;
}

function furnitureIntent01(text: string, canonicalQuery?: CanonicalQueryContract): number {
  const sem = canonicalQuery?.semantic;
  let score = 0.12;
  const s = text.toLowerCase();

  if (sem?.aestheticDirection === "minimal_clean" || /\b(minimal|clean|scandi|matte|white desk)\b/i.test(s)) score += 0.34;
  if (/\b(desk setup|standing desk|office chair|work from home|bureau)\b/i.test(s)) score += 0.28;
  if (/\b(sofa|couch|hoekbank)\b/i.test(s) && /\b(luxury|premium|minimal)\b/i.test(s)) score += 0.22;
  if (/\b(ergonomic|lumbar|sit[-\s]?stand)\b/i.test(s)) score += 0.26;
  if (sem?.premiumIntent01 && sem.premiumIntent01 >= 0.48) score += 0.1;

  return clamp01(score);
}

function resolveLane(text: string, canonicalQuery?: CanonicalQueryContract): VerticalTasteGrammarLaneId | null {
  if (furnitureIntent01(text, canonicalQuery) < 0.3) return null;
  if (/\b(ergonomic|lumbar|office chair|sit[-\s]?stand)\b/i.test(text)) {
    return "furniture_ergonomic_work_setup";
  }
  if (canonicalQuery?.category === "desk_setup" || /\b(desk setup|minimal desk)\b/i.test(text)) {
    return "furniture_premium_minimal_desk";
  }
  return "furniture_premium_minimal_desk";
}

function detectListing(text: string, lane: VerticalTasteGrammarLaneId | null): TasteListingEvidenceResult {
  const violations: string[] = [];
  let fit01 = 0.5;
  let hasE0 = false;
  let hasE1 = false;

  if (lane === "furniture_premium_minimal_desk") {
    if (TASTE_EVIDENCE_DICTIONARIES.furniture_minimal.test(text)) {
      fit01 = 0.77;
      hasE0 = true;
      if (/\b(walnut|oak|steel frame|cable management)\b/i.test(text)) hasE1 = true;
    }
    if (TASTE_EVIDENCE_DICTIONARIES.furniture_gamer_pollution.test(text)) {
      violations.push(TASTE_VIOLATION_CODES.gaming_rgb_pollution);
      violations.push(TASTE_VIOLATION_CODES.aesthetic_mismatch);
      fit01 = Math.min(fit01, 0.18);
    }
  } else if (lane === "furniture_ergonomic_work_setup") {
    if (TASTE_EVIDENCE_DICTIONARIES.furniture_ergonomic.test(text)) {
      fit01 = 0.74;
      hasE0 = true;
      hasE1 = /\b(lumbar|adjustable height)\b/i.test(text);
    }
    if (/\b(monitor stand only|desk mat only|mouse pad)\b/i.test(text)) {
      violations.push(TASTE_VIOLATION_CODES.accessory_not_main);
      fit01 = Math.min(fit01, 0.3);
    }
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
        if (listing.violations.includes(TASTE_VIOLATION_CODES.aesthetic_mismatch)) delta = -12;
        else if (listing.fit01 >= 0.7) delta = 5;
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
  "furniture_taste_v1",
  "furniture",
  [...TASTE_COMPARE_AXES_BY_VERTICAL.furniture]
);

export const deskSetupTasteGrammar = buildModule(
  "desk_setup_taste_v1",
  "desk_setup",
  [...TASTE_COMPARE_AXES_BY_VERTICAL.desk_setup]
);
