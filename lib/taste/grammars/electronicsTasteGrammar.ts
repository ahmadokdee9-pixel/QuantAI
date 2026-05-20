/**
 * Electronics / audio vertical taste grammar — shadow-only (Phase 2.2).
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
  TasteIntentResult,
  TasteListingEvidenceResult,
  TasteModifierResult,
  VerticalTasteGrammarLaneId,
  VerticalTasteGrammarModule,
} from "@/lib/taste/verticalTasteContracts";

function envelopeOf(query: string, canonicalQuery?: CanonicalQueryContract): string {
  return canonicalQuery?.semantic.envelope ?? query;
}

function electronicsIntent01(text: string, canonicalQuery?: CanonicalQueryContract): number {
  const s = text.toLowerCase();
  const sem = canonicalQuery?.semantic;
  let score = 0.1;

  if (sem?.usageContext.includes("focus") || /\b(focus|deep work|concentration|study|anc)\b/i.test(s)) score += 0.32;
  if (/\b(headphone|earbud|airpod|koptelefoon|monitor|keyboard|dock|workstation)\b/i.test(s)) score += 0.18;
  if (sem?.aestheticDirection === "minimal_clean" || /\b(minimal|clean|quiet)\b/i.test(s)) score += 0.14;
  if (/\b(studio|reference|neutral tuning|wired dac|neutral studio)\b/i.test(s)) score += 0.36;
  if (/\b(gaming monitor|ps5 monitor|ultrawide workstation|thunderbolt dock)\b/i.test(s)) score += 0.24;
  if (/\b(ultrawide|workstation setup|monitor for work)\b/i.test(s)) score += 0.22;
  if (/\b(earbud|earbuds|airpod|wireless)\b/i.test(s) && /\b(premium|luxury)\b/i.test(s)) score += 0.2;
  if (sem?.premiumIntent01 && sem.premiumIntent01 >= 0.5) score += 0.1;
  if (/\b(gaming headset|rgb keyboard party)\b/i.test(s) && !/\b(focus|workstation|studio)\b/i.test(s)) score *= 0.7;

  return clamp01(score);
}

function resolveLane(text: string, canonicalQuery?: CanonicalQueryContract): VerticalTasteGrammarLaneId | null {
  const s = text.toLowerCase();
  if (electronicsIntent01(text, canonicalQuery) < 0.32) return null;
  if (/\b(studio|reference|neutral|dac|amp|open[-\s]?back)\b/i.test(s)) return "electronics_audio_reference";
  if (/\b(monitor|dock|vesa|workstation|mechanical keyboard|display)\b/i.test(s)) return "electronics_workstation_pro";
  if (/\b(focus|anc|noise cancel|headphone|deep work)\b/i.test(s)) return "electronics_focus_deep_work";
  return "electronics_focus_deep_work";
}

function detectListing(text: string, lane: VerticalTasteGrammarLaneId | null): TasteListingEvidenceResult {
  const violations: string[] = [];
  let fit01 = 0.5;
  let hasE0 = false;
  let hasE1 = false;

  if (lane === "electronics_focus_deep_work") {
    if (TASTE_EVIDENCE_DICTIONARIES.electronics_focus.test(text)) {
      fit01 = 0.78;
      hasE0 = true;
      if (/\b(anc|noise cancel|wh-1000|quietcomfort)\b/i.test(text)) hasE1 = true;
    }
    if (TASTE_EVIDENCE_DICTIONARIES.electronics_gaming_pollution.test(text)) {
      violations.push(TASTE_VIOLATION_CODES.party_audio_pollution);
      fit01 = Math.min(fit01, 0.2);
    }
  } else if (lane === "electronics_audio_reference") {
    if (TASTE_EVIDENCE_DICTIONARIES.electronics_audio_ref.test(text)) {
      fit01 = 0.8;
      hasE0 = true;
      hasE1 = /\b(wired|dac|open[-\s]?back)\b/i.test(text);
    }
    if (/\b(bass boost|party|rgb gaming)\b/i.test(text)) violations.push(TASTE_VIOLATION_CODES.party_audio_pollution);
  } else if (lane === "electronics_workstation_pro") {
    if (TASTE_EVIDENCE_DICTIONARIES.electronics_workstation.test(text)) {
      fit01 = 0.76;
      hasE0 = true;
      hasE1 = /\b(thunderbolt|usb-c pd|vesa)\b/i.test(text);
    }
    if (TASTE_EVIDENCE_DICTIONARIES.electronics_gaming_pollution.test(text) && !/\b(ips|oled|calibrat)\b/i.test(text)) {
      violations.push(TASTE_VIOLATION_CODES.gaming_rgb_pollution);
      fit01 = Math.min(fit01, 0.25);
    }
  }

  if (classifyFalseLuxuryPosture(text)) violations.push(TASTE_VIOLATION_CODES.false_luxury_posture);

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
      const intent01 = electronicsIntent01(env, canonicalQuery);
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
      if (lane && electronicsIntent01(env, canonicalQuery) >= 0.32) {
        if (listing.violations.length) delta = -10;
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

export const electronicsTasteGrammar = buildModule(
  "electronics_taste_v1",
  "electronics",
  [...TASTE_COMPARE_AXES_BY_VERTICAL.electronics]
);

export const audioTasteGrammar = buildModule(
  "audio_taste_v1",
  "audio",
  [...TASTE_COMPARE_AXES_BY_VERTICAL.audio]
);
