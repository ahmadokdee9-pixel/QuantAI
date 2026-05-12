import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore } from "@/lib/shoppingScore";
import { buildDealIntelByLink } from "@/lib/intelligence/dealIntelligenceEngine";

/** Prioritize trusted real discounts, then value/trust — discount never wins alone (tray-only). */
export function sortByVerifiedDealRank(list: QuantProduct[]): QuantProduct[] {
  if (list.length <= 1) return [...list];
  const intel = buildDealIntelByLink(list);
  return [...list].sort((a, b) => {
    const ia = intel.get(a.link);
    const ib = intel.get(b.link);
    const fakePen = (row: typeof ia) =>
      row?.fakeDiscountRisk === "high" ? 32 : row?.fakeDiscountRisk === "medium" ? 12 : 0;
    const score = (p: QuantProduct, row: typeof ia) => {
      const hasD = row?.hasDiscount ?? false;
      const tad = row?.trustAdjustedDiscountScore ?? 0;
      const discLift = hasD ? tad * 0.34 : tad * 0.08;
      const sus = row?.suspiciousDiscountRisk ?? 0;
      return (
        discLift +
        (row?.retailerAdjustedDealScore ?? 0) * 0.32 +
        getFinalComposite(p, list) * 0.24 +
        getStoreTrustScore(p.store) * 0.18 -
        sus * 0.14 -
        fakePen(row)
      );
    };
    const pa = score(a, ia);
    const pb = score(b, ib);
    if (pb !== pa) return pb - pa;
    return getFinalComposite(b, list) - getFinalComposite(a, list);
  });
}
