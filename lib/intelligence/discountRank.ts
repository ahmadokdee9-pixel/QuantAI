import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore } from "@/lib/shoppingScore";
import { buildDealIntelByLink } from "@/lib/intelligence/dealIntelligenceEngine";
import { parseCommerceSearchIntents } from "@/lib/intelligence/searchIntentV2";
import { queryListingRelevance01, reviewQuality01 } from "@/lib/intelligence/queryRelevance";

/** Prioritize trusted real discounts, then value/trust — discount never wins alone (tray-only). */
export function sortByVerifiedDealRank(list: QuantProduct[], query?: string): QuantProduct[] {
  if (list.length <= 1) return [...list];
  const intel = buildDealIntelByLink(list, query?.trim() ? parseCommerceSearchIntents(query) : undefined);
  const q = query?.trim() ?? "";
  const maxReviews = Math.max(0, ...list.map((p) => p.reviewsCount ?? 0));
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
      const fair = row?.fairMarketEstimate ?? 0;
      const trayMed =
        fair > 0 && p.price > 0 ? Math.min(8, Math.max(-6, ((fair - p.price) / fair) * 22)) : 0;
      const relLift = q ? (queryListingRelevance01(q, p) - 0.5) * 12 : 0;
      const revLift = (reviewQuality01(p, maxReviews) - 0.5) * 9;
      const del = (p.qiSignals?.delivery ?? 50) / 100;
      const delLift = (del - 0.5) * 5;
      return (
        discLift +
        (row?.retailerAdjustedDealScore ?? 0) * 0.32 +
        getFinalComposite(p, list) * 0.22 +
        getStoreTrustScore(p.store) * 0.17 -
        sus * 0.15 -
        fakePen(row) +
        trayMed +
        relLift +
        revLift +
        delLift
      );
    };
    const pa = score(a, ia);
    const pb = score(b, ib);
    if (pb !== pa) return pb - pa;
    return getFinalComposite(b, list) - getFinalComposite(a, list);
  });
}
