/**
 * QuantAI Canonical Commerce Identity — OS-grade SKU lineage + confidence triple for downstream brains.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { QuantAIRealityTrustLayer } from "@/lib/intelligence/realityTrustTypes";
import type { ProductUnderstanding } from "@/lib/intelligence/productUnderstanding";
import type { QiListingIdentity } from "@/lib/intelligence/listingIdentityTypes";
import { normalizeQiListingIdentity } from "@/lib/intelligence/normalizeIntelligenceSignals";
import { createCanonicalProductIdentity } from "@/lib/intelligence/productIdentity";
import { buildUniversalProductFingerprint, fuzzyFamilyGroupingKey } from "@/lib/intelligence/universalIdentity";

export type QiCanonicalIdentity = {
  /** Stable tray-global-ish handle derived from canonical spine + variants (deterministic hash). */
  canonicalProductId: string;
  /** Merged listing × canonical spine fingerprint for caches / memo boundaries. */
  identityFingerprint: string;
  /** Brand + model spine (human-readable lineage). */
  productLineage: string;
  /** Soft family bucket for clustering hints (ignores noisy retailer variants). */
  familyClusterId: string;
  /** Same-product confidence vs accessory/noise plane — 0–100. */
  identityConfidence: number;
  /** Merchant ecosystem confidence — 0–100 (routing × trust × marketplace variance). */
  merchantConfidence: number;
  /** Listing authenticity / realism blend — 0–100. */
  authenticityConfidence: number;
};

function fnv1aHex(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 16777619);
  }
  return (h >>> 0).toString(16);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function clamp01(x: number): number {
  return clamp(x, 0, 1);
}

/** Canonical snapshot attached during enrichment (after listing identity + understanding exist). */
export function buildQiCanonicalIdentity(args: {
  product: QuantProduct;
  listingIdentity: QiListingIdentity;
  merchantConfidence01: number;
  productUnderstanding: ProductUnderstanding;
  realityTrust: QuantAIRealityTrustLayer | undefined;
}): QiCanonicalIdentity {
  const { product, merchantConfidence01, productUnderstanding, realityTrust } = args;
  const listingIdentity = normalizeQiListingIdentity(args.listingIdentity);
  const canon = createCanonicalProductIdentity(product);
  const ufp = buildUniversalProductFingerprint(product);
  const famKey = fuzzyFamilyGroupingKey(ufp);

  const canonicalProductId = `qcp_${fnv1aHex(canon.canonicalKey)}`;
  const identityFingerprint = `${listingIdentity.fingerprintCompact}::${fnv1aHex(canon.canonicalKey)}`;
  const productLineage = `${canon.brandKey}::${canon.modelKey}`.replace(/\s+/g, " ").trim().slice(0, 96);
  const familyClusterId = `fcl_${fnv1aHex(famKey)}`;

  const idConf01 = clamp01(
    0.94 -
      listingIdentity.listingRisk01 * 0.54 -
      listingIdentity.contaminant01 * 0.29 -
      listingIdentity.semanticMismatchPenalty01 * 0.38 -
      listingIdentity.contaminationRisk01 * 0.22 +
      (productUnderstanding.matchQuality / 100) * 0.11 +
      (productUnderstanding.productConfidence / 100) * 0.09 +
      listingIdentity.bundleIntegrity01 * 0.06
  );

  const merchantConfidence = Math.round(clamp01(merchantConfidence01) * 100);

  const authBlend =
    productUnderstanding.authenticityConfidence * 0.46 +
    (realityTrust?.realityScore ?? 72) * 0.38 +
    (100 - listingIdentity.listingRisk01 * 100) * 0.16;

  return {
    canonicalProductId,
    identityFingerprint,
    productLineage,
    familyClusterId,
    identityConfidence: Math.round(idConf01 * 100),
    merchantConfidence,
    authenticityConfidence: Math.round(clamp(authBlend, 0, 100)),
  };
}
