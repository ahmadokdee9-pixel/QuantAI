/**
 * QuantAI shopper persona — inferred from query + commerce intents (tray-agnostic).
 */

import type { CommerceSearchIntents } from "./searchIntentV2";

export type ShopperPersonaId =
  | "minimalist"
  | "luxury_seeker"
  | "feminine_energy"
  | "gamer"
  | "family_oriented"
  | "creator_enthusiast"
  | "value_sniper"
  | "premium_buyer"
  | "deal_hunter"
  | "aesthetic_focused"
  | "productivity_focused"
  | "neutral";

const ALL_SHOPPER_PERSONA_IDS: readonly ShopperPersonaId[] = [
  "minimalist",
  "luxury_seeker",
  "feminine_energy",
  "gamer",
  "family_oriented",
  "creator_enthusiast",
  "value_sniper",
  "premium_buyer",
  "deal_hunter",
  "aesthetic_focused",
  "productivity_focused",
  "neutral",
] as const;

export function isShopperPersonaId(x: string): x is ShopperPersonaId {
  return (ALL_SHOPPER_PERSONA_IDS as readonly string[]).includes(x);
}

export type ShopperPersonaProfile = {
  scores: Partial<Record<ShopperPersonaId, number>>;
  /** Highest-first, max 4. */
  dominant: ShopperPersonaId[];
  /** Short stable labels for memory / meta. */
  labels: string[];
};

export function detectShopperPersonas(query: string, intents: CommerceSearchIntents): ShopperPersonaProfile {
  const q = query.toLowerCase();
  const s: Partial<Record<ShopperPersonaId, number>> = {};
  const t = intents.taste.tagStrength;

  if (intents.minimalistStyle || (t.minimal ?? 0) >= 0.42 || /\b(minimal|clean desk|uncluttered|scandi)\b/i.test(q)) {
    s.minimalist = 0.82;
  }
  if (
    intents.luxury ||
    intents.quietLuxury ||
    (t.luxury ?? 0) >= 0.4 ||
    (t.quiet_luxury ?? 0) >= 0.4 ||
    /\b(luxury|designer|haute|boutique)\b/i.test(q)
  ) {
    s.luxury_seeker = 0.85;
  }
  if (intents.feminineStyle || (t.feminine ?? 0) >= 0.42 || /\b(for her|women|ladies|wife|mom)\b/i.test(q)) {
    s.feminine_energy = 0.78;
  }
  if (intents.gaming || (t.gamer_setup ?? 0) >= 0.45 || /\b(gaming|gamer|rtx|ps5|xbox|steam)\b/i.test(q)) {
    s.gamer = 0.86;
  }
  if (
    intents.giftUse ||
    intents.schoolUse ||
    /\b(kids?|family|toddler|baby|parent|home school)\b/i.test(q)
  ) {
    s.family_oriented = 0.72;
  }
  if (intents.lifestyleCreator || /\b(creator|stream|youtube|podcast|content)\b/i.test(q)) {
    s.creator_enthusiast = 0.8;
  }
  if (
    (intents.budget && intents.qualitySeeking) ||
    intents.explicitBestValue ||
    /\b(cheap but good|value|bang for)\b/i.test(q)
  ) {
    s.value_sniper = 0.8;
  }
  if (intents.premium && !intents.budget && /\b(premium|flagship|best money|top tier)\b/i.test(q)) {
    s.premium_buyer = 0.78;
  }
  if (intents.dealHunter || intents.realDiscountOnly || /\b(deal|sale|discount|% off)\b/i.test(q)) {
    s.deal_hunter = 0.74;
  }
  if (
    intents.aestheticPremium ||
    intents.taste.hasTasteLayer ||
    /\b(aesthetic|vibe|looks premium|instagram)\b/i.test(q)
  ) {
    s.aesthetic_focused = 0.76;
  }
  if (intents.productivity || /\b(work|office|wfh|business|student laptop)\b/i.test(q)) {
    s.productivity_focused = 0.78;
  }

  if (Object.keys(s).length === 0) {
    s.neutral = 0.55;
  }

  const dominant = (Object.entries(s) as [ShopperPersonaId, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => k);

  const labels: string[] = dominant.filter((x) => x !== "neutral").slice(0, 3);
  if (labels.length === 0) labels.push("neutral");

  return { scores: s, dominant, labels };
}

export function personaQueryFingerprint(profile: ShopperPersonaProfile): string {
  return profile.labels.join("|");
}
