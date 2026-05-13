import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";
import { getMarketplaceSellerRiskTier } from "@/lib/retailTrust";
import {
  isShadyGenericMarketplaceRow,
  listingSignalsRefurbished,
  userQuerySeeksUsedOrRefurb,
} from "@/lib/commerce/listingQuality";

/** Drop listings whose category clearly diverges from a specific query (e.g. sofa rows on a laptop search). */
export function hardCategoryMismatch(query: string, title: string): boolean {
  const q = query.toLowerCase();
  const t = title.toLowerCase();
  const furniture = /\b(sofa|couch|loveseat|sectional|futon|ottoman|rug|curtain|dining\s+table|coffee\s+table|bookshelf)\b/;
  const compute =
    /\b(laptop|notebook|ultrabook|macbook|thinkpad|chromebook|gpu|graphics\s+card|rtx|gtx|cpu|processor|monitor|oled\s+tv)\b/;
  const mobile = /\b(iphone|ipad|galaxy\s+s\d|pixel\s+\d|smartphone|airpods)\b/;
  const audioSmall = /\b(earbuds|earphones|headphones|wh-1000)\b/;

  if (compute.test(q) && furniture.test(t)) return true;
  if (mobile.test(q) && furniture.test(t)) return true;
  if (/\b(tv|television|qled|oled\s+tv)\b/.test(q) && /\b(laptop|macbook|gpu|earbuds)\b/.test(t)) return true;
  if (audioSmall.test(q) && furniture.test(t)) return true;
  return false;
}

/**
 * Post-fetch tray hygiene: drops obvious marketplace noise and irrelevant refurb rows
 * before scoring. Rolls back if the filter would gut the tray (keeps UX stable).
 */
export function filterTrayNoise(products: QuantProduct[], query: string): QuantProduct[] {
  if (products.length <= 1) return products;
  const allowRefurb = userQuerySeeksUsedOrRefurb(query);
  const next: QuantProduct[] = [];

  for (const p of products) {
    if (hardCategoryMismatch(query, p.title)) continue;
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
