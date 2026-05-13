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

const FAKE_OR_NOISE_TITLE =
  /\b(replica|not\s+authentic|oem\s+only|read\s+description\s+only|stock\s+photo|random\s+color|assorted\s+lot|for\s+parts|as.is)\b/i;

const REFURB_OR_USED_SIGNAL =
  /\b(refurb|refurbished|factory renewed|certified renewed|open[-\s]?box|open box|pre[-\s]?owned|scratch\s*[&+]\s*dent|grade\s*[abc]\b|ex[-\s]?display|demo unit|second[-\s]?hand)\b/i;

const GENERIC_MARKETPLACE_NOISE =
  /\b(lot of|bulk lot|wholesale|assorted|styles?\s+may\s+vary|read\s+desc|sold as[-\s]?is|untested|for parts only|no returns|mystery box)\b/i;

/** User explicitly wants used / refurb inventory — do not treat those rows as irrelevant. */
export function userQuerySeeksUsedOrRefurb(query: string): boolean {
  return /\b(refurb|refurbished|renewed|open[-\s]?box|open box|pre[-\s]?owned|used\b|second[-\s]?hand|preowned)\b/i.test(
    query.trim()
  );
}

export function listingSignalsRefurbished(p: {
  title: string;
  availability: string | null;
  extensions: string[];
}): boolean {
  const blob = `${p.title} ${p.availability ?? ""} ${p.extensions.join(" ")}`;
  const t = blob.toLowerCase();
  if (REFURB_OR_USED_SIGNAL.test(t)) return true;
  if (/\bused\s*\/\s*second-hand\b/i.test(t)) return true;
  return false;
}

/**
 * Generic third-party marketplace rows with thin titles / weak proof — often SKU noise vs analyst queries.
 */
export function isShadyGenericMarketplaceRow(p: {
  title: string;
  store: string;
  reviewsCount: number | null;
}): boolean {
  const s = p.store.toLowerCase();
  if (!/\bebay\b|etsy|facebook marketplace|mercari|bonanza|depop\b/i.test(s)) return false;
  const t = p.title.trim();
  const rev = p.reviewsCount ?? 0;
  if (GENERIC_MARKETPLACE_NOISE.test(t) && rev < 14) return true;
  if (/\bebay\b/i.test(s) && t.length < 24 && rev < 8) return true;
  if (/\bread\s+desc|read description\b/i.test(t) && rev < 20) return true;
  return false;
}

/** Marketplace / drop-ship style noise — drop from tray when store is also thin. */
export function isLowConfidenceListing(title: string, store: string): boolean {
  const t = title.trim();
  if (FAKE_OR_NOISE_TITLE.test(t)) return true;
  if (/\b(wholesale|dropship|bulk\s+lot)\b/i.test(t) && store.trim().length < 2) return true;
  const sl = store.toLowerCase();
  if (/\bebay\b/i.test(sl) && GENERIC_MARKETPLACE_NOISE.test(t)) return true;
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
