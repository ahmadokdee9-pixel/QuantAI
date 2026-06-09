/**
 * Phase 40 — Global Winner Engine.
 * Selects the single strongest buying opportunity across the entire search.
 */

import type { OpportunityPriorityV2 } from "@/lib/intelligence/opportunityPriorityEngineV2";
import type { RealDiscountValidationV3 } from "@/lib/intelligence/realDiscountValidationV3Engine";
import type { MerchantTrustSignal } from "@/lib/intelligence/merchantTrustEngineV2";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";
import type { GlobalBuyOpportunity } from "@/lib/intelligence/globalBuyOpportunityEngine";
import type { QuantProduct } from "@/lib/shoppingScore";

export type GlobalWinnerComponents = {
  priceAdvantage: number;
  merchantQuality: number;
  trust: number;
  specStrength: number;
  featureDepth: number;
  durability: number;
  returnPolicy: number;
  warranty: number;
  shippingQuality: number;
  discountQuality: number;
  marketPosition: number;
  opportunityScore: number;
};

export type GlobalWinnerCandidate = {
  link: string;
  winnerScore: number;
  components: GlobalWinnerComponents;
};

export type GlobalWinnerResult = {
  version: 1;
  winnerLink: string | null;
  winnerTitle: string | null;
  winnerScore: number;
  candidates: GlobalWinnerCandidate[];
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/** Score every result and select one global winner. */
export function computeGlobalWinner(args: {
  rows: Array<{
    link: string;
    product: QuantProduct;
    globalPrice: GlobalPriceIntelligence;
    merchantTrust: MerchantTrustSignal;
    buyOpportunity: GlobalBuyOpportunity;
    opportunity: OpportunityPriorityV2;
    realDiscount: RealDiscountValidationV3;
  }>;
}): GlobalWinnerResult {
  const candidates: GlobalWinnerCandidate[] = args.rows.map((row) => {
    const { product, globalPrice, merchantTrust, buyOpportunity, opportunity, realDiscount } = row;

    const priceAdvantage = clamp(Math.round(Math.max(0, globalPrice.priceAdvantagePct) * 1.8), 0, 30);
    const merchantQuality = clamp(Math.round((merchantTrust.trustScore - 40) * 0.35), 0, 22);
    const trust = clamp(Math.round(merchantTrust.returnPolicyScore * 0.12 + merchantTrust.trustScore * 0.08), 0, 18);
    const specStrength = clamp(Math.round(buyOpportunity.qualityScore * 0.18), 0, 18);
    const featureDepth = clamp(Math.round(((product.rating as number) || 4) * 4 + Math.min(8, (product.reviewsCount ?? 0) / 40)), 0, 14);
    const durability = clamp(Math.round(buyOpportunity.qualityScore * 0.1), 0, 10);
    const returnPolicy = clamp(Math.round(merchantTrust.returnPolicyScore * 0.1), 0, 10);
    const warranty = clamp(Math.round(merchantTrust.trustScore * 0.06), 0, 8);
    const shippingQuality = /free delivery|free shipping|next day|express/i.test(`${product.shipping ?? ""}`)
      ? 10
      : 5;
    const discountQuality = clamp(Math.round(realDiscount.realDiscountScore * 0.12), 0, 12);
    const marketPosition = clamp(Math.round(globalPrice.priceOpportunityScore * 0.14), 0, 14);
    const opportunityScore = clamp(Math.round(opportunity.opportunityScore * 0.22), 0, 22);

    const components: GlobalWinnerComponents = {
      priceAdvantage,
      merchantQuality,
      trust,
      specStrength,
      featureDepth,
      durability,
      returnPolicy,
      warranty,
      shippingQuality,
      discountQuality,
      marketPosition,
      opportunityScore,
    };

    const winnerScore = clamp(
      Math.round(
        Object.values(components).reduce((sum, v) => sum + v, 0) -
          (realDiscount.fakeDiscountScoreHigh ? 8 : 0)
      ),
      0,
      100
    );

    return { link: row.link, winnerScore, components };
  });

  candidates.sort((a, b) => b.winnerScore - a.winnerScore);
  const winner = candidates[0] ?? null;
  const winnerRow = winner ? args.rows.find((r) => r.link === winner.link) : null;

  return {
    version: 1,
    winnerLink: winner?.link ?? null,
    winnerTitle: winnerRow?.product.title ?? null,
    winnerScore: winner?.winnerScore ?? 0,
    candidates,
  };
}

export function isGlobalWinner(link: string, result: GlobalWinnerResult): boolean {
  return result.winnerLink === link;
}
