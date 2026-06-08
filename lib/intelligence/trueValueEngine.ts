/**
 * Phase 45 — True Value Engine.
 * Rewards good products at good deals — not cheap products alone.
 */

import type { ProductOpportunityIntelligence } from "@/lib/intelligence/opportunityDetectionEngine";
import type { CategoryValueIntelligence } from "@/lib/intelligence/categoryValueEngine";

export type TrueValueIntelligence = {
  version: 1;
  trueValueScore: number;
  marketOpportunityComponent: number;
  qualityComponent: number;
  merchantTrustComponent: number;
  verifiedDiscountComponent: number;
  confidenceComponent: number;
  band: "EXCEPTIONAL TRUE VALUE" | "STRONG TRUE VALUE" | "GOOD TRUE VALUE" | "FAIR TRUE VALUE" | "WEAK TRUE VALUE";
  reasoning: string;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function bandForScore(score: number): TrueValueIntelligence["band"] {
  if (score >= 88) return "EXCEPTIONAL TRUE VALUE";
  if (score >= 78) return "STRONG TRUE VALUE";
  if (score >= 68) return "GOOD TRUE VALUE";
  if (score >= 55) return "FAIR TRUE VALUE";
  return "WEAK TRUE VALUE";
}

/** Compute true value — quality + deal + trust, not price alone. */
export function computeTrueValueIntelligence(args: {
  marketOpportunityScore: number;
  qualityScore: number;
  merchantTrust: number;
  discountVerified: boolean;
  discountConfidence: number;
  confidence: number;
  categoryValue?: CategoryValueIntelligence;
}): TrueValueIntelligence {
  const marketOpportunityComponent = clamp(Math.round(args.marketOpportunityScore * 0.28), 0, 28);
  const qualityComponent = clamp(Math.round(args.qualityScore * 0.26), 0, 26);
  const merchantTrustComponent = clamp(Math.round(args.merchantTrust * 0.18), 0, 18);
  const verifiedDiscountComponent = args.discountVerified
    ? clamp(Math.round(args.discountConfidence * 0.16), 0, 16)
    : clamp(Math.round(args.discountConfidence * 0.04), 0, 6);
  const confidenceComponent = clamp(Math.round(args.confidence * 0.12), 0, 12);

  const trueValueScore = clamp(
    marketOpportunityComponent +
      qualityComponent +
      merchantTrustComponent +
      verifiedDiscountComponent +
      confidenceComponent,
    0,
    100
  );

  const band = bandForScore(trueValueScore);
  const kind = args.categoryValue?.kind ?? "generic";

  const reasoning =
    kind === "sofas"
      ? `True value ${trueValueScore}/100 — combines sofa quality (${args.qualityScore}) with market opportunity and verified pricing.`
      : kind === "phones"
        ? `True value ${trueValueScore}/100 — balances phone generation quality with verified discount and merchant trust.`
        : kind === "laptops" || kind === "macbooks"
          ? `True value ${trueValueScore}/100 — performance-to-price ratio weighted with specification quality and trust.`
          : `True value ${trueValueScore}/100 — product quality and deal evidence combined, not price alone.`;

  return {
    version: 1,
    trueValueScore,
    marketOpportunityComponent,
    qualityComponent,
    merchantTrustComponent,
    verifiedDiscountComponent,
    confidenceComponent,
    band,
    reasoning,
  };
}

export function marketOpportunityFromIntel(
  opportunity: ProductOpportunityIntelligence | undefined,
  priceAdvantagePct: number
): number {
  const base = opportunity?.score ?? 50;
  return clamp(Math.round(base * 0.75 + Math.min(25, priceAdvantagePct * 0.8)), 0, 100);
}
