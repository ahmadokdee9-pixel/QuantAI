/**
 * Phase 4 — Deterministic title / edition / generation normalization (no embeddings).
 */

import { normalizeRegionalTitleNoise } from "@/lib/intelligence/variantNormalization";

const BUNDLE_NOISE =
  /\b(bundle|combo|pack of \d|with case|with charger|accessory kit|replacement|compatible with|for iphone|for samsung)\b/i;
const ACCESSORY_NOISE = /\b(case|cover|screen protector|tempered glass|strap|band only|cable only|adapter only)\b/i;

/** Normalize merchant title drift for identity comparison. */
export function normalizeProductTitle(title: string): string {
  let t = normalizeRegionalTitleNoise(title);
  t = t
    .replace(/[™®©]/g, "")
    .replace(/\b(wi[-\s]?fi|wifi|5g|lte|unlocked|dual sim|esim)\b/gi, "")
    .replace(/\b(eu|us|uk|de|fr|nl|be|global|international)\s*(version|model|spec)?\b/gi, "")
    .replace(/\b(gen|generation)\s*(\d+)\b/gi, "gen$2")
  .replace(/\b(\d)(?:st|nd|rd|th)\s+gen\b/gi, "gen$1")
    .replace(/\s+/g, " ")
    .trim();
  return t.slice(0, 160);
}

export function extractGenerationKey(title: string): string | null {
  const t = title.toLowerCase();
  const iphone = t.match(/\biphone\s*(\d{1,2})\b/);
  if (iphone) return `iphone_gen_${iphone[1]}`;
  const airpods = t.match(/\bairpods?\s*pro\s*(?:2|ii|2nd)?\b/);
  if (airpods) return "airpods_pro_2";
  if (/\bairpods?\s*pro\b/.test(t)) return "airpods_pro";
  const galaxy = t.match(/\bgalaxy\s*(s\d{1,2})\b/);
  if (galaxy) return `galaxy_${galaxy[1]}`;
  return null;
}

export function extractEditionKey(title: string): string | null {
  const t = title.toLowerCase();
  if (/\b(pro\s*max|promax)\b/.test(t)) return "pro_max";
  if (/\b(ultra|ultimate)\b/.test(t)) return "ultra";
  if (/\b(pro|plus)\b/.test(t)) return t.includes("plus") ? "plus" : "pro";
  if (/\b(mini|se)\b/.test(t)) return t.includes("mini") ? "mini" : "se";
  if (/\b(standard|base)\b/.test(t)) return "standard";
  return null;
}

export function isAccessoryListing(title: string): boolean {
  return ACCESSORY_NOISE.test(title) && !/\b(iphone|galaxy|airpods|macbook|ipad)\b/i.test(title);
}

export function isBundleContamination(title: string): boolean {
  return BUNDLE_NOISE.test(title);
}

export function titleIdentityTokens(title: string): string[] {
  const norm = normalizeProductTitle(title);
  return norm.split(/\s+/).filter((w) => w.length > 2).slice(0, 24);
}
