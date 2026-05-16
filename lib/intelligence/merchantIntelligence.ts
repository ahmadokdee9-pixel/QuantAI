/**
 * QuantAI Merchant Intelligence vNext — merchant-native routing quality + confidence priors.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { getMarketplaceSellerRiskTier, getStoreTrustScore } from "@/lib/retailTrust";
import type { QiListingIdentity } from "@/lib/intelligence/listingIdentityTypes";
import { normalizeQiListingIdentity } from "@/lib/intelligence/normalizeIntelligenceSignals";

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

export type MerchantRouteQuality01 = number;

/** Higher when outbound path is store-native (direct product or merchant search), lower on Google shells. */
export function merchantRouteQuality01(kind: QuantProduct["outboundRouteKind"]): number {
  switch (kind) {
    case "direct_merchant":
      return 1;
    case "merchant_search":
      return 0.74;
    case "google_interstitial":
      return 0.36;
    default:
      return 0.34;
  }
}

/** Official / elite storefront echo from naming (substring heuristic). */
export function merchantOfficialEcho01(store: string): number {
  const s = store.toLowerCase();
  if (
    /\b(official|store|brand shop|apple|samsung|nike|adidas|sony|microsoft|dyson|philips)\b/i.test(s) &&
    !/\b(marketplace|third)\b/i.test(s)
  ) {
    return 0.92;
  }
  if (/\b(coolblue|bol\.com|mediamarkt|amazon|zalando|ikea|douglas|notino)\b/i.test(s)) return 0.88;
  return 0.52;
}

/** Boost when outbound hostname matches known first-party / flagship storefront patterns. */
export function merchantFirstPartyUrlBoost01(product: QuantProduct): number {
  const raw = (product.offerOutboundUrl || product.link || "").trim();
  if (!raw.startsWith("http")) return 0;
  try {
    const host = new URL(raw).hostname.replace(/^www\./i, "").toLowerCase();
    if (/(\.|^)(apple|samsung|nike|adidas|microsoft|dyson|philips)\.com$/i.test(host)) return 0.14;
    if (/(coolblue\.(nl|be|de)|bol\.com|mediamarkt\.|ikea\.com|zalando\.)/i.test(host)) return 0.09;
  } catch {
    return 0;
  }
  return 0;
}

/**
 * Single 0–1 confidence meter for ranking / consensus weighting — not legal proof.
 */
export function computeMerchantConfidence01(
  product: QuantProduct,
  listingIdentity?: QiListingIdentity | null
): number {
  const trust = getStoreTrustScore(product.store) / 100;
  const route = merchantRouteQuality01(product.outboundRouteKind);
  const mp = getMarketplaceSellerRiskTier(product.store, product.title);
  const mpPen = mp === "high" ? 0.42 : mp === "medium" ? 0.15 : 0;
  const official = merchantOfficialEcho01(product.store);
  let conf =
    trust * 0.36 +
    route * 0.26 +
    official * 0.17 +
    (1 - mpPen) * 0.15 +
    merchantFirstPartyUrlBoost01(product);

  if (listingIdentity) {
    const id = normalizeQiListingIdentity(listingIdentity);
    conf *= 1 - id.listingRisk01 * 0.28;
    conf *= 1 - id.contaminant01 * 0.12;
    conf *= 1 - id.contaminationRisk01 * 0.16;
    conf *= 1 - id.semanticMismatchPenalty01 * 0.12;
  }

  return clamp01(conf);
}

export function merchantConfidenceRankNudge(conf01: number): number {
  const c = clamp01(conf01);
  return Math.round((c - 0.52) * 8);
}
