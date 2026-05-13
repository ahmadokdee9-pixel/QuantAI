import type { QuantProduct } from "@/lib/shoppingScore";
import { ratingValue } from "@/lib/shoppingScore";
import { extractQueryCommerceHints } from "@/lib/deals/productIdentity";
import { hardCategoryMismatch } from "@/lib/commerce/trayListingFilter";
import { latinSkeletonForMatching } from "@/lib/search/queryScriptNormalize";

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "new",
  "sale",
  "best",
  "buy",
  "price",
  "cheap",
  "free",
  "shipping",
  "a",
  "an",
  "to",
  "of",
  "in",
  "on",
  "at",
  "or",
  "vs",
]);

function tokenizeQuery(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^\w\s./-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOP.has(w));
}

function brandKeyMatchesHaystack(brandKey: string, hay: string): boolean {
  switch (brandKey) {
    case "apple":
      return /\b(apple|iphone|ipad|macbook|airpods?|magsafe|imac|mac\s*mini)\b/i.test(hay);
    case "samsung":
      return /\b(samsung|galaxy)\b/i.test(hay);
    case "sony":
      return /\b(sony|playstation|ps5|ps4)\b/i.test(hay);
    case "lg":
      return /\blg\b/i.test(hay);
    case "dell":
      return /\b(dell|alienware)\b/i.test(hay);
    case "hp":
      return /\b(hp|hewlett)\b/i.test(hay);
    case "lenovo":
      return /\b(lenovo|thinkpad)\b/i.test(hay);
    case "asus":
      return /\b(asus|rog|zenbook)\b/i.test(hay);
    case "acer":
      return /\b(acer|predator)\b/i.test(hay);
    case "msi":
      return /\bmsi\b/i.test(hay);
    case "google":
      return /\b(google|pixel)\b/i.test(hay);
    case "xiaomi":
      return /\b(xiaomi|redmi|poco)\b/i.test(hay);
    case "bbk":
      return /\b(oneplus|oppo|realme)\b/i.test(hay);
    case "huawei":
      return /\b(huawei|honor)\b/i.test(hay);
    case "nintendo":
      return /\b(nintendo|switch)\b/i.test(hay);
    case "microsoft":
      return /\b(microsoft|surface|xbox)\b/i.test(hay);
    case "audio-brand":
      return /\b(bose|jbl|beats|sennheiser)\b/i.test(hay);
    case "appliance-brand":
      return /\b(dyson|philips|bosch|miele|siemens)\b/i.test(hay);
    case "fashion-brand":
      return /\b(nike|adidas|puma|reebok|uniqlo|zara)\b/i.test(hay);
    default:
      return hay.includes(brandKey);
  }
}

function modelTokenAppearsInHaystack(model: string, hay: string): boolean {
  const n = model.toLowerCase().replace(/\s+/g, " ").trim();
  if (n.length < 3) return false;
  if (hay.includes(n)) return true;
  const compact = n.replace(/\s/g, "");
  return compact.length >= 4 && hay.includes(compact);
}

function consecutiveTokenPhraseBonus(tokens: string[], hay: string): number {
  if (tokens.length < 2) return 0;
  let b = 0;
  for (let i = 0; i < tokens.length - 1; i++) {
    const phrase = `${tokens[i]} ${tokens[i + 1]}`;
    if (phrase.length >= 5 && hay.includes(phrase)) b += 0.038;
  }
  return Math.min(0.12, b);
}

/**
 * 0–1 overlap between query tokens and listing title + store (broad + specific queries).
 */
export function queryListingRelevance01(query: string, p: QuantProduct): number {
  const merged = `${query} ${latinSkeletonForMatching(query)}`;
  const tokens = tokenizeQuery(merged);
  const hay = `${p.title} ${p.store}`.toLowerCase();
  let base: number;
  if (tokens.length === 0) {
    base = 0.52;
  } else {
    let hits = 0;
    for (const t of tokens) {
      if (hay.includes(t)) hits += 1;
      else if (t.length >= 4 && hay.includes(t.slice(0, -1))) hits += 0.65;
    }
    const ratio = hits / tokens.length;
    base = Math.min(1, Math.max(0.12, 0.22 + ratio * 0.78));
  }

  const hints = extractQueryCommerceHints(query);
  let adj = 0;
  if (hints.brands.length > 0) {
    const any = hints.brands.some((b) => brandKeyMatchesHaystack(b, hay));
    adj += any ? 0.07 : -0.1;
  }
  for (const id of hints.identifiers) {
    const idl = id.toLowerCase();
    if (idl.length >= 4 && hay.includes(idl)) adj += 0.1;
  }
  let modelHit = 0;
  let modelMiss = 0;
  for (const m of hints.models) {
    if (modelTokenAppearsInHaystack(m, hay)) modelHit += 1;
    else if (m.replace(/\s/g, "").length >= 5) modelMiss += 1;
  }
  if (hints.models.length > 0) {
    if (modelHit > 0) adj += Math.min(0.12, modelHit * 0.055);
    if (modelMiss > 0 && modelHit === 0) adj -= Math.min(0.15, modelMiss * 0.065);
  }

  if (hardCategoryMismatch(query, p.title)) {
    adj -= 0.42;
  }

  adj += consecutiveTokenPhraseBonus(tokens, hay);

  return Math.min(1, Math.max(0.1, base + adj));
}

/** Review signal 0–1 for ranking (stars × depth, tray-relative). */
export function reviewQuality01(p: QuantProduct, maxReviews: number): number {
  const r = ratingValue(p.rating);
  const n = p.reviewsCount ?? 0;
  if (r <= 0 && n <= 0) return 0.38;
  const star = Math.min(1, r / 5);
  const depth =
    maxReviews <= 0 ? (n > 0 ? 0.55 : 0.35) : Math.min(1, Math.log10(n + 1) / Math.log10(maxReviews + 1));
  return Math.min(1, star * 0.62 + depth * 0.38);
}
