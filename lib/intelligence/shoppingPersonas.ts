/**
 * QuantAI shopping personas — discrete buyer modes for adaptive ranking + copy.
 */

import type { CommerceSearchIntents } from "@/lib/intelligence/searchIntentV2";

export type ShoppingPersonaSlug =
  | "student"
  | "gamer"
  | "luxury_buyer"
  | "minimalist"
  | "practical_buyer"
  | "collector"
  | "creator"
  | "fashion_focused"
  | "deal_hunter";

const ORDER: readonly ShoppingPersonaSlug[] = [
  "student",
  "gamer",
  "luxury_buyer",
  "minimalist",
  "practical_buyer",
  "collector",
  "creator",
  "fashion_focused",
  "deal_hunter",
] as const;

export type ShoppingPersonaProfile = {
  scores: Partial<Record<ShoppingPersonaSlug, number>>;
  /** Highest-first persona ids. */
  ranked: ShoppingPersonaSlug[];
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Infer persona mix from cleaned query + commerce intents (tray-agnostic). */
export function detectShoppingPersonas(query: string, intents: CommerceSearchIntents): ShoppingPersonaProfile {
  const q = query.toLowerCase().replace(/\s+/g, " ").trim();
  const t = intents.taste.tagStrength;
  const s: Partial<Record<ShoppingPersonaSlug, number>> = {};

  if (intents.schoolUse || /\b(uni|university|college|dorm|campus|student)\b/i.test(q)) {
    s.student = 0.88;
  }
  if (intents.gaming || /\b(gaming|gamer|rtx|esports|steam|ps5|xbox|nintendo)\b/i.test(q)) {
    s.gamer = 0.9;
  }
  if (intents.luxury || intents.quietLuxury || (t.luxury ?? 0) >= 0.38 || /\b(luxury|designer|haute|boutique|prestige)\b/i.test(q)) {
    s.luxury_buyer = 0.86;
  }
  if (intents.minimalistStyle || (t.minimal ?? 0) >= 0.4 || /\b(minimal|clean desk|uncluttered|scandi|monochrome)\b/i.test(q)) {
    s.minimalist = 0.82;
  }
  if (
    intents.qualitySeeking &&
    !intents.luxury &&
    /\b(practical|reliable|sensible|workhorse|no[\s-]?frills|boring is good)\b/i.test(q)
  ) {
    s.practical_buyer = 0.78;
  }
  if (/\b(collect|limited edition|grail|rare\b|numbered)\b/i.test(q)) {
    s.collector = 0.8;
  }
  if (intents.lifestyleCreator || /\b(creator|stream|youtube|podcast|content|filmmaker)\b/i.test(q)) {
    s.creator = 0.82;
  }
  if (/\b(fashion|outfit|stylish|sneakerhead|runway|ootd)\b/i.test(q) || (intents.giftUse && /\b(shoes|sneakers|trainers)\b/i.test(q))) {
    s.fashion_focused = 0.76;
  }
  if (intents.dealHunter || intents.realDiscountOnly || /\b(deal|discount|markdown|% off|clearance)\b/i.test(q)) {
    s.deal_hunter = 0.8;
  }

  const ranked = (Object.entries(s) as [ShoppingPersonaSlug, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  if (ranked.length === 0) {
    if (intents.budget && !intents.premium) s.student = 0.45;
    if (intents.productivity && !s.student) s.practical_buyer = 0.42;
    const fallback = (Object.entries(s) as [ShoppingPersonaSlug, number][]).sort((a, b) => b[1] - a[1]).map(([k]) => k);
    return { scores: s, ranked: fallback.length ? fallback : [] };
  }

  return { scores: s, ranked: ranked.slice(0, 5) };
}

/** Stable fingerprint for memo equality. */
export function shoppingPersonaFingerprint(p: ShoppingPersonaProfile): string {
  return p.ranked.join(",") + "|" + ORDER.map((id) => `${id}:${clamp01(p.scores[id] ?? 0).toFixed(2)}`).join(";");
}
