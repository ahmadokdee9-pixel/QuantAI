/**
 * Suppress absurd marketplace listings from recommendation trays.
 */

import type { QuantProduct } from "@/lib/shoppingScore";

export type ListingOutlierKind = "outlier" | "corrupt" | "anomaly";

export function classifyListingOutlier(
  product: QuantProduct,
  peers: QuantProduct[]
): ListingOutlierKind | null {
  const price = product.price;
  if (!Number.isFinite(price) || price <= 0) return "corrupt";

  const peerPrices = peers
    .map((p) => p.price)
    .filter((p) => Number.isFinite(p) && p > 0)
    .sort((a, b) => a - b);

  if (peerPrices.length < 2) {
    if (product.qiCommerce?.priceAnomaly === "premium_outlier") return "outlier";
    if (product.qiCommerce?.priceAnomaly === "suspicious_low") return "anomaly";
    return null;
  }

  const mid = peerPrices[Math.floor(peerPrices.length / 2)] ?? peerPrices[0]!;

  if (product.qiCommerce?.priceAnomaly === "premium_outlier") return "outlier";
  if (product.qiCommerce?.priceAnomaly === "suspicious_low") return "anomaly";

  if (mid > 0 && price >= mid * 3.5) return "outlier";
  if (mid >= 80 && price >= mid * 2.2 && price >= 2500) return "anomaly";
  if (mid >= 40 && price < mid * 0.07) return "anomaly";

  return null;
}

/** Exclude outliers from ranked recommendation trays and verdict generation. */
export function filterRecommendationTray(products: QuantProduct[]): QuantProduct[] {
  if (products.length <= 1) return products;
  return products.filter((p) => classifyListingOutlier(p, products) === null);
}

export function outlierFlagLabel(kind: ListingOutlierKind): string {
  if (kind === "corrupt") return "Corrupt listing";
  if (kind === "anomaly") return "Data anomaly";
  return "Outlier";
}
