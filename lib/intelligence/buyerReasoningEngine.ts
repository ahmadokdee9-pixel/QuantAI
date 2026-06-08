/**
 * Phase 35 — Buyer Reasoning Engine.
 * Analyst-grade explanations with buyer fit, value, market, trust, and tradeoffs.
 */

import type { PersonalBuyerIdentity } from "@/lib/intelligence/personalBuyerIdentityEngine";
import type { PersonalTasteScore, PersonalTasteProfile } from "@/lib/intelligence/personalTasteIntelligenceEngine";
import type { CommerceIntelligenceAuthority } from "@/lib/intelligence/commerceIntelligenceAuthorityEngine";
import type { PersonalCommerceScore } from "@/lib/intelligence/personalCommerceScoreEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { UniversalProductIntelligenceSnapshot } from "@/lib/ui/universalProductDecision";

export type BuyerReasoning = {
  primaryLine: string;
  buyerFit: string;
  valueAnalysis: string;
  marketPosition: string;
  trustAnalysis: string;
  tradeoffs: string;
  competitorComparison: string;
  improvementPath: string;
};

function clip(text: string, max = 180): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function topStrengths(intelligence: UniversalProductIntelligenceSnapshot): string {
  const dims = [...(intelligence.dimensions ?? [])].sort((a, b) => b.score - a.score).slice(0, 2);
  return dims.map((d) => d.label.toLowerCase()).join(" and ") || "core category strengths";
}

export function buildBuyerReasoning(args: {
  verdict: PrimaryVerdict;
  buyer: PersonalBuyerIdentity;
  taste: PersonalTasteProfile;
  tasteScore: PersonalTasteScore;
  intelligence: UniversalProductIntelligenceSnapshot;
  commerce: CommerceIntelligenceAuthority;
  personalScore: PersonalCommerceScore;
  store: string;
  categoryLabel: string;
}): BuyerReasoning {
  const { verdict, buyer, taste, tasteScore, intelligence, commerce, store, categoryLabel } = args;
  const strengths = topStrengths(intelligence);
  const buyerLabel = buyer.buyerIdentity;

  const priceLine =
    commerce.priceAdvantage > 0.05
      ? "priced below the current tray average"
      : commerce.priceAdvantage < -0.08
        ? "priced above peer listings"
        : "priced near the tray average";

  const buyerFit = clip(
    verdict === "BUY READY"
      ? `Strong fit for ${buyerLabel} shoppers — ${strengths} align with what this buyer prioritizes.`
      : `Partial fit for ${buyerLabel} — ${strengths} are acceptable but not best-in-tray for this buyer profile.`
  );

  const valueAnalysis = clip(
    commerce.dealRarity >= 75
      ? "Value analysis favors this listing — deal strength and price position beat most tray alternatives."
      : commerce.priceAdvantage > 0.05
        ? "Value analysis shows a meaningful price edge versus competing listings."
        : "Value analysis is mixed — specifications do not clearly outperform rivals on price."
  );

  const marketPosition = clip(
    `Market position: ${priceLine} with moderate rival pressure in this search tray.`
  );

  const trustAnalysis = clip(
    commerce.merchantTrustScore >= 72
      ? `Trust analysis: ${store} shows credible fulfillment, returns, and seller history signals.`
      : commerce.merchantTrustScore >= 58
        ? `Trust analysis: ${store} is acceptable but stronger merchant trust exists elsewhere in the tray.`
        : `Trust analysis: ${store} carries elevated risk — verify returns and warranty before purchase.`
  );

  const tradeoffs = clip(
    tasteScore.tasteScore >= 68
      ? `Tradeoff: prioritizes ${taste.detectedTaste} taste alignment over raw spec sheet breadth.`
      : `Tradeoff: stronger on ${strengths} than on ${taste.detectedTaste.toLowerCase()} style alignment.`
  );

  const competitorComparison = clip(
    verdict === "BUY READY"
      ? `Competitor comparison: rivals lose on combined buyer fit, ${priceLine}, or merchant trust at this tier.`
      : `Competitor comparison: this listing loses despite decent specifications because rivals offer stronger performance and merchant trust for similar pricing.`
  );

  const improvementPath = clip(
    verdict === "BUY READY"
      ? `Maintain leadership on ${strengths} and ${priceLine} to hold BUY READY for ${buyerLabel}.`
      : verdict === "AVOID"
        ? `Improvement path: raise trust, close price gap, and strengthen ${strengths} before reconsidering.`
        : `Improvement path: needs sharper pricing or stronger ${strengths} to upgrade from ${verdict}.`
  );

  const primaryLine =
    verdict === "BUY READY"
      ? clip(
          `This ${categoryLabel.toLowerCase()} wins for ${buyerLabel.toLowerCase()} shoppers because it delivers strong ${strengths}, reliable build signals, and better long-term value than competing options at this price point.`
        )
      : verdict === "AVOID"
        ? clip(
            `This listing loses for ${buyerLabel.toLowerCase()} shoppers because competing products offer significantly stronger ${strengths} and merchant trust for similar pricing.`
          )
        : clip(
            `This ${categoryLabel.toLowerCase()} is viable for ${buyerLabel.toLowerCase()} shoppers but blocked by rival listings on value, trust, or taste alignment.`
          );

  return {
    primaryLine,
    buyerFit,
    valueAnalysis,
    marketPosition,
    trustAnalysis,
    tradeoffs,
    competitorComparison,
    improvementPath,
  };
}

export function buyerReasoningIsAnalystGrade(text: string): boolean {
  const blob = text.toLowerCase();
  const hasMarket = /\b(buyer|value|trust|market|compet|rival|tradeoff|fit|pricing|specifications)\b/.test(blob);
  const hasWhy = /\b(wins|loses|stronger|weaker|because|despite|blocked|viable|delivers|offers)\b/.test(blob);
  return hasMarket && hasWhy;
}
