/**
 * QuantAI equivalent offers — cheaper / premium / better-value reads inside a family cluster.
 */

import type { FamilyPriceMap } from "@/lib/intelligence/marketPriceMap";
import type { FamilyMarketConsensus } from "@/lib/intelligence/marketConsensus";
import type { FairMarketRange } from "@/lib/intelligence/marketSpread";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";

export type CompactOfferRef = {
  link: string;
  store: string;
  price: number;
};

export type FamilyEquivalenceHints = {
  sameItemCheaper: CompactOfferRef | null;
  betterValueAlternative: CompactOfferRef | null;
  premiumUpgrade: CompactOfferRef | null;
  overpricedVsFair: boolean;
  fairMarketRangeLabel: string;
};

function findMember(members: QuantProduct[], link: string): QuantProduct | undefined {
  return members.find((x) => x.link === link);
}

export function computeFamilyEquivalenceHints(
  product: QuantProduct,
  members: QuantProduct[],
  priceMap: FamilyPriceMap,
  consensus: FamilyMarketConsensus,
  fair: FairMarketRange
): FamilyEquivalenceHints {
  const ct = priceMap.cheapestTrusted;
  const pt = priceMap.premiumTrusted;

  let sameItemCheaper: CompactOfferRef | null = null;
  if (ct && ct.link !== product.link && product.price > 0 && ct.price > 0 && product.price > ct.price * 1.02) {
    sameItemCheaper = { link: ct.link, store: ct.store, price: ct.price };
  }

  let betterValueAlternative: CompactOfferRef | null = null;
  const sv = consensus.strongestValueLink;
  if (sv && sv !== product.link) {
    const row = findMember(members, sv);
    if (row && row.price > 0) {
      const t = getStoreTrustScore(row.store);
      const cheaper = row.price <= product.price * 1.03;
      const betterTrust = t >= getStoreTrustScore(product.store) + 4;
      const r = ratingValue(row.rating);
      const rp = ratingValue(product.rating);
      if ((cheaper && t >= 66) || betterTrust || (r >= rp + 0.25 && t >= 64)) {
        betterValueAlternative = { link: row.link, store: row.store, price: row.price };
      }
    }
  }

  let premiumUpgrade: CompactOfferRef | null = null;
  if (pt && pt.link !== product.link && product.price > 0 && pt.price > product.price * 1.06) {
    if (pt.trust >= getStoreTrustScore(product.store) || pt.price > fair.mid * 1.05) {
      premiumUpgrade = { link: pt.link, store: pt.store, price: pt.price };
    }
  }

  const overpricedVsFair =
    fair.mid > 0 && product.price > 0 && product.price > fair.mid * 1.12 && getStoreTrustScore(product.store) < 74;

  const fairMarketRangeLabel =
    fair.mid > 0
      ? `Fair band in this match ~${Math.round(fair.low)}–${Math.round(fair.high)} (median ${Math.round(fair.mid)}).`
      : "Fair band unavailable — not enough priced peers in this cluster.";

  return {
    sameItemCheaper,
    betterValueAlternative,
    premiumUpgrade,
    overpricedVsFair,
    fairMarketRangeLabel,
  };
}
