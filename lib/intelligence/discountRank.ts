import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore } from "@/lib/shoppingScore";
import { buildDealIntelByLink } from "@/lib/intelligence/dealIntelligenceEngine";

/** Prioritize verified discounts, trust, and composite — tray-only (no new APIs). */
export function sortByVerifiedDealRank(list: QuantProduct[]): QuantProduct[] {
  if (list.length <= 1) return [...list];
  const intel = buildDealIntelByLink(list);
  return [...list].sort((a, b) => {
    const ia = intel.get(a.link);
    const ib = intel.get(b.link);
    const pa =
      (ia?.trustAdjustedDiscountScore ?? 0) * 0.42 +
      (ia?.retailerAdjustedDealScore ?? 0) * 0.28 +
      getFinalComposite(a, list) * 0.2 +
      getStoreTrustScore(a.store) * 0.1;
    const pb =
      (ib?.trustAdjustedDiscountScore ?? 0) * 0.42 +
      (ib?.retailerAdjustedDealScore ?? 0) * 0.28 +
      getFinalComposite(b, list) * 0.2 +
      getStoreTrustScore(b.store) * 0.1;
    if (pb !== pa) return pb - pa;
    return getFinalComposite(b, list) - getFinalComposite(a, list);
  });
}
