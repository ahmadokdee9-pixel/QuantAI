import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";
import { getMarketplaceSellerRiskTier } from "@/lib/retailTrust";
import {
  isShadyGenericMarketplaceRow,
  listingSignalsRefurbished,
  userQuerySeeksUsedOrRefurb,
} from "@/lib/commerce/listingQuality";

/**
 * Post-fetch tray hygiene: drops obvious marketplace noise and irrelevant refurb rows
 * before scoring. Rolls back if the filter would gut the tray (keeps UX stable).
 */
export function filterTrayNoise(products: QuantProduct[], query: string): QuantProduct[] {
  if (products.length <= 1) return products;
  const allowRefurb = userQuerySeeksUsedOrRefurb(query);
  const next: QuantProduct[] = [];

  for (const p of products) {
    if (isShadyGenericMarketplaceRow(p)) continue;

    if (!allowRefurb && listingSignalsRefurbished(p)) {
      const trust = getStoreTrustScore(p.store);
      const rev = p.reviewsCount ?? 0;
      const mp = getMarketplaceSellerRiskTier(p.store, p.title);
      if (trust < 80 || rev < 16 || mp === "high") continue;
    }

    next.push(p);
  }

  if (next.length === 0) return products;
  if (next.length < Math.min(4, products.length)) return products;
  return next;
}
