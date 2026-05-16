/**
 * Real-time product family pricing — trusted cheapest / premium / spread.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";

const TRUST_OK = 66;
const TRUST_PREMIUM = 72;

export type FamilyListingPrice = {
  link: string;
  store: string;
  price: number;
  trust: number;
};

export type FamilyPriceMap = {
  listings: FamilyListingPrice[];
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  spreadPct: number;
  cheapestTrusted: FamilyListingPrice | null;
  premiumTrusted: FamilyListingPrice | null;
  overpricedLinks: string[];
};

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export function buildFamilyPriceMap(members: QuantProduct[]): FamilyPriceMap {
  const listings: FamilyListingPrice[] = [];
  for (const p of members) {
    if (p.price <= 0) continue;
    listings.push({
      link: p.link,
      store: p.store,
      price: p.price,
      trust: getStoreTrustScore(p.store),
    });
  }
  const prices = listings.map((x) => x.price);
  const med = median(prices);
  const minP = prices.length ? Math.min(...prices) : 0;
  const maxP = prices.length ? Math.max(...prices) : 0;
  const spreadPct = med > 0 ? Math.round(((maxP - minP) / med) * 100) : 0;

  const trusted = listings.filter((x) => x.trust >= TRUST_OK);
  const cheapestTrusted =
    trusted.length > 0 ? trusted.reduce((a, b) => (a.price <= b.price ? a : b)) : null;

  const premiumPool = listings.filter((x) => x.trust >= TRUST_PREMIUM);
  let premiumTrusted: FamilyListingPrice | null = null;
  if (premiumPool.length > 0) {
    premiumTrusted = premiumPool.reduce((a, b) => (b.trust !== a.trust ? (b.trust > a.trust ? b : a) : b.price > a.price ? b : a));
  }

  const overpricedLinks: string[] = [];
  for (const x of listings) {
    if (med > 0 && x.price > med * 1.18 && x.trust < 68) overpricedLinks.push(x.link);
  }

  return {
    listings,
    medianPrice: med,
    minPrice: minP,
    maxPrice: maxP,
    spreadPct,
    cheapestTrusted,
    premiumTrusted,
    overpricedLinks,
  };
}
