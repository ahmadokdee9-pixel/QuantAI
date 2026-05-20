/**
 * Luxury watch vertical taste grammar — Phase 1 behavior preserved via registry contract.
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
import { TASTE_GRAMMAR_INTENT_THRESHOLD } from "@/lib/taste/verticalTasteFlags";

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

/** 0–1 strength of luxury/collector watch intent (not generic smartwatch shopping). */
export function luxuryWatchIntent01(text: string): number {
  const s = text.toLowerCase();
  if (!/\b(watch|watches|horloge|horloges|timepiece|wristwatch|chronograph|ساعة)\b/i.test(s)) {
    return 0;
  }

  let score = 0.08;

  if (
    /\b(luxury|premium|elegant|prestige|refined|quiet luxury|high end|designer|couture|collector|haute horlogerie)\b/i.test(
      s
    )
  ) {
    score += 0.34;
  }
  if (/\b(automatic|mechanical|swiss|sapphire|dress watch|complication|geneva|manual wind|self wind)\b/i.test(s)) {
    score += 0.28;
  }
  if (/\b(men's watch|mens watch|ladies watch|heren horloge|homme montre)\b/i.test(s)) score += 0.12;
  if (/\b(rolex|omega|tag heuer|cartier|breitling|tudor|panerai|iwc|jaeger|grand seiko|seiko presage|longines)\b/i.test(s)) {
    score += 0.22;
  }
  if (/\b(alternative to|similar to|like|alternative)\b/i.test(s) && /\bwatch\b/i.test(s)) score += 0.2;
  if (/\b(vs|versus|compare)\b/i.test(s) && /\bwatch\b/i.test(s)) score += 0.18;
  if (/(?:فخم|فاخر|راقية|ساعة\s*فاخرة|ماركة|شكلها\s*luxury|شكلها\s*فخم)/i.test(s)) score += 0.36;
  if (/\b(under|below|max|tot|onder)\s*(?:€|eur|\$|£)?\s*\d{2,5}\b/i.test(s) && score >= 0.35) score += 0.08;

  if (/\b(fitness tracker|fitbit only|galaxy fit|sports band|running watch|gym watch)\b/i.test(s) && score < 0.35) {
    score *= 0.35;
  }

  return clamp01(score);
}

export function hasLuxuryWatchIntent(text: string): boolean {
  return luxuryWatchIntent01(text) >= TASTE_GRAMMAR_INTENT_THRESHOLD;
}

/** Consumer fitness / budget smart-band lane — not institutional luxury watch. */
export function isConsumerFitnessWatchListing(text: string): boolean {
  const t = text.toLowerCase();
  if (/\b(fitness tracker|activity tracker|fitbit|mi band|smart band|amazfit band|whoop|sports watch)\b/i.test(t)) {
    return true;
  }
  if (/\bgalaxy\s+fit\b/i.test(t) || (/\bfit\s*3\b/i.test(t) && /\b(galaxy|samsung)\b/i.test(t))) {
    return true;
  }
  if (/\b(garmin|polar|coros)\b/i.test(t) && !/\b(luxury|titanium|sapphire|dress|automatic|mechanical|prestige)\b/i.test(t)) {
    return true;
  }
  if (
    /\b(smartwatch|smart watch|wearable)\b/i.test(t) &&
    !/\b(automatic|mechanical|chronograph|swiss made|dress|sapphire|steel bracelet|luxury|prestige|timepiece)\b/i.test(t)
  ) {
    if (/\b(galaxy watch|apple watch|fitbit|amazfit|huawei watch|xiaomi watch)\b/i.test(t)) return true;
  }
  return false;
}

export function isLuxuryWatchListingEvidence(text: string): boolean {
  return /\b(automatic|mechanical|chronograph|swiss|dress watch|sapphire|stainless steel|timepiece|horloge|prestige|luxury|collector|complication|geneva|tourbillon|moonphase|dress|bracelet watch)\b/i.test(
    text
  );
}

function listingText(product: QuantProduct): string {
  return `${product.title} ${product.store}`.toLowerCase();
}

function resolveLaneFromQuery(text: string): VerticalTasteGrammarLaneId | null {
  const s = text.toLowerCase();
  if (luxuryWatchIntent01(text) < TASTE_GRAMMAR_INTENT_THRESHOLD) return null;
  if (/\b(automatic|mechanical|manual wind|complication|collector)\b/i.test(s)) {
    return "watch_mechanical_collector";
  }
  if (/\b(swiss|dress watch|geneva|sapphire)\b/i.test(s)) {
    return "watch_swiss_dress";
  }
  return "watch_luxury_quiet";
}

function detectIntentImpl(query: string, canonicalQuery?: CanonicalQueryContract): TasteIntentResult {
  const envelope = canonicalQuery?.semantic.envelope ?? query;
  const intent01 = luxuryWatchIntent01(envelope);
  const styleBoost =
    canonicalQuery?.semantic.styleIntent.includes("luxury_watch_collector") ?? false;
  const adjusted = styleBoost ? Math.max(intent01, TASTE_GRAMMAR_INTENT_THRESHOLD) : intent01;
  return {
    intent01: adjusted,
    lane: resolveLaneFromQuery(envelope),
  };
}

function detectListingEvidenceImpl(
  product: QuantProduct,
  _canonicalQuery?: CanonicalQueryContract
): TasteListingEvidenceResult {
  const text = listingText(product);
  const violations: string[] = [];
  let fit01 = 0.5;
  let evidenceTier: TasteListingEvidenceResult["evidenceTier"] = "none";

  if (isConsumerFitnessWatchListing(text) && !isLuxuryWatchListingEvidence(text)) {
    violations.push("fitness_pollution");
    fit01 = 0.12;
    evidenceTier = "E0";
  } else if (isLuxuryWatchListingEvidence(text)) {
    fit01 = 0.82;
    evidenceTier = "E0";
    if (/\b(automatic|mechanical|swiss|chronograph)\b/i.test(text)) evidenceTier = "E1";
  } else if (/\b(watch|horloge|timepiece)\b/i.test(text)) {
    fit01 = 0.45;
    evidenceTier = "E0";
  }

  return { fit01, evidenceTier, violations };
}

function computeTasteModifiersImpl(
  query: string,
  product: QuantProduct,
  canonicalQuery?: CanonicalQueryContract
): TasteModifierResult {
  const envelope = canonicalQuery?.semantic.envelope ?? query;
  const lane = resolveLaneFromQuery(envelope);
  const listing = detectListingEvidenceImpl(product, canonicalQuery);
  let delta = 0;

  if (lane && luxuryWatchIntent01(envelope) >= TASTE_GRAMMAR_INTENT_THRESHOLD) {
    if (listing.violations.includes("fitness_pollution")) {
      delta = -22;
    } else if (listing.fit01 >= 0.75) {
      delta = 8;
    }
    if (/\b(dress watch|automatic|mechanical|swiss|chronograph|sapphire|prestige|timepiece)\b/i.test(listingText(product))) {
      delta += 5;
    }
  }

  return {
    delta,
    tasteFit01: listing.fit01,
    violations: listing.violations,
    evidenceTier: listing.evidenceTier,
    lane,
  };
}

const WATCH_COMPARE_AXES = [
  "movement_class",
  "case_material_honesty",
  "category_pollution",
  "seller_trust",
  "price_under_constraint",
];

export const luxuryWatchGrammar: VerticalTasteGrammarModule = {
  grammarId: "luxury_watch_v1",
  productCategory: "watch",
  compareAxes: WATCH_COMPARE_AXES,
  detectIntent: detectIntentImpl,
  resolveGrammarLane: (query, canonicalQuery) => resolveLaneFromQuery(canonicalQuery?.semantic.envelope ?? query),
  detectListingEvidence: detectListingEvidenceImpl,
  computeTasteModifiers: computeTasteModifiersImpl,
};
