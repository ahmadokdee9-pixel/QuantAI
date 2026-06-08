/**
 * Phase 36 — Commerce Opportunity Reasoning.
 * Buyer-friendly explanations with discount and trust context — no repetitive phrasing.
 */

import type { DiscountOpportunityInsight } from "@/lib/intelligence/discountOpportunityEngine";
import type { EquivalentMatchResult } from "@/lib/intelligence/equivalentProductMatchingEngine";
import type { PersonalBuyerIdentity } from "@/lib/intelligence/personalBuyerIdentityEngine";
import type { PersonalTasteProfile } from "@/lib/intelligence/personalTasteIntelligenceEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { UniversalProductIntelligenceSnapshot } from "@/lib/ui/universalProductDecision";

export type CommerceOpportunityReasoning = {
  primaryLine: string;
  strongestReason: string;
  weakestReason: string;
  discountSituation: string;
  buyerIntentLine: string;
  trustLine: string;
  analystSummary: string;
  buyRecoveryNote?: string;
};

const BANNED_PHRASES = [
  "blocked by rival",
  "does not win in the tray",
  "viable but blocked",
  "loses despite decent specifications because rivals offer stronger performance",
];

function clip(text: string, max = 180): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function topStrength(intelligence: UniversalProductIntelligenceSnapshot): string {
  const dim = [...(intelligence.dimensions ?? [])].sort((a, b) => b.score - a.score)[0];
  return dim?.label.toLowerCase() ?? "overall fit";
}

function weakestDimension(intelligence: UniversalProductIntelligenceSnapshot): string {
  const dim = [...(intelligence.dimensions ?? [])].sort((a, b) => a.score - b.score)[0];
  return dim?.label.toLowerCase() ?? "price position";
}

export function buildCommerceOpportunityReasoning(args: {
  verdict: PrimaryVerdict;
  buyer: PersonalBuyerIdentity;
  taste: PersonalTasteProfile;
  intelligence: UniversalProductIntelligenceSnapshot;
  discount: DiscountOpportunityInsight;
  equivalent: EquivalentMatchResult;
  store: string;
  categoryLabel: string;
  buyRecoveryNote?: string;
}): CommerceOpportunityReasoning {
  const { verdict, buyer, taste, intelligence, discount, equivalent, store, categoryLabel, buyRecoveryNote } = args;
  const strength = topStrength(intelligence);
  const weakness = weakestDimension(intelligence);

  const discountSituation = clip(
    discount.priceOpportunityLabel === "STRONG DISCOUNT"
      ? `Discount situation: ${discount.discountReason}`
      : discount.priceOpportunityLabel === "BETTER PRICE FOUND"
        ? `Better price found: ${discount.discountReason}`
        : discount.priceOpportunityLabel === "HIDDEN VALUE"
          ? `Hidden value: ${discount.discountReason}`
          : discount.priceOpportunityLabel === "OVERPRICED"
            ? `Price concern: ${discount.discountReason}`
            : discount.discountReason
  );

  const buyerIntentLine = clip(
    `Buyer intent: ${buyer.buyerIdentity} shopper focused on ${taste.detectedTaste.toLowerCase()} taste and ${strength}.`
  );

  const trustLine = clip(
    (intelligence.merchantTrustScore ?? 50) >= 68
      ? `Merchant trust: ${store} looks reliable for checkout and fulfillment.`
      : `Merchant trust: verify ${store} returns policy before buying.`
  );

  const strongestReason = clip(
    verdict === "BUY READY"
      ? `Strongest reason: best balance of ${strength}, ${discountSituation.toLowerCase()}, and seller trust in this tray.`
      : `Strongest reason: acceptable ${strength} for a ${buyer.buyerIdentity.toLowerCase()} search.`
  );

  const weakestReason = clip(
    verdict === "AVOID"
      ? `Weakest reason: ${weakness} and ${discountSituation.toLowerCase()} undermine the listing.`
      : verdict === "WAIT"
        ? `Weakest reason: ${weakness} and timing/price are not compelling right now.`
        : `Weakest reason: a nearby listing may beat this on price, trust, or features.`
  );

  let primaryLine = "";
  if (verdict === "BUY READY") {
    primaryLine = clip(
      buyRecoveryNote
        ? `This is the strongest buy now in this result set because it combines good fit, trusted seller, fair or discounted price, and better value than nearby alternatives. ${buyRecoveryNote}`
        : `This is the strongest buy now because it combines good fit, trusted seller, fair or discounted price, and better value than nearby alternatives.`
    );
  } else if (verdict === "COMPARE") {
    primaryLine = clip(
      equivalent.bestCheaperAlternative
        ? `Good option, but compare first — ${equivalent.bestCheaperAlternative.store} lists a similar ${categoryLabel.toLowerCase()} for less in this tray.`
        : `Good option, but compare first because a similar listing may offer better price, trust, or features.`
    );
  } else if (verdict === "WAIT") {
    primaryLine = clip(
      `Do not buy yet unless price drops or availability improves — ${discountSituation.replace(/^[^:]+:\s*/, "")}`
    );
  } else {
    primaryLine = clip(
      `Skip this listing because price, trust, match quality, or competing alternatives make it a weak purchase for ${buyer.buyerIdentity.toLowerCase()} shoppers.`
    );
  }

  const analystSummary = clip(
    [primaryLine, buyerIntentLine, discountSituation, trustLine].filter(Boolean).join(" ")
  );

  return {
    primaryLine,
    strongestReason,
    weakestReason,
    discountSituation,
    buyerIntentLine,
    trustLine,
    analystSummary,
    buyRecoveryNote,
  };
}

export function reasoningAvoidsBannedPhrases(text: string): boolean {
  const blob = text.toLowerCase();
  return !BANNED_PHRASES.some((phrase) => blob.includes(phrase));
}

export function reasoningIncludesDiscountContext(text: string): boolean {
  const blob = text.toLowerCase();
  return /\b(discount|price|cheaper|fair|overpriced|hidden value|better price)\b/.test(blob);
}
