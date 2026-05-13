/**
 * Upstream Google Shopping query shaping — improves recall without changing UI query text.
 * Strips analyst/meta tokens that hurt product matching; preserves model tokens and price hints.
 */

const LEADING_NOISE =
  /^\s*(find|show|get|give|need|want|looking\s+for|search\s+for|please|can\s+you|help\s+me\s+to|help\s+me)\s+/i;

const TRAILING_INTENT_STRIP =
  /\s*[,–—-]?\s*(only|just|please|thanks|for\s+me|right\s+now|today|asap)\s*$/i;

/** Phrases that rarely help Shopping recall — conservative strip to avoid mangling prompts. */
const META_PHRASES: RegExp[] = [
  /\btrusted\s+(stores?|retailers?|sellers?)\s+only\b/gi,
  /\b(no\s+)?marketplace(s)?\s+only\b/gi,
  /\bofficial\s+store\s+only\b/gi,
  /\bauthorized\s+dealer\s+only\b/gi,
];

/** Light synonym expansion for family detection (single trailing token). */
const FAMILY_SUFFIX: { test: RegExp; add: string }[] = [
  { test: /\b(laptop|notebook)\s*$/i, add: "computer" },
  { test: /\b(phone|smartphone)\s*$/i, add: "mobile" },
  { test: /\b(gpu|graphics\s+card)\s*$/i, add: "video card" },
  { test: /\b(earbuds?|earphones?)\s*$/i, add: "wireless headphones" },
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
  q = q.replace(LEADING_NOISE, "").replace(TRAILING_INTENT_STRIP, "");
  for (const rx of META_PHRASES) {
    q = q.replace(rx, " ");
  }
  q = collapseSpaces(q);
  const lower = q.toLowerCase();
  for (const { test, add } of FAMILY_SUFFIX) {
    if (test.test(lower) && !lower.includes(add.toLowerCase())) {
      q = `${q} ${add}`;
      break;
    }
  }
  return collapseSpaces(q).slice(0, 240) || userQuery.trim().slice(0, 240);
}
