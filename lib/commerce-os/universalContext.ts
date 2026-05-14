import { expandCommerceSemantics } from "./semanticExpand";
import { detectUniversalIntentFlags } from "./intentFlags";

export type UniversalCommerceContextDTO = {
  version: 1;
  /** Inferred vertical / lifestyle lanes (stable string ids). */
  verticals: string[];
  /** Aesthetic / taste tags inferred from language only. */
  aesthetics: string[];
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

  const psychology: string[] = [];
  if (flags.comfortSeeking) psychology.push("comfort_first");
  if (flags.giftingEmotional) psychology.push("gifting_emotional");
  if (flags.longTermValue) psychology.push("long_term_value");

  const signals: string[] = [];
  if (expanded.length > s.length + 4) signals.push("semantic_expansion_applied");
  if (flags.fragranceBeauty && flags.feminineStyle) signals.push("aligned_beauty_feminine");

  return {
    version: 1,
    verticals,
    aesthetics,
    psychology,
    signals,
    languages: {
      arabicScript: AR.test(rawQuery),
      latin: /[a-z]/i.test(rawQuery),
    },
  };
}
