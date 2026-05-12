/**
 * Global retailer heuristics for trust scoring (name substring match on feed `store`).
 * Not a legal endorsement — a UX prior for comparison ranking.
 */

export const TRUSTED_SUBSTRINGS = [
  "amazon",
  "ebay",
  "walmart",
  "best buy",
  "bestbuy",
  "target",
  "newegg",
  "b&h",
  "bh photo",
  "adorama",
  "back market",
  "coolblue",
  "bol.com",
  "bol ",
  "mediamarkt",
  "media markt",
  "fnac",
  "carrefour",
  "otto",
  "zalando",
  "asos",
  "nike",
  "adidas",
  "samsung",
  "apple",
  "lenovo",
  "microsoft",
  "asus",
  "hp store",
  "dell",
  "costco",
  "etsy",
  "rakuten",
  "noon",
  "flipkart",
  "ikea",
  "wayfair",
  "darty",
  "boulanger",
  "currys",
  "john lewis",
  "argos",
  "home depot",
  "lowe",
  "decathlon",
  "alternate",
  "alternate.de",
] as const;

/** Tier 1 — flagship omnichannel / first-party stores with strong buyer protections. */
const TIER1_SCORE = 90;
/** Tier 2 — large national / regional chains & reputable marketplaces. */
const TIER2_SCORE = 82;
/** Tier 3 — recognizable specialty or mid-market. */
const TIER3_SCORE = 70;
/** Tier 4 — unknown / short names — assume higher variance. */
const TIER4_SCORE = 54;

const TIER1 = new Set(
  [
    "amazon",
    "apple",
    "microsoft",
    "samsung",
    "best buy",
    "bestbuy",
    "walmart",
    "target",
    "costco",
    "newegg",
    "bh photo",
    "b&h",
    "adorama",
    "mediamarkt",
    "media markt",
    "coolblue",
    "bol.com",
    "bol ",
    "fnac",
    "john lewis",
    "apple store",
    "microsoft store",
    "samsung store",
    "lenovo",
    "asus",
    "hp store",
    "dell",
    "zalando",
    "nike",
    "adidas",
    "noon",
    "flipkart",
    "carrefour",
    "otto",
    "back market",
    "ikea",
    "decathlon",
    "alternate",
    "alternate.de",
  ].map((x) => x.toLowerCase())
);

const TIER2 = new Set(
  [
    "ebay",
    "etsy",
    "rakuten",
    "wayfair",
    "home depot",
    "lowe",
    "currys",
    "argos",
    "darty",
    "boulanger",
    "asos",
  ].map((x) => x.toLowerCase())
);

/** Domains / names treated as high-variance marketplaces — down-ranked vs first-party retail. */
const LOW_TRUST_MARKETPLACE = /temu|aliexpress|wish\.com|dhgate|banggood|geekbuying|lightinthebox|tomtop/i;

export function getStoreTrustScore(store: string): number {
  const s = store.toLowerCase().trim();
  if (!s) return TIER4_SCORE;
  if (LOW_TRUST_MARKETPLACE.test(s)) return 36;
  for (const t of TIER1) {
    if (s.includes(t)) return TIER1_SCORE;
  }
  for (const t of TIER2) {
    if (s.includes(t)) return TIER2_SCORE;
  }
  if (TRUSTED_SUBSTRINGS.some((t) => s.includes(t))) return TIER2_SCORE;
  if (s.length > 2 && s.length < 52) return TIER3_SCORE;
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
  if (n >= 62) return "standard";
  return "caution";
}

/**
 * Marketplace / third-party variance risk (not the same as trust score).
 * High = more diligence on seller identity, warranty, and returns.
 */
export function getMarketplaceSellerRiskTier(store: string, listingTitle?: string): "low" | "medium" | "high" {
  const s = store.toLowerCase();
  const title = (listingTitle ?? "").toLowerCase();
  if (
    /replica|oem only|not actual (item|product)|stock photo|random color|assorted|read desc|for parts|as.is|no warranty|exact item not shown/i.test(
      title
    )
  ) {
    return "high";
  }
  if (/temu|aliexpress|wish\.com|dhgate|banggood|geekbuying|lightinthebox|tomtop/i.test(s)) return "high";
  if (/ebay|etsy|facebook marketplace|rakuten marketplace|amazon marketplace/i.test(s)) return "medium";
  return "low";
}

/** Coarse geo signal from store naming (no IP geolocation). */
export function inferStoreRegionHint(store: string): "us" | "eu" | "uk" | "me" | "asia" | "unknown" {
  const s = store.toLowerCase();
  if (/\.(nl|de|fr|be|es|it|pl|se|dk|at|ch)\b|coolblue|bol\.|mediamarkt|fnac|zalando|otto|carrefour|decathlon|alternate/i.test(s)) {
    return "eu";
  }
  if (/\.co\.uk|john lewis|argos|currys/i.test(s)) return "uk";
  if (/noon|\.ae|namshi|souq/i.test(s)) return "me";
  if (/flipkart|\.in\b|noon|rakuten\.co\.jp|\.jp\b/i.test(s)) return "asia";
  if (/walmart|target|best buy|newegg|costco|\.com\b/i.test(s)) return "us";
  return "unknown";
}
