/**
 * Phase 39 — Buyer Decision Intelligence.
 * Answers every purchase question with product-specific reasoning.
 */

import type { BestPlaceToBuyV2 } from "@/lib/intelligence/bestPlaceToBuyEngineV2";
import type { OpportunityPriorityV2 } from "@/lib/intelligence/opportunityPriorityEngineV2";
import type { RealDiscountValidationV3 } from "@/lib/intelligence/realDiscountValidationV3Engine";
import type { WaitExplanation } from "@/lib/intelligence/waitExplanationEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";

export type BuyerDecisionIntelligence = {
  version: 1;
  isGoodProduct: string;
  isGoodPrice: string;
  isBestSeller: string;
  shouldBuyNow: string;
  couldSaveLater: string;
  betterEquivalent: string;
  whereToBuy: string;
  verdictReason: string;
  analystBlock: string;
};

export function buildBuyerDecisionIntelligence(args: {
  productTitle: string;
  store: string;
  price: number;
  verdict: PrimaryVerdict;
  qualityScore: number;
  bestPlace: BestPlaceToBuyV2;
  opportunity: OpportunityPriorityV2;
  realDiscount: RealDiscountValidationV3;
  waitExplanation?: WaitExplanation;
  cheaperElsewhere?: string | null;
  commercePriorityLabel: string;
}): BuyerDecisionIntelligence {
  const {
    productTitle,
    store,
    price,
    verdict,
    qualityScore,
    bestPlace,
    opportunity,
    realDiscount,
    waitExplanation,
    cheaperElsewhere,
    commercePriorityLabel,
  } = args;

  const shortTitle = productTitle.split(" ").slice(0, 5).join(" ");

  const isGoodProduct =
    qualityScore >= 72
      ? `${shortTitle} scores well on quality (${qualityScore}/100) for this category search.`
      : `${shortTitle} is acceptable on quality but not a category leader.`;

  const isGoodPrice = realDiscount.realDiscountScore >= 55
    ? `Good price — ${realDiscount.reasoning}`
    : `Price is ${opportunity.priceAdvantageComponent >= 12 ? "strong" : "fair"} relative to scanned market.`;

  const isBestSeller = bestPlace.trustScore >= 68
    ? `${bestPlace.merchant} is the strongest seller path — ${bestPlace.trustAdvantageLine}`
    : `Seller trust is mixed — compare ${store} against ${bestPlace.merchant}.`;

  const shouldBuyNow =
    verdict === "BUY READY"
      ? `Yes — buy now at ${bestPlace.merchant} for €${bestPlace.price}. ${commercePriorityLabel}.`
      : verdict === "WAIT"
        ? `Not yet — ${waitExplanation?.formattedBlock ?? "wait evidence is weak."}`
        : verdict === "AVOID"
          ? "No — skip this listing and use the best alternative in tray."
          : "Compare first, then buy the strongest offer.";

  const couldSaveLater = waitExplanation?.evidenceBacked
    ? waitExplanation.formattedBlock
    : "Limited wait advantage — current pricing is already fair for safe checkout.";

  const betterEquivalent = cheaperElsewhere
    ? `Better equivalent may exist at ${cheaperElsewhere}.`
    : "No stronger equivalent beats this checkout path on price and trust today.";

  const whereToBuy = `Best place to buy: ${bestPlace.merchant} at €${bestPlace.price}. ${bestPlace.destinationSummary}`;

  const verdictReason =
    verdict === "BUY READY"
      ? `QuantAI chose ${commercePriorityLabel} because opportunity score ${opportunity.opportunityScore} combines price, quality, trust, and market position.`
      : `QuantAI chose ${verdict} because ${opportunity.headline}`;

  return {
    version: 1,
    isGoodProduct,
    isGoodPrice,
    isBestSeller,
    shouldBuyNow,
    couldSaveLater,
    betterEquivalent,
    whereToBuy,
    verdictReason,
    analystBlock: [isGoodProduct, isGoodPrice, whereToBuy, verdictReason].join(" "),
  };
}

export function buyerDecisionIsSpecific(text: string): boolean {
  return /\b(€|price|seller|merchant|buy|quality|trust|save|equivalent|best place)\b/i.test(text);
}
