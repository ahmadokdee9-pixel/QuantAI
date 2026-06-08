/**
 * Phase 34 — Advanced Commerce Reasoning.
 * Professional analyst-style explanations — market, trust, value, competition.
 * Score-free language for card surfaces (Phase 31 continuity).
 */

import type { BuyerIdentityProfile } from "@/lib/intelligence/buyerIdentityEngine";
import type { CommerceIntelligenceAuthority } from "@/lib/intelligence/commerceIntelligenceAuthorityEngine";
import type { PersonalizedDecisionScore } from "@/lib/intelligence/personalizedDecisionScoringEngine";
import type { TasteMatchResult } from "@/lib/intelligence/tasteMatchEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { UniversalProductIntelligenceSnapshot } from "@/lib/ui/universalProductDecision";

export type AdvancedCommerceReasoning = {
  whyWins: string;
  whyCompetitorsLose: string;
  pricePosition: string;
  valueAdvantage: string;
  trustAdvantage: string;
  categoryStrength: string;
  improvementPath: string;
  analystSummary: string;
};

function clip(text: string, max = 160): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function topDimensions(intelligence: UniversalProductIntelligenceSnapshot, count = 2): string {
  const dims = [...(intelligence.dimensions ?? [])].sort((a, b) => b.score - a.score).slice(0, count);
  return dims.map((d) => d.label.toLowerCase()).join(" and ") || "core category fit";
}

function buyerLabel(buyer: BuyerIdentityProfile): string {
  return buyer.primaryIdentity.replace(/_/g, " ");
}

function pricePositionLine(commerce: CommerceIntelligenceAuthority): string {
  if (commerce.priceAdvantage > 0.05) return "priced below the current tray average";
  if (commerce.priceAdvantage < -0.08) return "priced above the current tray average";
  return "priced near the tray market average";
}

export function buildAdvancedCommerceReasoning(args: {
  verdict: PrimaryVerdict;
  intelligence: UniversalProductIntelligenceSnapshot;
  commerce: CommerceIntelligenceAuthority;
  personalized: PersonalizedDecisionScore;
  taste: TasteMatchResult;
  buyer: BuyerIdentityProfile;
  store: string;
  categoryLabel: string;
}): AdvancedCommerceReasoning {
  const { verdict, intelligence, commerce, taste, buyer, store, categoryLabel } = args;
  const strengths = topDimensions(intelligence);
  const pricePos = pricePositionLine(commerce);

  const pricePosition = clip(`Price sits ${pricePos} in this search tray.`);

  const valueAdvantage = clip(
    commerce.dealRarity >= 78
      ? "Value advantage is strong — this offer ranks among the best deals currently visible in the tray."
      : commerce.priceAdvantage > 0.05
        ? "Meaningful value edge versus peer listings on price alone."
        : "Value position is moderate — no decisive price edge over nearby rivals."
  );

  const trustAdvantage = clip(
    commerce.merchantTrustScore >= 72
      ? `${store} clears trust checks with reliable fulfillment and credible seller signals.`
      : commerce.merchantTrustScore >= 58
        ? `${store} meets baseline trust, but stronger merchant options exist in this tray.`
        : `Merchant trust is thin at ${store} — returns, warranty, and seller history need caution.`
  );

  const categoryStrength = clip(
    `${categoryLabel} strengths concentrate in ${strengths} for this ${buyerLabel(buyer)} shopper profile.`
  );

  const tasteLine =
    taste.matchedDimensions.length > 0
      ? `Style alignment matches ${taste.matchedDimensions.map((d) => d.replace(/_/g, " ")).join(", ")} preferences.`
      : "Style fit is neutral for the current query profile.";

  const whyWins =
    verdict === "BUY READY"
      ? clip(
          `Wins for ${buyerLabel(buyer)} buyers: ${strengths} lead the tray, ${pricePos}, and ${trustAdvantage.replace(/\.$/, "")}. ${tasteLine}`
        )
      : clip(
          `Does not win the tray — ${strengths} are present but market opportunity and rival pressure block a purchase lead.`
        );

  const whyCompetitorsLose = clip(
    verdict === "BUY READY"
      ? `Nearby rivals lose on weaker combined opportunity, less favorable pricing, or lower trust at comparable spec tiers.`
      : `Competitors beat this listing on price position, taste alignment, or merchant trust — explaining the ${verdict} call.`
  );

  const improvementPath =
    verdict === "BUY READY"
      ? clip(`Hold position by maintaining ${pricePos} and ${strengths} leadership.`)
      : verdict === "AVOID"
        ? clip(`Avoid until trust, value, and ${strengths} all improve materially versus tray leaders.`)
        : clip(`To upgrade verdict: close the price gap, raise merchant trust, or strengthen ${strengths}.`);

  const analystSummary = clip(
    [whyWins, valueAdvantage, whyCompetitorsLose].filter(Boolean).join(" ")
  );

  return {
    whyWins,
    whyCompetitorsLose,
    pricePosition,
    valueAdvantage,
    trustAdvantage,
    categoryStrength,
    improvementPath,
    analystSummary,
  };
}

export function reasoningIsAnalystGrade(text: string): boolean {
  const blob = text.toLowerCase();
  const hasMarket = /\b(tray|market|price|value|trust|rival|competitor|opportunity)\b/.test(blob);
  const hasWhy = /\b(wins|lose|beat|block|upgrade|avoid|lead|pressure)\b/.test(blob);
  return hasMarket && hasWhy;
}
