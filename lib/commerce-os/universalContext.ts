import { expandCommerceSemantics } from "./semanticExpand";
import { detectUniversalIntentFlags } from "./intentFlags";
import { extractTasteGraphSignals, tasteTagListForApi } from "./tasteGraph";
import { parseAlternativeQueryContext } from "./alternativeSemantics";

export type UniversalCommerceContextDTO = {
  version: 2;
  /** Inferred vertical / lifestyle lanes (stable string ids). */
  verticals: string[];
  /** Aesthetic / taste tags inferred from language only. */
  aesthetics: string[];
  /** Taste Graph stable tag ids (query-side). */
  tasteTags: string[];
  /** Calm / bold / playful / neutral emotional band from taste layer. */
  tasteBand: "calm" | "bold" | "playful" | "neutral";
  /** 0–1 expectation of premium visual or expensive-looking outcome. */
  tasteVisualPremium01: number;
  /** 0–1 richness / niche fragrance intent when query is scent-led. */
  tasteOlfactory01: number;
  /** Buyer psychology / intent posture (language-only). */
  psychology: string[];
  /** Short internal notes for observability (not user-facing copy). */
  signals: string[];
  languages: { arabicScript: boolean; latin: boolean };
};

const AR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function buildUniversalCommerceContext(
  rawQuery: string,
  intentMatchString: string
): UniversalCommerceContextDTO {
  const s = intentMatchString.toLowerCase().replace(/\s+/g, " ").trim();
  const flags = detectUniversalIntentFlags(rawQuery, s);
  const expanded = expandCommerceSemantics(s);
  const taste = extractTasteGraphSignals(intentMatchString, rawQuery);
  const altCtx = parseAlternativeQueryContext(rawQuery, intentMatchString);

  const verticals: string[] = [];
  if (flags.wellnessFitness) verticals.push("fitness_wellness");
  if (flags.homeLifestyle) verticals.push("home_furniture");
  if (flags.fragranceBeauty) verticals.push("beauty_fragrance");
  if (flags.autoAccessory) verticals.push("automotive_adjacent");

  const aesthetics: string[] = [];
  if (flags.minimalistStyle) aesthetics.push("minimalist");
  if (flags.quietLuxury) aesthetics.push("quiet_luxury");
  if (flags.feminineStyle) aesthetics.push("feminine");
  if (flags.masculineStyle) aesthetics.push("masculine");
  for (const id of taste.dominantTags) {
    if (!aesthetics.includes(id)) aesthetics.push(id);
  }

  const psychology: string[] = [];
  if (flags.comfortSeeking) psychology.push("comfort_first");
  if (flags.giftingEmotional) psychology.push("gifting_emotional");
  if (flags.longTermValue) psychology.push("long_term_value");
  if (taste.band === "bold") psychology.push("taste_bold_signal");
  if (taste.band === "calm") psychology.push("taste_calm_signal");
  if (taste.band === "playful") psychology.push("taste_playful_signal");
  if (taste.visualPremiumExpect01 >= 0.45) psychology.push("visual_premium_expectation");
  if (taste.olfactoryRichIntent01 >= 0.45) psychology.push("olfactory_rich_intent");

  const signals: string[] = [];
  if (expanded.length > s.length + 4) signals.push("semantic_expansion_applied");
  if (flags.fragranceBeauty && flags.feminineStyle) signals.push("aligned_beauty_feminine");
  if (taste.hasTasteLayer) signals.push("taste_graph_active");
  if (altCtx.anchorPhrase.length >= 2) signals.push("alternative_reference_extracted");
  if (altCtx.wantsCheaper) signals.push("alternative_cheaper_lane");
  if (altCtx.wantsPremium) signals.push("alternative_premium_lane");
  if (altCtx.wantsSubstitute) signals.push("alternative_substitute_language");

  return {
    version: 2,
    verticals,
    aesthetics,
    tasteTags: tasteTagListForApi(taste),
    tasteBand: taste.band,
    tasteVisualPremium01: Math.round(taste.visualPremiumExpect01 * 100) / 100,
    tasteOlfactory01: Math.round(taste.olfactoryRichIntent01 * 100) / 100,
    psychology,
    signals,
    languages: {
      arabicScript: AR.test(rawQuery),
      latin: /[a-z]/i.test(rawQuery),
    },
  };
}
