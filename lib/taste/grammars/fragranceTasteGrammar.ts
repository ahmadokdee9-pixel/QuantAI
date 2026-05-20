/**
 * Fragrance vertical taste grammar — shadow-only (Phase 2.2).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { QuantProduct } from "@/lib/shoppingScore";
import {
  TASTE_COMPARE_AXES_BY_VERTICAL,
  TASTE_EVIDENCE_DICTIONARIES,
  TASTE_VIOLATION_CODES,
  clamp01,
  classifyFalseLuxuryPosture,
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

export function fragranceIntent01(text: string, canonicalQuery?: CanonicalQueryContract): number {
  let score = 0.15;
  const s = text.toLowerCase();
  const sem = canonicalQuery?.semantic;

  if (/\b(perfume|fragrance|parfum|cologne|edp|edt|عطر|عطور)\b/i.test(s)) score += 0.28;
  if (/\b(libre|ysl|chanel|dior|tom ford|designer)\b/i.test(s)) score += 0.22;
  if (/\b(niche|artisan|indie)\b/i.test(s)) score += 0.2;
  if (/\b(luxury|haute|extrait|collection)\b/i.test(s)) score += 0.18;
  if (sem?.styleIntent.includes("long_lasting")) score += 0.12;
  if (sem?.productPurpose.includes("scent_performance")) score += 0.1;

  return clamp01(score);
}

function resolveLane(text: string, canonicalQuery?: CanonicalQueryContract): VerticalTasteGrammarLaneId | null {
  const s = text.toLowerCase();
  if (fragranceIntent01(text, canonicalQuery) < 0.32) return null;
  if (/\b(niche|artisan|indie|perfume house)\b/i.test(s)) return "fragrance_niche_artisan";
  if (/\b(extrait|haute|collection privée|luxury parfum)\b/i.test(s)) return "fragrance_luxury_haute";
  return "fragrance_designer_signature";
}

function detectListing(text: string, lane: VerticalTasteGrammarLaneId | null): TasteListingEvidenceResult {
  const violations: string[] = [];
  let fit01 = 0.5;
  let hasE0 = false;
  let hasE1 = false;

  if (TASTE_EVIDENCE_DICTIONARIES.fragrance_dupe.test(text)) {
    violations.push(TASTE_VIOLATION_CODES.inspired_by_dupe);
    violations.push(TASTE_VIOLATION_CODES.authenticity_risk);
    fit01 = 0.15;
    hasE0 = true;
  } else if (lane === "fragrance_niche_artisan" && TASTE_EVIDENCE_DICTIONARIES.fragrance_niche.test(text)) {
    fit01 = 0.8;
    hasE0 = true;
    hasE1 = true;
  } else if (lane === "fragrance_luxury_haute" && TASTE_EVIDENCE_DICTIONARIES.fragrance_luxury.test(text)) {
    fit01 = 0.82;
    hasE0 = true;
    hasE1 = /\b(extrait|parfum)\b/i.test(text);
  } else if (TASTE_EVIDENCE_DICTIONARIES.fragrance_designer.test(text)) {
    fit01 = 0.76;
    hasE0 = true;
    if (/\b(edp|eau de parfum|90ml|100ml)\b/i.test(text)) hasE1 = true;
  }

  if (
    lane &&
    /\b(oil|rollerball|decant)\b/i.test(text) &&
    !TASTE_EVIDENCE_DICTIONARIES.fragrance_concentration.test(text)
  ) {
    violations.push(TASTE_VIOLATION_CODES.concentration_mismatch);
    fit01 = Math.min(fit01, 0.35);
  }

  if (classifyFalseLuxuryPosture(text) && !TASTE_EVIDENCE_DICTIONARIES.fragrance_designer.test(text)) {
    violations.push(TASTE_VIOLATION_CODES.false_luxury_posture);
  }

  return {
    fit01,
    evidenceTier: pickEvidenceTier(text, hasE1, hasE0),
    violations,
  };
}

export const fragranceTasteGrammar: VerticalTasteGrammarModule = {
  grammarId: "fragrance_taste_v1",
  productCategory: "fragrance",
  compareAxes: [...TASTE_COMPARE_AXES_BY_VERTICAL.fragrance],
  detectIntent(query, canonicalQuery) {
    const env = envelopeOf(query, canonicalQuery);
    const intent01 = fragranceIntent01(env, canonicalQuery);
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
    if (lane && fragranceIntent01(env, canonicalQuery) >= 0.32) {
      if (listing.violations.includes(TASTE_VIOLATION_CODES.inspired_by_dupe)) delta = -14;
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
