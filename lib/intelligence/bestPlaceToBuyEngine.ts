/**
 * Phase 38 — Best Place To Buy Engine.
 * Every product gets a concrete purchase destination.
 */

import type { GlobalAlternatives } from "@/lib/intelligence/globalAlternativeEngine";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";
import type { MerchantTrustSignal } from "@/lib/intelligence/merchantTrustEngineV2";
import type { QuantProduct } from "@/lib/shoppingScore";

export type BestPlaceToBuy = {
  version: 1;
  merchant: string;
  price: number;
  link: string;
  savings: number;
  savingsPct: number;
  trustScore: number;
  shipping: string;
  stock: string;
  advantage: string;
  isCurrentListing: boolean;
};

/** Resolve best place to buy for a product listing. */
export function buildBestPlaceToBuy(args: {
  product: QuantProduct;
  globalPrice: GlobalPriceIntelligence;
  alternatives: GlobalAlternatives;
  merchantTrust: MerchantTrustSignal;
}): BestPlaceToBuy {
  const { product, globalPrice, alternatives, merchantTrust } = args;

  const cheaper = alternatives.bestSameProductCheaper;
  const destination = cheaper ?? {
    link: product.link,
    store: product.store,
    price: product.price,
    title: product.title,
  };

  const savings = Math.max(0, globalPrice.medianMarketPrice - destination.price);
  const savingsPct =
    globalPrice.medianMarketPrice > 0
      ? Math.round((savings / globalPrice.medianMarketPrice) * 100)
      : 0;

  const shipping = /free delivery|free shipping/i.test(`${product.shipping ?? ""}`)
    ? "Free delivery available"
    : product.shipping?.trim() || "Standard shipping";

  const stock = /in stock|available|ships today|ready/i.test(`${product.availability ?? ""}`)
    ? "In stock"
    : product.availability?.trim() || "Check availability";

  let advantage = "Best trusted checkout path for this product in the current search universe.";
  if (cheaper && cheaper.link !== product.link) {
    advantage = `Buy at ${cheaper.store} — same product cheaper by €${Math.round(savings)} vs this listing.`;
  } else if (globalPrice.priceLabel === "BEST PRICE FOUND") {
    advantage = "Market sample lowest observed across listings in this search sample.";
  } else if (merchantTrust.trustScore >= 75) {
    advantage = "Seller trust signal with favorable fulfillment and return policy cues.";
  }

  return {
    version: 1,
    merchant: destination.store,
    price: destination.price,
    link: destination.link,
    savings: Math.round(savings),
    savingsPct,
    trustScore: merchantTrust.trustScore,
    shipping,
    stock,
    advantage,
    isCurrentListing: destination.link === product.link,
  };
}
