/**
 * Phase 4 — Deterministic product identity resolution (no embeddings).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { extractProductIdentity } from "@/lib/deals/productIdentity";
import { identityMatchScore } from "@/lib/deals/identityMatchScore";
import {
  buildCommerceId,
  buildFamilyGraphId,
  buildListingKey,
  buildRankingIdentityKey,
  extractIdentifierAnchors,
} from "@/lib/intelligence/normalization/canonicalId";
import { createCanonicalProductIdentity } from "@/lib/intelligence/productIdentity";
import type { IdentityMergeReason, ResolvedProductIdentity } from "./types";
import { normalizeProductTitle } from "./titleNormalization";
import { checkVariantBoundary, extractVariantAxes } from "./variantBoundaryEngine";
import { getStoreTrustScore } from "@/lib/retailTrust";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function identityConfidenceScore(args: {
  anchors: string[];
  brandKnown: boolean;
  identityMatchReady: boolean;
  trustScore: number;
}): number {
  let c = 0.45;
  if (args.anchors.length > 0) c += 0.28;
  if (args.brandKnown) c += 0.12;
  if (args.identityMatchReady) c += 0.08;
  c += (args.trustScore / 100) * 0.12;
  return round4(clamp01(c));
}

/** Resolve canonical identity for a single listing. */
export function resolveProductIdentity(product: QuantProduct): ResolvedProductIdentity {
  const spine = createCanonicalProductIdentity(product);
  const anchors = extractIdentifierAnchors(product);
  const listingKey = buildListingKey(product);
  const commerceId = buildCommerceId(spine.canonicalKey, anchors);
  const familyGraphId = buildFamilyGraphId(spine.brandKey, spine.modelKey);
  const rankingIdentityKey = buildRankingIdentityKey(
    commerceId,
    listingKey,
    product.store
  );
  const axes = extractVariantAxes(product);
  const trust = getStoreTrustScore(product.store);

  return {
    commerceId,
    familyGraphId,
    variantKey: spine.canonicalKey,
    listingKey,
    rankingIdentityKey,
    identifierAnchors: anchors,
    normalizedTitle: normalizeProductTitle(product.title),
    axes,
    identityConfidence: identityConfidenceScore({
      anchors,
      brandKnown: spine.brandKey !== "unknown",
      identityMatchReady: spine.brandKey !== "unknown" || anchors.length > 0,
      trustScore: trust,
    }),
    mergeReason: anchors.length > 0 ? "identifier_anchor" : "variant_key_match",
    boundaryBlocked: false,
    boundaryReasons: [],
  };
}

/** Whether two listings may merge into same canonical product (deterministic). */
export function canMergeIdentities(
  a: QuantProduct,
  b: QuantProduct,
  peerMedian: number
): { allowed: boolean; reason: IdentityMergeReason; boundaryReasons: string[] } {
  const idA = a.qiNormalizedCommerce;
  const idB = b.qiNormalizedCommerce;
  if (idA?.commerceId && idB?.commerceId && idA.commerceId === idB.commerceId) {
    return { allowed: true, reason: "identifier_anchor", boundaryReasons: [] };
  }

  const boundary = checkVariantBoundary(a, b);
  if (boundary.conflict) {
    return {
      allowed: false,
      reason: "blocked_variant_boundary",
      boundaryReasons: boundary.reasons,
    };
  }

  const ra = resolveProductIdentity(a);
  const rb = resolveProductIdentity(b);
  if (ra.variantKey === rb.variantKey) {
    return { allowed: true, reason: "variant_key_match", boundaryReasons: [] };
  }

  const ia = extractProductIdentity(a);
  const ib = extractProductIdentity(b);
  const score = identityMatchScore(ia, ib, a.price, b.price, peerMedian);
  if (score >= 0.84 && ra.identifierAnchors.some((x) => rb.identifierAnchors.includes(x))) {
    return { allowed: true, reason: "identifier_anchor", boundaryReasons: [] };
  }
  if (score >= 0.78) {
    return { allowed: true, reason: "cross_retail_match", boundaryReasons: [] };
  }

  if (ra.familyGraphId === rb.familyGraphId && score >= 0.72) {
    return { allowed: true, reason: "family_graph", boundaryReasons: [] };
  }

  return { allowed: false, reason: "none", boundaryReasons: [] };
}

/** Resolve tray — prefer existing qiNormalizedCommerce when present. */
export function resolveTrayIdentities(products: QuantProduct[]): ResolvedProductIdentity[] {
  return products.map((p) => {
    const n = p.qiNormalizedCommerce;
    if (n?.commerceId) {
      const spine = createCanonicalProductIdentity(p);
      return {
        commerceId: n.commerceId,
        familyGraphId: n.familyGraphId,
        variantKey: n.variantKey,
        listingKey: n.listingKey,
        rankingIdentityKey: n.rankingIdentityKey,
        identifierAnchors: n.identifierAnchors,
        normalizedTitle: normalizeProductTitle(p.title),
        axes: extractVariantAxes(p),
        identityConfidence: identityConfidenceScore({
          anchors: n.identifierAnchors,
          brandKnown: spine.brandKey !== "unknown",
          identityMatchReady: true,
          trustScore: getStoreTrustScore(p.store),
        }),
        mergeReason: n.identifierAnchors.length > 0 ? "identifier_anchor" : "variant_key_match",
        boundaryBlocked: false,
        boundaryReasons: [],
      };
    }
    return resolveProductIdentity(p);
  });
}
