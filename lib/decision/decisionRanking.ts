/**
 * P5.6 — Decision ranking helpers (purchase quality emphasis).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

export function scorePurchaseQuality(product: QuantProduct, index: number, total: number): number {
  const base = (total - index) * 10;
  const trust = getStoreTrustScore(product.store) / 100;
  const rating = typeof product.rating === "number" ? product.rating / 5 : 0.8;
  return Math.round((base + trust * 2 + rating) * 1000) / 1000;
}

export function computeFirstResultQualityBoost(index: number, boost: number): number {
  return index === 0 ? boost : 0;
}
