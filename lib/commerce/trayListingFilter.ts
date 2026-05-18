import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";
import { getMarketplaceSellerRiskTier } from "@/lib/retailTrust";
import {
  isShadyGenericMarketplaceRow,
  listingSignalsRefurbished,
  userQuerySeeksUsedOrRefurb,
} from "@/lib/commerce/listingQuality";
import { hardCategoryMismatch } from "@/lib/commerce/queryCategoryGuard";
import { assessUniversalListingIdentity } from "@/lib/intelligence/universalListingIdentity";

export { hardCategoryMismatch } from "@/lib/commerce/queryCategoryGuard";

/**
 * Post-fetch tray hygiene: drops obvious marketplace noise and irrelevant refurb rows
 * before scoring. Rolls back if the filter would gut the tray (keeps UX stable).
 */
export function filterTrayNoise(products: QuantProduct[], query: string): QuantProduct[] {
  if (products.length <= 1) return products;
  const allowRefurb = userQuerySeeksUsedOrRefurb(query);
  const queryAllowsAccessory = /\b(case|cover|hoesje|charger|cable|adapter|strap|protector|screenprotector)\b/i.test(
    query
  );
  const next: QuantProduct[] = [];

  for (const p of products) {
    const marketValidated = p.qiIdentityGate?.identityGatePassed === true;
    if (!marketValidated && hardCategoryMismatch(query, p.title)) continue;
    if (isShadyGenericMarketplaceRow(p)) continue;

    const id = assessUniversalListingIdentity(p, query);
    if (!marketValidated && id.listingRisk01 >= 0.82) continue;
    if (!marketValidated && !queryAllowsAccessory && id.flags.includes("accessory_lane") && id.accessoryLikelihood01 >= 0.48) continue;
    if (!marketValidated && !queryAllowsAccessory && id.semanticMismatchPenalty01 >= 0.56) continue;
    if (!marketValidated && !queryAllowsAccessory && id.contaminationRisk01 >= 0.74) continue;
    if (!marketValidated && id.contaminant01 >= 0.54 && id.flags.includes("query_contamination")) continue;

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
