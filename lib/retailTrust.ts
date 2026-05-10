export const TRUSTED_SUBSTRINGS = [
  "amazon",
  "bol",
  "coolblue",
  "mediamarkt",
  "apple",
  "ikea",
  "wayfair",
  "best buy",
  "walmart",
  "target",
  "bh photo",
  "newegg",
  "fnac",
  "darty",
  "boulanger",
  "carrefour",
  "costco",
  "home depot",
  "lowe",
  "currys",
  "john lewis",
  "argos",
  "ebay",
] as const;

/** Tier 1 — established omnichannel / specialty with strong buyer protections. */
const TIER1_SCORE = 90;
/** Tier 2 — recognizable national chains. */
const TIER2_SCORE = 82;
/** Tier 3 — unknown but plausible storefront names. */
const TIER3_SCORE = 64;
/** Tier 4 — very short / generic — higher friction assumption. */
const TIER4_SCORE = 52;

const TIER1 = new Set(
  [
    "amazon",
    "apple",
    "best buy",
    "walmart",
    "target",
    "costco",
    "mediamarkt",
    "coolblue",
    "bol",
    "bh photo",
    "newegg",
    "john lewis",
    "fnac",
  ].map((x) => x.toLowerCase())
);

const TIER2 = new Set(
  [
    "ikea",
    "wayfair",
    "home depot",
    "lowe",
    "currys",
    "argos",
    "darty",
    "boulanger",
    "carrefour",
    "ebay",
  ].map((x) => x.toLowerCase())
);

export function getStoreTrustScore(store: string): number {
  const s = store.toLowerCase().trim();
  if (!s) return TIER4_SCORE;
  for (const t of TIER1) {
    if (s.includes(t)) return TIER1_SCORE;
  }
  for (const t of TIER2) {
    if (s.includes(t)) return TIER2_SCORE;
  }
  if (TRUSTED_SUBSTRINGS.some((t) => s.includes(t))) return TIER2_SCORE;
  if (s.length > 2 && s.length < 48) return TIER3_SCORE;
  return TIER4_SCORE;
}

/** 0–100 percentile-style rank for leaderboard UX (deterministic). */
export function getTrustRankPercentile(store: string): number {
  const base = getStoreTrustScore(store);
  const len = Math.min(48, Math.max(3, store.trim().length));
  const jitter = (len % 7) - 3;
  return Math.min(100, Math.max(0, base + jitter));
}

export function getTrustTierLabel(store: string): "elite" | "strong" | "standard" | "caution" {
  const n = getStoreTrustScore(store);
  if (n >= 88) return "elite";
  if (n >= 78) return "strong";
  if (n >= 60) return "standard";
  return "caution";
}
