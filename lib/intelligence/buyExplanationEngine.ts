/**
 * Phase 38 — Buy Explanation Engine.
 * Every BUY READY answers why buy/now/seller/price/alternatives/wait.
 */

import type { BestDealFoundAssessment } from "@/lib/intelligence/bestDealFoundEngine";
import type { BestPlaceToBuy } from "@/lib/intelligence/bestPlaceToBuyEngine";
import type { GlobalAlternatives } from "@/lib/intelligence/globalAlternativeEngine";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";
import type { MerchantTrustSignal } from "@/lib/intelligence/merchantTrustEngineV2";
import type { ShopperIntentProfile } from "@/lib/intelligence/shopperIntentModeEngine";
import type { WaitPrediction } from "@/lib/intelligence/waitPredictionEngine";

export type BuyExplanation = {
  version: 1;
  whyBuy: string;
  whyNow: string;
  whyThisSeller: string;
  whyThisPrice: string;
  whyNotAlternatives: string;
  whyNotWait: string;
  primaryLine: string;
  analystSummary: string;
};

function clip(text: string, max = 220): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function seed(link: string): number {
  let h = 0;
  for (const ch of link) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 4;
}

/** Build comprehensive buy explanation for BUY READY / BEST DEAL listings. */
export function buildBuyExplanation(args: {
  productTitle: string;
  link: string;
  bestPlace: BestPlaceToBuy;
  globalPrice: GlobalPriceIntelligence;
  merchantTrust: MerchantTrustSignal;
  alternatives: GlobalAlternatives;
  waitPrediction: WaitPrediction;
  bestDeal: BestDealFoundAssessment;
  intent: ShopperIntentProfile;
  isBestDealFound: boolean;
}): BuyExplanation {
  const {
    productTitle,
    link,
    bestPlace,
    globalPrice,
    merchantTrust,
    alternatives,
    waitPrediction,
    bestDeal,
    intent,
    isBestDealFound,
  } = args;

  const shortTitle = productTitle.split(" ").slice(0, 5).join(" ");
  const competitor = alternatives.bestSameProductCheaper ?? alternatives.bestValueAlternative;
  const s = seed(link);

  const whyThisPrice = clip(
    globalPrice.priceLabel === "BEST PRICE FOUND"
      ? `€${bestPlace.price} is the best price found — ${globalPrice.priceAdvantagePct}% below market median €${globalPrice.medianMarketPrice}.`
      : `€${bestPlace.price} offers ${globalPrice.priceAdvantagePct > 0 ? `${globalPrice.priceAdvantagePct}% below median` : "fair market pricing"} for a ${intent.primaryMode.toLowerCase()} search.`
  );

  const whyThisSeller = clip(
    `${bestPlace.merchant}: ${merchantTrust.trustReasoning} ${bestPlace.shipping}. ${bestPlace.stock}.`
  );

  const whyNotAlternatives = clip(
    competitor && competitor.link !== link
      ? `${competitor.store} has a comparable offer at €${competitor.price}, but ${bestPlace.advantage}`
      : "No stronger same-product alternative beats this checkout path in the scanned universe."
  );

  const whyNotWait = clip(
    waitPrediction.waitValid
      ? `Waiting could save ~€${waitPrediction.expectedSavings}, but stock risk is ${waitPrediction.stockLossRisk} and current value is already strong.`
      : "Waiting is not advantageous — fair price and trusted seller support buying now."
  );

  const whyBuy = clip(
    isBestDealFound
      ? `Buy ${shortTitle} because this is the best deal found — verified savings and trusted merchant.`
      : `Buy ${shortTitle} because value, quality, and seller trust align for a ${intent.primaryMode.toLowerCase()}.`
  );

  const whyNow = clip(
    [
      `Buy now at ${bestPlace.merchant} — ${bestDeal.reasoning}`,
      globalPrice.priceAdvantagePct >= 5 ? "Price already beats market average." : "Market pricing is fair today.",
      merchantTrust.reputationTier === "excellent" ? "Seller trust is excellent." : "",
    ]
      .filter(Boolean)
      .join(" ")
  );

  const openers = [
    `Best place to buy: ${bestPlace.merchant} at €${bestPlace.price}.`,
    `Checkout-ready at ${bestPlace.merchant} — €${bestPlace.price}.`,
    `Strongest buy destination: ${bestPlace.merchant}.`,
    `Buy here: ${bestPlace.merchant} for €${bestPlace.price}.`,
  ];

  const primaryLine = clip(
    isBestDealFound
      ? `Best deal found — buy ${shortTitle} at ${bestPlace.merchant} for €${bestPlace.price}. ${bestDeal.reasoning}`
      : `${openers[s]!} ${whyThisPrice} ${whyNotWait}`
  );

  return {
    version: 1,
    whyBuy,
    whyNow,
    whyThisSeller,
    whyThisPrice,
    whyNotAlternatives,
    whyNotWait,
    primaryLine,
    analystSummary: clip([primaryLine, whyThisSeller, whyNotAlternatives].join(" ")),
  };
}

export function buyExplanationIsSpecific(text: string): boolean {
  const blob = text.toLowerCase();
  return /\b(€|price|seller|merchant|buy|wait|alternative|trust|savings|market)\b/.test(blob);
}
