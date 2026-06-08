/**
 * Phase 37 — Global Alternative Engine.
 * Surfaces same-product cheaper, upgrade, value, and discount alternatives.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { UnifiedCardInsight } from "@/lib/intelligence/unifiedMarketMatching";
import { findEquivalentMatches } from "@/lib/intelligence/equivalentProductMatchingEngine";
import {
  classifyIdentityRelation,
  resolveGlobalProductIdentity,
  type GlobalIdentityClass,
} from "@/lib/intelligence/globalProductIdentityEngine";

export type GlobalAlternativeRef = {
  link: string;
  title: string;
  store: string;
  price: number;
  reason: string;
  identityClass: GlobalIdentityClass;
};

export type GlobalAlternatives = {
  version: 1;
  bestSameProductCheaper: GlobalAlternativeRef | null;
  bestValueAlternative: GlobalAlternativeRef | null;
  bestUpgradeAlternative: GlobalAlternativeRef | null;
  bestDiscountAlternative: GlobalAlternativeRef | null;
};

function toRef(
  peer: QuantProduct,
  reason: string,
  identityClass: GlobalIdentityClass
): GlobalAlternativeRef {
  return {
    link: peer.link,
    title: peer.title,
    store: peer.store,
    price: peer.price,
    reason,
    identityClass,
  };
}

/** Find strongest global alternatives for one listing inside tray universe. */
export function buildGlobalAlternatives(args: {
  product: QuantProduct;
  tray: QuantProduct[];
  searchQuery: string;
  marketInsight?: UnifiedCardInsight | null;
  trayMedianQuality?: number;
}): GlobalAlternatives {
  const { product, tray, searchQuery, marketInsight, trayMedianQuality = 50 } = args;
  const anchorIdentity = resolveGlobalProductIdentity(product, searchQuery, trayMedianQuality);
  const equivalent = findEquivalentMatches(product, tray, searchQuery);

  let bestSameProductCheaper: GlobalAlternativeRef | null = null;
  let bestValueAlternative: GlobalAlternativeRef | null = null;
  let bestUpgradeAlternative: GlobalAlternativeRef | null = null;
  let bestDiscountAlternative: GlobalAlternativeRef | null = null;

  if (marketInsight?.sameItemCheaper) {
    const peer = tray.find((p) => p.link === marketInsight.sameItemCheaper!.link);
    if (peer) {
      bestSameProductCheaper = toRef(peer, "Same product listed cheaper at another merchant.", "SAME PRODUCT");
    }
  }

  if (!bestSameProductCheaper && equivalent.bestSameProductCheaper) {
    const peer = tray.find((p) => p.link === equivalent.bestSameProductCheaper!.link);
    if (peer) {
      bestSameProductCheaper = toRef(peer, "Same model/variant available cheaper in this tray.", "SAME PRODUCT");
    }
  }

  for (const peer of tray) {
    if (peer.link === product.link) continue;
    const relation = classifyIdentityRelation(
      anchorIdentity,
      resolveGlobalProductIdentity(peer, searchQuery, trayMedianQuality),
      product,
      peer
    );
    if (relation === "UNRELATED") continue;

    if (
      relation === "CHEAPER ALTERNATIVE" &&
      (!bestSameProductCheaper || peer.price < bestSameProductCheaper.price)
    ) {
      bestSameProductCheaper = toRef(peer, "Same intent product at lower price.", relation);
    }

    if (
      (relation === "BETTER VALUE PRODUCT" || relation === "SIMILAR PRODUCT") &&
      peer.price <= product.price * 1.05 &&
      (peer.rating as number) >= (product.rating as number) - 0.2
    ) {
      if (!bestValueAlternative || peer.price < bestValueAlternative.price) {
        bestValueAlternative = toRef(peer, "Better value alternative at similar price.", relation);
      }
    }

    if (
      relation === "SUPERIOR PRODUCT" &&
      peer.price <= product.price * 1.15 &&
      (peer.rating as number) > (product.rating as number)
    ) {
      if (!bestUpgradeAlternative || (peer.rating as number) > (product.rating as number)) {
        bestUpgradeAlternative = toRef(peer, "Stronger product for close price.", relation);
      }
    }

    const disc =
      peer.oldPrice != null && peer.oldPrice > peer.price
        ? Math.round(((peer.oldPrice - peer.price) / peer.oldPrice) * 100)
        : 0;
    if (disc >= 15 && peer.price < product.price * 1.1) {
      if (!bestDiscountAlternative || disc > (bestDiscountAlternative.price < peer.price ? 0 : disc)) {
        bestDiscountAlternative = toRef(peer, `Stronger visible discount (${disc}%) in tray.`, relation);
      }
    }
  }

  if (!bestValueAlternative && marketInsight?.betterValueAlternative) {
    const peer = tray.find((p) => p.link === marketInsight.betterValueAlternative!.link);
    if (peer) bestValueAlternative = toRef(peer, "Better value alternative in same product family.", "BETTER VALUE PRODUCT");
  }

  if (!bestUpgradeAlternative && marketInsight?.premiumUpgrade) {
    const peer = tray.find((p) => p.link === marketInsight.premiumUpgrade!.link);
    if (peer) bestUpgradeAlternative = toRef(peer, "Premium upgrade path in same family.", "SUPERIOR PRODUCT");
  }

  return {
    version: 1,
    bestSameProductCheaper,
    bestValueAlternative,
    bestUpgradeAlternative,
    bestDiscountAlternative,
  };
}
