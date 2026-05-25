/**
 * Deterministic state restore — link-order baseline for rollback.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export function buildRestoreId(preLinks: string[]): string {
  return `rst_${fnv1aHex(preLinks.slice(0, 8).join("~"))}`;
}

export function restoreProductOrder(
  products: QuantProduct[],
  preLinks: string[]
): QuantProduct[] {
  const byLink = new Map(products.map((p) => [p.link, p]));
  const restored: QuantProduct[] = [];
  for (const link of preLinks) {
    const p = byLink.get(link);
    if (p) restored.push(p);
  }
  for (const p of products) {
    if (!preLinks.includes(p.link)) restored.push(p);
  }
  return restored.length ? restored : products;
}
