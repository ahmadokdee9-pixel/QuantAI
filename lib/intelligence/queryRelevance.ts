import type { QuantProduct } from "@/lib/shoppingScore";
import { ratingValue } from "@/lib/shoppingScore";

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

/**
 * 0–1 overlap between query tokens and listing title + store (broad + specific queries).
 */
export function queryListingRelevance01(query: string, p: QuantProduct): number {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return 0.52;
  const hay = `${p.title} ${p.store}`.toLowerCase();
  let hits = 0;
  for (const t of tokens) {
    if (hay.includes(t)) hits += 1;
    else if (t.length >= 4 && hay.includes(t.slice(0, -1))) hits += 0.65;
  }
  const ratio = hits / tokens.length;
  return Math.min(1, Math.max(0.12, 0.22 + ratio * 0.78));
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
