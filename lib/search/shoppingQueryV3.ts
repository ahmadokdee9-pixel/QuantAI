/**
 * Upstream Google Shopping query shaping — improves recall without changing UI query text.
 * Strips conversational / meta tokens that hurt product matching; expands synonyms and
 * use-case hints so natural-language commands still resolve to strong listing queries.
 */

import { appendArabicCommerceGlosses } from "@/lib/search/queryScriptNormalize";

const LEADING_NOISE =
  /^\s*(find|show|get|give|need|want|looking\s+for|search\s+for|please|can\s+you|help\s+me(\s+to)?|tell\s+me|bring\s+me|fetch|list|surface)\s+/i;

const LEADING_COMPARE = /^\s*compare\s+/i;

const LEADING_WHICH = /^\s*(which|what)\s+(is\s+the\s+)?(best|cheapest|safest)\s+(way\s+to\s+)?(buy|get|find)?\s*/i;

const TRAILING_INTENT_STRIP =
  /\s*[,–—-]?\s*(only|just|please|thanks|for\s+me|right\s+now|today|asap|now)\s*$/i;

/** Phrases that rarely help Shopping recall — strip after extracting product tokens elsewhere. */
const META_PHRASES: RegExp[] = [
  /\btrusted\s+(stores?|retailers?|sellers?)\s+only\b/gi,
  /\b(no\s+)?marketplace(s)?\s+only\b/gi,
  /\bofficial\s+store\s+only\b/gi,
  /\bauthorized\s+dealer\s+only\b/gi,
  /\bonly\s+(from\s+)?ebay\b/gi,
  /\bwith\s+real\s+discounts?\b/gi,
  /\b(real|genuine|actual)\s+discounts?\s+only\b/gi,
  /\b(low\s*risk|safe(r)?)\s+delivery\b/gi,
  /\btrusted\s+seller\b/gi,
  /\bwhich\s+store\s+has\s+the\s+best\s+deal\b/gi,
];

/** Rewrite NL fragments into tokens Shopping understands better. */
const CONTEXT_REWRITES: { rx: RegExp; rep: string }[] = [
  { rx: /\bfor\s+school\b/gi, rep: " student " },
  { rx: /\b(good|great)\s+quality\b/gi, rep: " rated " },
  { rx: /\bbut\s+cheaper\b/gi, rep: " budget alternative " },
  { rx: /\bsomething\s+like\b/gi, rep: " similar " },
  { rx: /\beuro(s)?\b/gi, rep: " EUR " },
  { rx: /\beur\b/gi, rep: " EUR " },
  { rx: /\bdollars?\b/gi, rep: " USD " },
  { rx: /\bpounds?\b/gi, rep: " GBP " },
];

/** Light synonym expansion (append, not replace) for family / category recall. */
const FAMILY_SUFFIX: { test: RegExp; add: string }[] = [
  { test: /\b(laptop|notebook|ultrabook|macbook)\b/i, add: "computer" },
  { test: /\b(phone|smartphone|iphone)\b/i, add: "mobile" },
  { test: /\b(gpu|graphics\s+card)\b/i, add: "video card" },
  { test: /\b(earbuds?|airpods?)\b/i, add: "wireless headphones" },
  { test: /\b(sofa|couch)\b/i, add: "furniture" },
  { test: /\b(oled\s+tv|television)\b/i, add: "4K TV" },
  { test: /\b(gaming\s+)?monitor\b/i, add: "display" },
  { test: /\b(gift|present)\b/i, add: "popular" },
];

/** When query contains anchor term but not hint, append hint once. */
const IMPLICIT_EXPANSIONS: { anchor: RegExp; unless: RegExp; add: string }[] = [
  { anchor: /\bairpods?\b/i, unless: /\bapple\b/i, add: "apple" },
  { anchor: /\b(galaxy|pixel)\b/i, unless: /\b(phone|mobile)\b/i, add: "phone" },
];

function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Query sent to SerpAPI `q` — optimized for listing recall + retailer diversity in results.
 * Original `userQuery` remains the tray intent string everywhere else.
 */
export function buildUpstreamShoppingQuery(userQuery: string): string {
  let q = userQuery.trim();
  if (!q) return q;

  q = appendArabicCommerceGlosses(q);
  q = q.replace(LEADING_COMPARE, "").replace(LEADING_WHICH, "").replace(LEADING_NOISE, "");
  q = q.replace(TRAILING_INTENT_STRIP, "");

  for (const { rx, rep } of CONTEXT_REWRITES) {
    q = q.replace(rx, rep);
  }

  for (const rx of META_PHRASES) {
    q = q.replace(rx, " ");
  }

  q = collapseSpaces(q);
  const lower = q.toLowerCase();

  for (const { anchor, unless, add } of IMPLICIT_EXPANSIONS) {
    if (anchor.test(lower) && !unless.test(lower) && !lower.includes(add.toLowerCase())) {
      q = `${add} ${q}`;
      break;
    }
  }

  for (const { test, add } of FAMILY_SUFFIX) {
    if (test.test(lower) && !lower.includes(add.toLowerCase())) {
      q = `${q} ${add}`;
      break;
    }
  }

  return collapseSpaces(q).slice(0, 240) || userQuery.trim().slice(0, 240);
}
