/**
 * Phase 37 — Global Decision Reasoning Engine V2.
 * Unique buyer-psychology reasoning — answers "where should I buy right now?"
 */

import type { DiscountIntelligenceV2 } from "@/lib/intelligence/discountIntelligenceV2Engine";
import type { GlobalAlternatives } from "@/lib/intelligence/globalAlternativeEngine";
import type { GlobalBuyOpportunity } from "@/lib/intelligence/globalBuyOpportunityEngine";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";
import type { GlobalProductIdentity } from "@/lib/intelligence/globalProductIdentityEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { UniversalProductIntelligenceSnapshot } from "@/lib/ui/universalProductDecision";

export type GlobalDecisionReasoning = {
  primaryLine: string;
  whyBuy: string;
  whyWait: string;
  whyAvoid: string;
  whyThisSeller: string;
  whyThisPrice: string;
  whyNotCompetitor: string;
  analystSummary: string;
  commercePriorityLabel:
    | "LIKELY DEAL SIGNAL"
    | "CONFIDENCE-BASED BUY SIGNAL"
    | "BEST DEAL FOUND"
    | "BUY READY"
    | "COMPARE"
    | "WAIT"
    | "AVOID"
    | "INSUFFICIENT DATA";
};

const GENERIC_BANNED = [
  "blocked by rival",
  "does not win in the tray",
  "viable but blocked",
  "good option overall",
  "acceptable option",
  "this listing",
];

function clip(text: string, max = 200): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function topDimension(intelligence: UniversalProductIntelligenceSnapshot): string {
  return [...(intelligence.dimensions ?? [])].sort((a, b) => b.score - a.score)[0]?.label.toLowerCase() ?? "overall fit";
}

function uniqueSeed(link: string, store: string): number {
  let h = 0;
  for (const ch of `${link}:${store}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 5;
}

export function buildGlobalDecisionReasoning(args: {
  verdict: PrimaryVerdict;
  productTitle: string;
  store: string;
  price: number;
  link: string;
  intelligence: UniversalProductIntelligenceSnapshot;
  identity: GlobalProductIdentity;
  globalPrice: GlobalPriceIntelligence;
  discountV2: DiscountIntelligenceV2;
  alternatives: GlobalAlternatives;
  buyOpportunity: GlobalBuyOpportunity;
  commercePriorityLabel: GlobalDecisionReasoning["commercePriorityLabel"];
}): GlobalDecisionReasoning {
  const {
    verdict,
    productTitle,
    store,
    price,
    link,
    intelligence,
    identity,
    globalPrice,
    discountV2,
    alternatives,
    buyOpportunity,
    commercePriorityLabel,
  } = args;

  const strength = topDimension(intelligence);
  const seed = uniqueSeed(link, store);
  const competitor = alternatives.bestSameProductCheaper ?? alternatives.bestValueAlternative;
  const shortTitle = productTitle.split(" ").slice(0, 5).join(" ");

  const whyThisPrice = clip(
    globalPrice.priceLabel === "BEST PRICE FOUND"
      ? `€${price} is the best price found across ${globalPrice.medianMarketPrice > 0 ? `${globalPrice.priceAdvantagePct}% below median €${globalPrice.medianMarketPrice}` : "this search universe"}.`
      : globalPrice.priceAdvantagePct > 0
        ? `€${price} beats tray median €${globalPrice.medianMarketPrice} by ${globalPrice.priceAdvantagePct}% — ${globalPrice.priceLabel.toLowerCase().replace(/_/g, " ")}.`
        : `€${price} sits at ${globalPrice.pricePositionPct}% of the tray price range — ${globalPrice.priceLabel.toLowerCase().replace(/_/g, " ")}.`
  );

  const whyThisSeller = clip(
    (intelligence.merchantTrustScore ?? 50) >= 68
      ? `${store} scores well on trust for checkout, fulfillment, and post-purchase support.`
      : `${store} is usable but verify returns policy and delivery terms before buying ${shortTitle}.`
  );

  const whyNotCompetitor = clip(
    competitor
      ? competitor.link === link
        ? "No stronger same-product competitor undercuts this listing in the current search universe."
        : `${competitor.store} lists a comparable option at €${competitor.price} — ${competitor.reason}`
      : "No materially cheaper same-product offer found across merchants in this tray."
  );

  const whyBuy = clip(
    buyOpportunity.valueLedBuy
      ? `Buy now: ${shortTitle} at ${store} combines strong ${strength}, favorable market pricing, and no superior alternative at this price.`
      : buyOpportunity.buyNowEligible
        ? `Buy now because quality, seller trust, and market value align — discount is ${discountV2.realDiscount ? "supporting" : "not required"}.`
        : `Buy case is moderate — value exists but compare alternatives first.`
  );

  const whyWait = clip(buyOpportunity.waitReasoning);
  const whyAvoid = clip(buyOpportunity.avoidReasoning);

  let primaryLine = "";
  if (
    commercePriorityLabel === "LIKELY DEAL SIGNAL" ||
    commercePriorityLabel === "BEST DEAL FOUND" ||
    (verdict === "BUY READY" && buyOpportunity.bestDealFound)
  ) {
    primaryLine = clip(
      `Likely deal signal: buy ${shortTitle} at ${store} for €${price} — strongest price + value in this search sample. ${discountV2.discountReasoning}`
    );
  } else if (verdict === "BUY READY") {
    const openers = [
      `Buy ${shortTitle} at ${store} now —`,
      `Strongest purchase right now:`,
      `Best place to buy this now:`,
      `Checkout-ready pick:`,
      `Top buy opportunity in this tray:`,
    ];
    primaryLine = clip(
      `${openers[seed]!} €${price} with ${strength} lead, ${globalPrice.priceReasoning.split(".")[0]?.toLowerCase() ?? "fair market value"}, and trusted seller signals.`
    );
  } else if (verdict === "COMPARE") {
    primaryLine = clip(
      `Compare before buying — ${shortTitle} at ${store} (€${price}) is solid on ${strength}, but ${whyNotCompetitor.replace(/\.$/, "")}.`
    );
  } else if (verdict === "WAIT") {
    primaryLine = clip(`Do not buy yet at ${store} — ${whyWait}`);
  } else {
    primaryLine = clip(`Skip ${store}'s ${shortTitle} listing — ${whyAvoid}`);
  }

  const analystSummary = clip(
    [primaryLine, whyThisPrice, whyThisSeller, whyNotCompetitor, discountV2.discountReasoning].filter(Boolean).join(" ")
  );

  return {
    primaryLine,
    whyBuy,
    whyWait,
    whyAvoid,
    whyThisSeller,
    whyThisPrice,
    whyNotCompetitor,
    analystSummary,
    commercePriorityLabel,
  };
}

export function globalReasoningIsUnique(text: string): boolean {
  const blob = text.toLowerCase();
  return !GENERIC_BANNED.some((phrase) => blob.includes(phrase));
}

export function globalReasoningReferencesContext(text: string): boolean {
  const blob = text.toLowerCase();
  let hits = 0;
  if (/\b€|\$|price|discount|median|market|cheaper|deal|fair|overpriced/i.test(blob)) hits += 1;
  if (/\bquality|seller|merchant|store|trust|compet|alternative|buy|wait|avoid/i.test(blob)) hits += 1;
  if (/\b\d+%|\d+\/100|€\d+|\$\d+/.test(blob)) hits += 1;
  return hits >= 2;
}
