/**
 * Retailer reliability & marketplace integrity proxies (feed-only heuristics).
 */

import { scoreDeliverySpeed } from "@/lib/intelligence/deliveryScore";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";
import { getMarketplaceSellerRiskTier } from "@/lib/retailTrust";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export type TrustIntegrityProfile = {
  retailerReliability01: number;
  fulfillmentReliability01: number;
  returnConsistency01: number;
  deliveryStability01: number;
  marketplaceRisk01: number;
  sellerTransparency01: number;
  supportQualityProxy01: number;
  /** When true, chip policy blocks STRONG BUY / BUY-READY / BEST TRUSTED OPTION. */
  weakRetailer: boolean;
};

function returnConsistencyFromExtensions(p: QuantProduct): number {
  const blob = `${p.extensions.join(" ")} ${p.shipping ?? ""}`.toLowerCase();
  if (/free return|30[\s-]*day|money[-\s]?back|easy return|hassle[-\s]?free/i.test(blob)) return 0.82;
  if (/final sale|no return|non[-\s]?returnable|all sales final/i.test(blob)) return 0.28;
  return 0.55;
}

function sellerTransparency01(p: QuantProduct): number {
  const hasShip = Boolean(p.shipping?.trim());
  const hasAvail = Boolean(p.availability?.trim());
  const rev = p.reviewsCount ?? 0;
  const rev01 = clamp01(Math.log10(rev + 1) / 3.2);
  return clamp01((hasShip ? 0.28 : 0.08) + (hasAvail ? 0.22 : 0.06) + rev01 * 0.5);
}

function supportQualityProxy01(trust: number, marketplaceRisk01: number): number {
  return clamp01(trust / 100 * (1 - marketplaceRisk01 * 0.45) + 0.08);
}

export function computeTrustIntegrityProfile(p: QuantProduct): TrustIntegrityProfile {
  const trust = getStoreTrustScore(p.store);
  const tier = getMarketplaceSellerRiskTier(p.store, p.title);
  const marketplaceRisk01 = tier === "high" ? 0.78 : tier === "medium" ? 0.42 : 0.16;

  const deliveryStability01 = scoreDeliverySpeed(p.shipping);
  const fulfillmentReliability01 = clamp01(deliveryStability01 * 0.55 + (trust / 100) * 0.45);

  const returnConsistency01 = returnConsistencyFromExtensions(p);
  const transparency = sellerTransparency01(p);
  const support = supportQualityProxy01(trust, marketplaceRisk01);

  const retailerReliability01 = clamp01(
    trust / 100 * 0.34 +
      (1 - marketplaceRisk01) * 0.28 +
      fulfillmentReliability01 * 0.18 +
      returnConsistency01 * 0.12 +
      transparency * 0.08
  );

  const weakRetailer =
    retailerReliability01 < 0.56 ||
    trust < 56 ||
    marketplaceRisk01 >= 0.62 ||
    (trust < 62 && marketplaceRisk01 >= 0.45);

  return {
    retailerReliability01,
    fulfillmentReliability01,
    returnConsistency01,
    deliveryStability01,
    marketplaceRisk01,
    sellerTransparency01: transparency,
    supportQualityProxy01: support,
    weakRetailer,
  };
}
