/**
 * Phase 27.3 — Product Differentiation Engine.
 * Unique evidence profiles per listing (value, trust, opportunity, risk, alternative).
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";

export type ProductTrayMeta = {
  price: number;
  rank: number;
  rating: number;
  reviewsCount: number;
  store: string;
};

export type ProductDifferentiationProfile = {
  link: string;
  valueScore: number;
  trustScore: number;
  opportunityScore: number;
  riskScore: number;
  alternativeScore: number;
  buyerAuthority: number;
  uniquenessKey: string;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function safeScore(value: number | null | undefined, fallback = 0): number {
  return value != null && Number.isFinite(value) ? value : fallback;
}

function effectiveTrust(coherent: CoherentProductDecision): number {
  const { trustRisk } = coherent;
  if (Number.isFinite(trustRisk.trustScore) && trustRisk.trustScore > 0) {
    return trustRisk.trustScore;
  }
  return clampScore(100 - safeScore(trustRisk.riskScore, 50));
}

function stableUnit(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

/** Build per-product differentiation scores from existing phase 14–27 signals. */
export function buildProductDifferentiationProfile(
  link: string,
  coherent: CoherentProductDecision,
  meta: ProductTrayMeta
): ProductDifferentiationProfile {
  const trust = effectiveTrust(coherent);
  const sellerQuality = clampScore(
    safeScore(coherent.trustRisk.factors.sellerTrust) * 0.55 +
      safeScore(coherent.trustRisk.factors.marketplaceTrust) * 0.45
  );
  const trustScore = clampScore(trust * 0.62 + sellerQuality * 0.38);

  const distLow = safeScore(coherent.priceTarget.distanceFromLowPct, 12);
  const opportunity = clampScore(
    safeScore(coherent.priceTarget.opportunityScore, 50) * 0.55 +
      Math.max(0, 100 - distLow * 2.2) * 0.25 +
      (coherent.buyWait.verdict === "BUY NOW" ? 14 : coherent.buyWait.verdict === "WAIT" ? -10 : 0)
  );
  const valueScore = clampScore(
    opportunity * 0.45 +
      (coherent.discountTruth.verdict === "Genuine" || coherent.discountTruth.verdict === "Likely Genuine"
        ? 24
        : coherent.discountTruth.verdict === "Inflated" || coherent.discountTruth.verdict === "Likely Inflated"
          ? -18
          : 0) +
      Math.max(0, 16 - distLow * 0.6)
  );

  const riskScore = clampScore(
    safeScore(coherent.trustRisk.riskScore) * 0.42 +
      safeScore(coherent.trustRisk.factors.suspiciousOfferRisk) * 0.22 +
      safeScore(coherent.trustRisk.factors.pricingAnomalyRisk) * 0.18 +
      safeScore(coherent.trustRisk.factors.insufficientInformationRisk) * 0.18
  );

  const alternativeScore = clampScore(
    safeScore(coherent.alternativeAdvantage.leadAdvantageScore, 50) * 0.55 +
      (100 - Math.min(100, meta.rank * 9)) * 0.25 +
      coherent.intentIntelligence.intentMatchScore * 0.2
  );

  const popularity = clampScore(
    Math.min(100, (meta.reviewsCount / 25) * 8) * 0.55 + Math.min(100, meta.rating * 20) * 0.45
  );
  const categoryFit = clampScore(coherent.categoryIntelligence.categoryScore);
  const intentFit = clampScore(coherent.intentIntelligence.intentMatchScore);
  const rankStrength = clampScore(100 - meta.rank * 11 + (coherent.isLeadProduct ? 8 : 0));

  const micro = (stableUnit(`${link}:diff`) - 0.5) * 6;
  const buyerAuthority = clampScore(
    valueScore * 0.22 +
      trustScore * 0.22 +
      opportunity * 0.2 +
      (100 - riskScore) * 0.16 +
      alternativeScore * 0.08 +
      popularity * 0.04 +
      categoryFit * 0.04 +
      intentFit * 0.04 +
      rankStrength * 0.1 +
      micro
  );

  return {
    link,
    valueScore: clampScore(valueScore + micro * 0.35),
    trustScore,
    opportunityScore: clampScore(opportunity + micro * 0.25),
    riskScore: clampScore(riskScore - micro * 0.2),
    alternativeScore: clampScore(alternativeScore + micro * 0.15),
    buyerAuthority,
    uniquenessKey: `${Math.round(valueScore)}-${Math.round(trustScore)}-${Math.round(opportunity)}-${Math.round(riskScore)}-${Math.round(alternativeScore)}`,
  };
}
