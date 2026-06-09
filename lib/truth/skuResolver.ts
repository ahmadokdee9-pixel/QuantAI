/**
 * Phase 1C — SKU resolver (GTIN → UPC → EAN → MPN → Brand+Model → Fingerprint).
 */

import { createHash } from "node:crypto";
import type { QuantProduct } from "@/lib/shoppingScore";
import { extractProductIdentity } from "@/lib/deals/productIdentity";
import { createCanonicalProductIdentity } from "@/lib/intelligence/productIdentity";
import { resolveGlobalProductIdentity } from "@/lib/intelligence/globalProductIdentityEngine";
import {
  extractMerchantListingId,
  normalizeMerchantKey,
} from "@/lib/truth/crossMerchantLinking";
import { buildProductFingerprint, fingerprintStableKey } from "@/lib/truth/productFingerprint";
import type {
  ResolvedSkuIdentity,
  SkuGlobalProductIdentity,
  SkuResolverMethod,
} from "@/lib/truth/skuIdentityTypes";

export type StructuredIdentifier = {
  kind: "gtin" | "upc" | "ean" | "mpn";
  value: string;
};

const GTIN_RE = /\b(\d{14})\b/;
const EAN_RE = /\b(\d{13})\b/;
const UPC_RE = /\b(\d{12})\b/;

function hashKey(prefix: string, value: string): string {
  const normalized = value.trim().toUpperCase();
  return `${prefix}:${createHash("sha256").update(normalized).digest("hex").slice(0, 24)}`;
}

function fingerprintSkuId(fingerprintKey: string): string {
  return `fp:${createHash("sha256").update(fingerprintKey).digest("hex").slice(0, 32)}`;
}

function brandModelSkuId(canonicalKey: string): string {
  return `bm:${createHash("sha256").update(canonicalKey).digest("hex").slice(0, 32)}`;
}

function confidenceForMethod(method: SkuResolverMethod): number {
  switch (method) {
    case "gtin":
      return 98;
    case "upc":
      return 96;
    case "ean":
      return 96;
    case "mpn":
      return 88;
    case "brand_model":
      return 78;
    case "fingerprint":
      return 62;
  }
}

/** Parse structured identifiers from listing text with resolver priority hints. */
export function extractStructuredIdentifiers(product: QuantProduct): StructuredIdentifier[] {
  const blob = `${product.title} ${product.extensions?.join(" ") ?? ""}`.toUpperCase();
  const identity = extractProductIdentity(product);
  const out: StructuredIdentifier[] = [];
  const seen = new Set<string>();

  function push(kind: StructuredIdentifier["kind"], value: string) {
    const key = `${kind}:${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ kind, value });
  }

  for (const id of identity.identifiers) {
    if (/^MPN|^MODEL|^SKU|^ASIN/.test(id) || /[A-Z]{2,}-?\d{3,}/.test(id)) {
      push("mpn", id.replace(/^(MPN|MODEL|SKU|ASIN)[:\s#-]*/i, ""));
    }
  }

  const labeled = blob.matchAll(/\b(GTIN|UPC|EAN|MPN)\s*[:#]?\s*([A-Z0-9-]{4,})\b/g);
  for (const match of labeled) {
    const label = match[1];
    const value = (match[2] ?? "").replace(/[^\dA-Z-]/g, "");
    if (!value) continue;
    if (label === "GTIN") push("gtin", value);
    else if (label === "UPC") push("upc", value);
    else if (label === "EAN") push("ean", value);
    else if (label === "MPN") push("mpn", value);
  }

  const gtin = blob.match(GTIN_RE)?.[1];
  if (gtin) push("gtin", gtin);
  const ean = blob.match(EAN_RE)?.[1];
  if (ean && !gtin) push("ean", ean);
  const upc = blob.match(UPC_RE)?.[1];
  if (upc && !gtin && !ean) push("upc", upc);

  return out;
}

function pickResolverIdentifier(ids: StructuredIdentifier[]): StructuredIdentifier | null {
  const order: StructuredIdentifier["kind"][] = ["gtin", "upc", "ean", "mpn"];
  for (const kind of order) {
    const hit = ids.find((id) => id.kind === kind);
    if (hit) return hit;
  }
  return null;
}

function toGlobalSnapshot(
  product: QuantProduct,
  searchQuery: string,
  confidence: number
): SkuGlobalProductIdentity {
  const global = resolveGlobalProductIdentity(product, searchQuery);
  return {
    version: global.version,
    canonicalKey: global.canonicalKey,
    brandKey: global.brandKey,
    modelKey: global.modelKey,
    normalizedTitle: global.normalizedTitle,
    model: global.model,
    size: global.size,
    color: global.color,
    storage: global.storage,
    condition: global.condition,
    identityConfidence: Math.round((global.identityConfidence + confidence) / 2),
  };
}

/** Resolve canonical SKU identity for one merchant listing. */
export function resolveSkuIdentity(args: {
  product: QuantProduct;
  listingUrl: string;
  searchQuery?: string | null;
}): ResolvedSkuIdentity {
  const searchQuery = args.searchQuery?.trim() ?? "";
  const fingerprint = buildProductFingerprint(args.product, searchQuery);
  const canonical = createCanonicalProductIdentity(args.product);
  const merchantKey = normalizeMerchantKey(args.product.store, args.listingUrl);
  const merchantListingId = extractMerchantListingId(args.listingUrl, merchantKey);
  const globalProductIdentity = toGlobalSnapshot(args.product, searchQuery, 70);

  const structured = extractStructuredIdentifiers(args.product);
  const picked = pickResolverIdentifier(structured);

  if (picked?.kind === "gtin") {
    return {
      canonicalSkuId: hashKey("gtin", picked.value),
      canonicalKey: canonical.canonicalKey,
      resolverMethod: "gtin",
      identityConfidence: confidenceForMethod("gtin"),
      globalProductIdentity: { ...globalProductIdentity, identityConfidence: confidenceForMethod("gtin") },
      fingerprint,
      merchantKey,
      merchantListingId,
    };
  }
  if (picked?.kind === "upc") {
    return {
      canonicalSkuId: hashKey("upc", picked.value),
      canonicalKey: canonical.canonicalKey,
      resolverMethod: "upc",
      identityConfidence: confidenceForMethod("upc"),
      globalProductIdentity: { ...globalProductIdentity, identityConfidence: confidenceForMethod("upc") },
      fingerprint,
      merchantKey,
      merchantListingId,
    };
  }
  if (picked?.kind === "ean") {
    return {
      canonicalSkuId: hashKey("ean", picked.value),
      canonicalKey: canonical.canonicalKey,
      resolverMethod: "ean",
      identityConfidence: confidenceForMethod("ean"),
      globalProductIdentity: { ...globalProductIdentity, identityConfidence: confidenceForMethod("ean") },
      fingerprint,
      merchantKey,
      merchantListingId,
    };
  }
  if (picked?.kind === "mpn") {
    return {
      canonicalSkuId: hashKey("mpn", picked.value),
      canonicalKey: canonical.canonicalKey,
      resolverMethod: "mpn",
      identityConfidence: confidenceForMethod("mpn"),
      globalProductIdentity: { ...globalProductIdentity, identityConfidence: confidenceForMethod("mpn") },
      fingerprint,
      merchantKey,
      merchantListingId,
    };
  }

  if (canonical.brandKey !== "unknown" && canonical.modelKey.length > 2) {
    return {
      canonicalSkuId: brandModelSkuId(canonical.canonicalKey),
      canonicalKey: canonical.canonicalKey,
      resolverMethod: "brand_model",
      identityConfidence: confidenceForMethod("brand_model"),
      globalProductIdentity: { ...globalProductIdentity, identityConfidence: confidenceForMethod("brand_model") },
      fingerprint,
      merchantKey,
      merchantListingId,
    };
  }

  const fpKey = fingerprintStableKey(fingerprint);
  return {
    canonicalSkuId: fingerprintSkuId(fpKey),
    canonicalKey: canonical.canonicalKey,
    resolverMethod: "fingerprint",
    identityConfidence: confidenceForMethod("fingerprint"),
    globalProductIdentity: { ...globalProductIdentity, identityConfidence: confidenceForMethod("fingerprint") },
    fingerprint,
    merchantKey,
    merchantListingId,
  };
}

/** Resolve many listings and group by canonical SKU (cross-merchant linking). */
export function resolveSkuIdentitiesForListings(
  listings: Array<{ product: QuantProduct; listingUrl: string; searchQuery?: string | null }>
): ResolvedSkuIdentity[] {
  return listings.map((listing) =>
    resolveSkuIdentity({
      product: listing.product,
      listingUrl: listing.listingUrl,
      searchQuery: listing.searchQuery,
    })
  );
}
