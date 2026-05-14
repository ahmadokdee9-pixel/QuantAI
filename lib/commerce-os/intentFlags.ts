/**
 * Universal commerce intent flags — semantic layer beyond legacy keyword intents.
 * Heuristic, tray-local; safe to evolve without ML contracts.
 */

export type UniversalIntentFlags = {
  wellnessFitness: boolean;
  homeLifestyle: boolean;
  fragranceBeauty: boolean;
  autoAccessory: boolean;
  comfortSeeking: boolean;
  feminineStyle: boolean;
  masculineStyle: boolean;
  minimalistStyle: boolean;
  quietLuxury: boolean;
  giftingEmotional: boolean;
  longTermValue: boolean;
};

const FALSES: UniversalIntentFlags = {
  wellnessFitness: false,
  homeLifestyle: false,
  fragranceBeauty: false,
  autoAccessory: false,
  comfortSeeking: false,
  feminineStyle: false,
  masculineStyle: false,
  minimalistStyle: false,
  quietLuxury: false,
  giftingEmotional: false,
  longTermValue: false,
};

/**
 * @param s — lowercased, collapsed string (same pipeline as legacy intents: typos fixed, glosses appended).
 */
export function detectUniversalIntentFlags(raw: string, s: string): UniversalIntentFlags {
  const out = { ...FALSES };

  if (
    /\b(gym|yoga|pilates|crossfit|running\s+shoes|trainers|sneakers\s+for\s+running|fitness|workout|recovery|massage\s+gun|adjustable\s+dumbbell|protein)\b/.test(
      s
    )
  ) {
    out.wellnessFitness = true;
  }

  if (
    /\b(sofa|couch|dining\s+table|bookshelf|wardrobe|mattress|bed\s+frame|rug|curtains|coffee\s+table|office\s+chair|standing\s+desk|minimal\s+desk|interior|home\s+decor)\b/.test(
      s
    )
  ) {
    out.homeLifestyle = true;
  }

  if (
    /\b(perfume|cologne|eau\s+de|fragrance|parfum|skincare|routine|serum|moisturizer|makeup|lipstick|mascara|foundation|beauty)\b/.test(
      s
    )
  ) {
    out.fragranceBeauty = true;
  }

  if (
    /\b(car\s+seat|dashcam|dash\s+cam|car\s+charger|phone\s+mount|roof\s+rack|tire|tyre|automotive|for\s+my\s+car)\b/.test(
      s
    )
  ) {
    out.autoAccessory = true;
  }

  if (
    /\b(comfortable|comfort|ergonomic|soft|cozy|breathable|doesn'?t\s+pinch|all.day\s+comfort|gentle\s+on\s+skin)\b/.test(
      s
    )
  ) {
    out.comfortSeeking = true;
  }

  if (
    /\b(feminine|for\s+her|women'?s|womens|lady|ladies|elegant\s+women|wife|girlfriend|mother'?s\s+day)\b/.test(s)
  ) {
    out.feminineStyle = true;
  }

  if (/\b(masculine|for\s+him|men'?s|mens|husband|boyfriend|dad|father'?s\s+day)\b/.test(s)) {
    out.masculineStyle = true;
  }

  if (
    /\b(minimal|minimalist|clean\s+lines|uncluttered|scandi|japandi|monochrome\s+aesthetic|less\s+is\s+more)\b/.test(
      s
    )
  ) {
    out.minimalistStyle = true;
  }

  if (
    /\b(quiet\s+luxury|old\s+money|stealth\s+wealth|understated\s+luxury|luxe\s+but\s+subtle|heritage\s+brand)\b/.test(
      s
    )
  ) {
    out.quietLuxury = true;
  }

  if (
    /\b(anniversary|sentimental|meaningful\s+gift|something\s+special|she\s+deserves|he\s+deserves|make\s+them\s+happy)\b/.test(
      s
    ) ||
    /\b(gift\s+for|present\s+for|birthday)\b/.test(s)
  ) {
    out.giftingEmotional = true;
  }

  if (
    /\b(last\s+years?|long.term|future.proof|won'?t\s+go\s+outdated|investment\s+piece|buy\s+once|keep\s+for\s+years)\b/.test(
      s
    )
  ) {
    out.longTermValue = true;
  }

  /* Arabic script emotional / gift hints (raw, not stripped). */
  if (/هدية|لزوجتي|لزوجي|لأمي|لأبي|عيد\s*ميلاد|ذكرى/i.test(raw)) {
    out.giftingEmotional = true;
  }
  if (/عطر|مكياج|عناية\s*بالبشرة/i.test(raw)) {
    out.fragranceBeauty = true;
  }

  return out;
}
