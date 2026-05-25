/**
 * Diversity protection — merchant spread for recommendation influence.
 */

import type { QuantProduct } from "@/lib/shoppingScore";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function computeMerchantDiversityScore(products: QuantProduct[]): number {
  const stores = new Set(products.map((p) => p.store.trim().toLowerCase()));
  return round4(Math.min(1, stores.size / Math.max(1, products.length)));
}

export function isDiversityProtected(diversity01: number, min = 0.22): boolean {
  return diversity01 >= min;
}
