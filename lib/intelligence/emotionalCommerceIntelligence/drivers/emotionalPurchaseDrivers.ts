/**
 * Phase 17 — Emotional purchase drivers.
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function resolveEmotionalPurchaseDrivers(query: string): {
  driver: string;
  strength01: number;
} {
  const q = query.toLowerCase();
  if (/\b(gift|present|surprise)\b/.test(q)) return { driver: "gift_emotion", strength01: 0.65 };
  if (/\b(treat|reward|celebrate)\b/.test(q)) return { driver: "self_reward", strength01: 0.58 };
  if (/\b(upgrade|newer|latest)\b/.test(q)) return { driver: "upgrade_identity", strength01: 0.52 };
  if (/\b(comfort|cozy|relax)\b/.test(q)) return { driver: "comfort_seeking", strength01: 0.48 };
  if (/\b(deal|sale|save)\b/.test(q)) return { driver: "deal_anxiety_relief", strength01: 0.42 };
  return { driver: "exploratory", strength01: 0.3 };
}
