/**
 * Bilingual listing-match expansion — Arabic script, transliteration, and brand bridges.
 * Used for relevance scoring only (never shown to users).
 */

import {
  appendArabicCommerceGlosses,
  latinSkeletonForMatching,
  normalizeEasternDigitsInString,
} from "@/lib/search/queryScriptNormalize";

/** Arabic / transliterated brand tokens → Latin commerce tokens. */
const BRAND_TRANSLIT: { rx: RegExp; en: string }[] = [
  { rx: /(?:آبل|أبل|ابل)/i, en: " apple " },
  { rx: /(?:سامسونج|سامسونغ)/i, en: " samsung galaxy " },
  { rx: /(?:نايك|نايكي)/i, en: " nike " },
  { rx: /(?:اديداس|أديداس)/i, en: " adidas " },
  { rx: /(?:سوني)/i, en: " sony " },
  { rx: /(?:بوز)/i, en: " bose " },
  { rx: /(?:دايسون)/i, en: " dyson " },
  { rx: /(?:ايربودز|إيربودز|ايربود)/i, en: " airpods " },
  { rx: /(?:بلايستيشن|بلاي\s*ستيشن)/i, en: " playstation ps5 " },
];

/** Product-family transliteration (mixed-script queries). */
const PRODUCT_TRANSLIT: { rx: RegExp; en: string }[] = [
  { rx: /(?:برو\s*ماكس|برو\s*مكس)/i, en: " pro max " },
  { rx: /(?:تيتانيوم|تيتانيوم)/i, en: " titanium " },
  { rx: /(?:فوميرو|فوميرو\s*5)/i, en: " vomero " },
  { rx: /(?:كومن\s*بروجكت|كومن\s*بروجكتس)/i, en: " common projects " },
  { rx: /(?:مكتب|مكتبي)/i, en: " office desk " },
  { rx: /(?:تركيز|للتركيز)/i, en: " focus concentration " },
  { rx: /(?:فخم|فاخر|راقي)/i, en: " luxury premium " },
];

export function transliterateCommerceTokens(q: string): string {
  let add = "";
  const s = normalizeEasternDigitsInString(q);
  for (const { rx, en } of [...BRAND_TRANSLIT, ...PRODUCT_TRANSLIT]) {
    if (rx.test(s)) add += en;
  }
  return add;
}

/** Full expansion string for title/store overlap scoring. */
export function expandQueryForListingMatch(query: string): string {
  const base = normalizeEasternDigitsInString(query.trim());
  const glossed = appendArabicCommerceGlosses(base);
  const translit = transliterateCommerceTokens(base);
  const latin = latinSkeletonForMatching(base);
  return `${base} ${latin} ${glossed} ${translit}`
    .toLowerCase()
    .replace(/[^\p{L}\p{N}€$£\s+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Distinct match tokens (length ≥ 2) for coverage scoring. */
export function bilingualMatchTokens(query: string, max = 36): string[] {
  const expanded = expandQueryForListingMatch(query);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of expanded.split(/\s+/)) {
    const tok = t.trim().toLowerCase();
    if (tok.length < 2 || seen.has(tok)) continue;
    if (/^(the|and|for|with|best|buy|cheap|under|like|but|voor|de|het|een)$/.test(tok)) continue;
    seen.add(tok);
    out.push(tok);
  }
  return out.slice(0, max);
}
