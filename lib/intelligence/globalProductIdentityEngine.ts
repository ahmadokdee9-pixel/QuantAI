/**
 * Phase 37 — Global Product Identity Engine.
 * Normalizes product identity and classifies comparison relationships.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import {
  assessStructuredProductIdentity,
  createCanonicalProductIdentity,
  sameStructuredIdentityFamily,
} from "@/lib/intelligence/productIdentity";
import { resolveQiListingIdentity } from "@/lib/intelligence/universalListingIdentity";
import {
  normalizeColorKey,
  normalizeConditionLabel,
  normalizeSizeKey,
  normalizeStorageGb,
} from "@/lib/intelligence/variantNormalization";

export type GlobalIdentityClass =
  | "SAME PRODUCT"
  | "SIMILAR PRODUCT"
  | "BETTER VALUE PRODUCT"
  | "SUPERIOR PRODUCT"
  | "CHEAPER ALTERNATIVE"
  | "UNRELATED";

export type GlobalProductIdentity = {
  version: 1;
  canonicalKey: string;
  brandKey: string;
  modelKey: string;
  normalizedTitle: string;
  model: string;
  size: string;
  color: string;
  storage: string;
  dimensions: string;
  generation: string;
  condition: string;
  identityClass: GlobalIdentityClass;
  identityConfidence: number;
  comparable: boolean;
};

function extractGeneration(title: string, searchQuery: string): string {
  const blob = `${title} ${searchQuery}`.toLowerCase();
  const gen = blob.match(/\b(gen(?:eration)?\s*\d+|m\d(?:\s*pro)?|s\d{2,3}|iphone\s*\d+|galaxy\s*s\d+)\b/i);
  return gen?.[1]?.replace(/\s+/g, "") ?? "";
}

function extractDimensions(title: string): string {
  const dim = title.match(/\b(\d{2,3}\s*[x×]\s*\d{2,3}(?:\s*[x×]\s*\d{2,3})?\s*(?:cm|mm|in)?)\b/i);
  return dim?.[1]?.trim() ?? "";
}

/** Resolve normalized global identity for one listing. */
export function resolveGlobalProductIdentity(
  product: QuantProduct,
  searchQuery: string,
  trayMedianQuality = 50
): GlobalProductIdentity {
  const canonical = createCanonicalProductIdentity(product);
  const listing = resolveQiListingIdentity(product, searchQuery);
  const structured = assessStructuredProductIdentity({ product, listingIdentity: listing });
  const blob = `${product.title} ${product.extensions?.join(" ") ?? ""}`;

  const storageGb = normalizeStorageGb(blob);
  const color = normalizeColorKey(blob);
  const size = normalizeSizeKey(blob);
  const condition = normalizeConditionLabel(blob);
  const generation = extractGeneration(product.title, searchQuery);
  const dimensions = extractDimensions(product.title);

  const quality = Math.round(((product.rating as number) || 4) * 20);
  const priceVsPeers =
    trayMedianQuality > 0 && product.price > 0 ? (trayMedianQuality - product.price) / trayMedianQuality : 0;

  let identityClass: GlobalIdentityClass = "SIMILAR PRODUCT";
  if (structured.relation === "exact_product" || structured.relation === "same_product_family") {
    identityClass = "SAME PRODUCT";
  } else if (structured.relation === "wrong_product" || structured.relation === "fake_placeholder") {
    identityClass = "UNRELATED";
  } else if (quality >= 85 && priceVsPeers > 0.05) {
    identityClass = "BETTER VALUE PRODUCT";
  } else if (quality >= 90) {
    identityClass = "SUPERIOR PRODUCT";
  } else if (priceVsPeers > 0.12) {
    identityClass = "CHEAPER ALTERNATIVE";
  }

  return {
    version: 1,
    canonicalKey: canonical.canonicalKey,
    brandKey: canonical.brandKey,
    modelKey: canonical.modelKey,
    normalizedTitle: canonical.normalizedTitleHint,
    model: canonical.modelKey,
    size: size || "standard",
    color: color || "unspecified",
    storage: storageGb != null ? `${storageGb}GB` : "unspecified",
    dimensions: dimensions || "unspecified",
    generation: generation || "unspecified",
    condition,
    identityClass,
    identityConfidence: Math.round(structured.confidence01 * 100),
    comparable: identityClass !== "UNRELATED",
  };
}

/** Classify relationship between two listings — never compare unrelated items. */
export function classifyIdentityRelation(
  anchor: GlobalProductIdentity,
  peer: GlobalProductIdentity,
  anchorProduct: QuantProduct,
  peerProduct: QuantProduct
): GlobalIdentityClass {
  if (anchor.canonicalKey === peer.canonicalKey) return "SAME PRODUCT";

  const listingA = resolveQiListingIdentity(anchorProduct, "");
  const listingB = resolveQiListingIdentity(peerProduct, "");
  const structuredA = assessStructuredProductIdentity({ product: anchorProduct, listingIdentity: listingA });
  const structuredB = assessStructuredProductIdentity({ product: peerProduct, listingIdentity: listingB });
  const family = sameStructuredIdentityFamily(structuredA, structuredB);
  if (!family.ok) return "UNRELATED";

  if (peerProduct.price < anchorProduct.price * 0.95 && (peerProduct.rating as number) >= (anchorProduct.rating as number) - 0.3) {
    return "CHEAPER ALTERNATIVE";
  }
  if ((peerProduct.rating as number) >= (anchorProduct.rating as number) + 0.4 && peerProduct.price <= anchorProduct.price * 1.08) {
    return "BETTER VALUE PRODUCT";
  }
  if ((peerProduct.rating as number) >= (anchorProduct.rating as number) + 0.6) {
    return "SUPERIOR PRODUCT";
  }
  return "SIMILAR PRODUCT";
}
