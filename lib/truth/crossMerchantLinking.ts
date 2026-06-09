/**
 * Phase 1C — Cross-merchant normalization and linking.
 */

import type { ResolvedSkuIdentity } from "@/lib/truth/skuIdentityTypes";

export const SUPPORTED_CROSS_MERCHANTS = [
  "amazon",
  "walmart",
  "bestbuy",
  "target",
  "ebay",
] as const;

export type SupportedCrossMerchant = (typeof SUPPORTED_CROSS_MERCHANTS)[number];

const MERCHANT_HOST_PATTERNS: { key: SupportedCrossMerchant; patterns: RegExp[] }[] = [
  { key: "amazon", patterns: [/amazon\./i, /\ba\.co\b/i] },
  { key: "walmart", patterns: [/walmart\./i] },
  { key: "bestbuy", patterns: [/bestbuy\./i, /best-buy\./i] },
  { key: "target", patterns: [/target\./i] },
  { key: "ebay", patterns: [/ebay\./i] },
];

const MERCHANT_STORE_ALIASES: Record<SupportedCrossMerchant, RegExp[]> = {
  amazon: [/\bamazon\b/i, /\bamazon\.com\b/i],
  walmart: [/\bwalmart\b/i],
  bestbuy: [/\bbest\s*buy\b/i, /\bbestbuy\b/i],
  target: [/\btarget\b/i],
  ebay: [/\bebay\b/i],
};

/** Normalize retailer/store label to a merchant key. */
export function normalizeMerchantKey(store: string, listingUrl?: string): string {
  const storeBlob = store.trim().toLowerCase();
  for (const { key, patterns } of MERCHANT_HOST_PATTERNS) {
    for (const re of MERCHANT_STORE_ALIASES[key]) {
      if (re.test(storeBlob)) return key;
    }
  }

  if (listingUrl) {
    try {
      const host = new URL(listingUrl).hostname.toLowerCase();
      for (const { key, patterns } of MERCHANT_HOST_PATTERNS) {
        if (patterns.some((re) => re.test(host))) return key;
      }
      const label = host.replace(/^www\./, "").split(".")[0];
      return label || "unknown";
    } catch {
      /* fall through */
    }
  }

  return storeBlob.replace(/\s+/g, "_").slice(0, 48) || "unknown";
}

export function isSupportedCrossMerchant(merchantKey: string): merchantKey is SupportedCrossMerchant {
  return (SUPPORTED_CROSS_MERCHANTS as readonly string[]).includes(merchantKey);
}

/** Extract merchant-specific listing id from URL when possible. */
export function extractMerchantListingId(listingUrl: string, merchantKey: string): string | null {
  try {
    const url = new URL(listingUrl);
    const path = url.pathname;
    if (merchantKey === "amazon") {
      const asin = path.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i)?.[1];
      return asin?.toUpperCase() ?? null;
    }
    if (merchantKey === "ebay") {
      const item = path.match(/\/itm\/(\d+)/i)?.[1];
      return item ?? null;
    }
    if (merchantKey === "walmart") {
      const id = path.match(/\/ip\/[^/]+\/(\d+)/i)?.[1];
      return id ?? null;
    }
    if (merchantKey === "bestbuy") {
      const sku = path.match(/\/(\d{6,8})\.p/i)?.[1];
      return sku ?? null;
    }
    if (merchantKey === "target") {
      const t = path.match(/\/A-(\d+)/i)?.[1];
      return t ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

/** Same canonical SKU → same product across merchants. */
export function listingsShareCanonicalSku(a: ResolvedSkuIdentity, b: ResolvedSkuIdentity): boolean {
  return a.canonicalSkuId === b.canonicalSkuId;
}

export function groupResolvedIdentitiesBySku(
  identities: ResolvedSkuIdentity[]
): Map<string, ResolvedSkuIdentity[]> {
  const groups = new Map<string, ResolvedSkuIdentity[]>();
  for (const identity of identities) {
    const bucket = groups.get(identity.canonicalSkuId) ?? [];
    bucket.push(identity);
    groups.set(identity.canonicalSkuId, bucket);
  }
  return groups;
}
