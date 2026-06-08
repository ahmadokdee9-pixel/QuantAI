/**
 * Phase 41 — Billion-Dollar Discount Intelligence.
 * Internal discount/price labels for reasoning and verdict gates.
 */

import type { DiscountIntelligenceV2 } from "@/lib/intelligence/discountIntelligenceV2Engine";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";
import type { ProductIdentityMatchV2 } from "@/lib/intelligence/productIdentityMatchingV2Engine";
import type { RealDiscountValidationV3 } from "@/lib/intelligence/realDiscountValidationV3Engine";
import type { UniversalOfferGraph } from "@/lib/intelligence/universalOfferGraphEngine";

export type BillionDollarDiscountLabel =
  | "BEST DEAL FOUND"
  | "SAME PRODUCT CHEAPER"
  | "BETTER VALUE ALTERNATIVE"
  | "REAL DISCOUNT"
  | "FAKE DISCOUNT RISK"
  | "OVERPRICED"
  | "FAIR PRICE"
  | "STRONG BUY";

export type BillionDollarDiscountIntelligence = {
  version: 1;
  primaryLabel: BillionDollarDiscountLabel;
  labels: BillionDollarDiscountLabel[];
  reasoning: string;
  outletOpportunity: boolean;
  refurbOpportunity: boolean;
  historicalHint: string | null;
};

/** Build comprehensive discount and price intelligence labels. */
export function buildBillionDollarDiscountIntelligence(args: {
  discountV2: DiscountIntelligenceV2;
  globalPrice: GlobalPriceIntelligence;
  realDiscount: RealDiscountValidationV3;
  identity: ProductIdentityMatchV2;
  offerGraph?: UniversalOfferGraph;
  productTitle: string;
  store: string;
}): BillionDollarDiscountIntelligence {
  const { discountV2, globalPrice, realDiscount, identity, offerGraph, productTitle, store } = args;
  const labels: BillionDollarDiscountLabel[] = [];

  const blob = `${productTitle} ${store}`.toLowerCase();
  const outletOpportunity = /outlet|clearance|liquidation|overstock/i.test(blob);
  const refurbOpportunity = /refurb|renewed|certified pre-owned|open box|open-box/i.test(blob);

  if (discountV2.discountLabel === "BEST DEAL FOUND" || globalPrice.priceLabel === "BEST PRICE FOUND") {
    labels.push("BEST DEAL FOUND");
  }
  if (identity.sameProductCheaper) labels.push("SAME PRODUCT CHEAPER");
  if (identity.equivalentCheaper) labels.push("BETTER VALUE ALTERNATIVE");
  if (realDiscount.realDiscountScore >= 58 || discountV2.realDiscount) labels.push("REAL DISCOUNT");
  if (realDiscount.fakeDiscountScoreHigh || discountV2.fakeDiscount) labels.push("FAKE DISCOUNT RISK");
  if (globalPrice.priceLabel === "OVERPRICED" || globalPrice.priceAdvantagePct < -8) labels.push("OVERPRICED");
  if (globalPrice.priceFairnessScore >= 52 && !realDiscount.fakeDiscountScoreHigh) labels.push("FAIR PRICE");
  if (
    labels.includes("BEST DEAL FOUND") ||
    (labels.includes("REAL DISCOUNT") && globalPrice.priceAdvantagePct >= 6)
  ) {
    labels.push("STRONG BUY");
  }

  if (!labels.length) labels.push("FAIR PRICE");

  const primaryLabel = labels.includes("BEST DEAL FOUND")
    ? "BEST DEAL FOUND"
    : labels.includes("SAME PRODUCT CHEAPER")
      ? "SAME PRODUCT CHEAPER"
      : labels.includes("FAKE DISCOUNT RISK")
        ? "FAKE DISCOUNT RISK"
        : labels.includes("OVERPRICED")
          ? "OVERPRICED"
          : labels.includes("REAL DISCOUNT")
            ? "REAL DISCOUNT"
            : "FAIR PRICE";

  const parts: string[] = [];
  if (labels.includes("REAL DISCOUNT")) parts.push(realDiscount.reasoning);
  if (identity.sameProductCheaper) parts.push(identity.reasoning);
  if (outletOpportunity) parts.push("Outlet/clearance channel detected.");
  if (refurbOpportunity) parts.push("Refurb/open-box opportunity — verify condition and warranty.");
  if (globalPrice.priceAdvantagePct > 0) {
    parts.push(`Price ${globalPrice.priceAdvantagePct}% below tray median (€${globalPrice.medianMarketPrice}).`);
  }
  if (offerGraph && offerGraph.searchDepthScore >= 60) {
    parts.push(`Market scan depth ${offerGraph.searchDepthScore}/100 across ${offerGraph.merchantCoverage.length} channel types.`);
  }

  return {
    version: 1,
    primaryLabel,
    labels: [...new Set(labels)],
    reasoning: parts.join(" ") || discountV2.discountReasoning,
    outletOpportunity,
    refurbOpportunity,
    historicalHint: discountV2.historicalDiscount ? "Historical discount signal in price trail." : null,
  };
}
