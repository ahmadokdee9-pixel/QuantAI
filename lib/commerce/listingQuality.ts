/**
 * Marketplace listing hygiene — title cleanup + spam heuristics for ranking/filtering.
 */

const SPAM_TITLE = /(\b(buy|cheap|sale|hurry|100%|!!!|click|free shipping)\b.*){3,}/i;
const EXCESS_PUNCT = /[!?]{4,}/;
const ALL_CAPS_WORD = /^[A-Z0-9\s\-]{18,}$/;

/** Collapse noisy whitespace and redundant marketplace tokens. */
export function normalizeMarketplaceTitle(raw: string): string {
  let t = raw.replace(/\s+/g, " ").trim();
  t = t.replace(/\b(new|brand new|genuine|authentic|fast ship|free ship|usa seller|eu seller)\b/gi, "").replace(/\s+/g, " ").trim();
  return t.slice(0, 220);
}

export function isSpammyListingTitle(title: string): boolean {
  const t = title.trim();
  if (t.length < 4) return true;
  if (SPAM_TITLE.test(t)) return true;
  if (EXCESS_PUNCT.test(t)) return true;
  if (ALL_CAPS_WORD.test(t) && t.length < 80) return true;
  return false;
}

/** 0–1 listing text quality for ranking boosts/penalties (deterministic). */
export function listingTextQuality01(title: string): number {
  const t = title.trim();
  if (t.length < 8) return 0.25;
  let s = 0.55;
  if (t.length >= 24 && t.length <= 160) s += 0.15;
  if (/[a-z]/.test(t) && /[A-Z]/.test(t)) s += 0.08;
  if (/\d/.test(t)) s += 0.05;
  if (isSpammyListingTitle(t)) s -= 0.35;
  return Math.min(1, Math.max(0.08, s));
}
