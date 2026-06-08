/**
 * Phase 39 — Best Place To Buy Engine V2.
 */

import type { BestPlaceToBuy } from "@/lib/intelligence/bestPlaceToBuyEngine";
import type { MerchantTrustIntelligence } from "@/lib/intelligence/merchantTrustIntelligenceEngine";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";

export type BestPlaceToBuyV2 = Omit<BestPlaceToBuy, "version"> & {
  version: 2;
  whyMerchant: string;
  priceAdvantageLine: string;
  trustAdvantageLine: string;
  deliveryAdvantageLine: string;
  warrantyAdvantageLine: string;
  destinationSummary: string;
};

/** Enrich best place to buy with explicit merchant advantages. */
export function buildBestPlaceToBuyV2(args: {
  base: BestPlaceToBuy;
  globalPrice: GlobalPriceIntelligence;
  merchantTrust: MerchantTrustIntelligence;
  productTitle: string;
}): BestPlaceToBuyV2 {
  const { base, globalPrice, merchantTrust, productTitle } = args;
  const shortTitle = productTitle.split(" ").slice(0, 4).join(" ");

  const priceAdvantageLine =
    globalPrice.priceAdvantagePct > 0
      ? `Price advantage: ${globalPrice.priceAdvantagePct}% below tray median (€${globalPrice.medianMarketPrice}).`
      : `Price position: fair market pricing at €${base.price}.`;

  const trustAdvantageLine =
    merchantTrust.reputationTier === "excellent" || merchantTrust.reputationTier === "good"
      ? `Trust advantage: ${base.merchant} scores ${merchantTrust.trustScore}/100 with ${merchantTrust.reputationTier} seller reputation.`
      : `Trust check: verify ${base.merchant} returns policy before buying ${shortTitle}.`;

  const deliveryAdvantageLine = base.shipping.includes("Free")
    ? `Delivery advantage: ${base.shipping.toLowerCase()}.`
    : `Delivery: ${base.shipping}.`;

  const warrantyAdvantageLine =
    merchantTrust.returnPolicyScore >= 75
      ? "Warranty/returns advantage: strong return policy signals for this merchant."
      : "Warranty/returns: confirm warranty and return window before checkout.";

  const whyMerchant = base.isCurrentListing
    ? `${base.merchant} is the best checkout path for ${shortTitle} in this search universe.`
    : `Buy ${shortTitle} at ${base.merchant} — same product cheaper by €${base.savings} vs this listing.`;

  return {
    ...base,
    version: 2,
    whyMerchant,
    priceAdvantageLine,
    trustAdvantageLine,
    deliveryAdvantageLine,
    warrantyAdvantageLine,
    destinationSummary: [whyMerchant, priceAdvantageLine, trustAdvantageLine].join(" "),
  };
}
