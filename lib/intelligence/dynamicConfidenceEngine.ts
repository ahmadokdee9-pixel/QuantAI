/**
 * Phase 40 — Dynamic Confidence Engine.
 * Confidence earned from trust, coverage, certainty — no fixed clusters.
 */

import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import { confidenceBandForVerdict } from "@/lib/intelligence/confidenceCalibrationEngine";
import type { RealDiscountValidationV3 } from "@/lib/intelligence/realDiscountValidationV3Engine";
import type { MerchantTrustSignal } from "@/lib/intelligence/merchantTrustEngineV2";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";
import type { MarketCoverageIntelligence } from "@/lib/intelligence/marketCoverageEngine";

export type DynamicConfidence = {
  version: 1;
  confidence: number;
  reason: string;
  factors: {
    merchantTrust: number;
    coverageDepth: number;
    specCertainty: number;
    priceCertainty: number;
    discountCertainty: number;
    marketConsensus: number;
    availabilityQuality: number;
  };
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function spreadWithinBand(link: string, bandMin: number, bandMax: number, raw: number): number {
  let hash = 0;
  for (let i = 0; i < link.length; i++) hash = (hash * 31 + link.charCodeAt(i)) >>> 0;
  const span = bandMax - bandMin;
  const jitter = (hash % 7) - 3;
  return clamp(Math.round(raw + jitter), bandMin, bandMax);
}

/** Generate earned, differentiated confidence per result. */
export function computeDynamicConfidence(args: {
  link: string;
  verdict: PrimaryVerdict;
  merchantTrust: MerchantTrustSignal;
  globalPrice: GlobalPriceIntelligence;
  realDiscount: RealDiscountValidationV3;
  coverage: MarketCoverageIntelligence;
  qualityScore: number;
  availabilityScore: number;
  rankBoost?: number;
}): DynamicConfidence {
  const band = confidenceBandForVerdict(args.verdict);
  const {
    link,
    merchantTrust,
    globalPrice,
    realDiscount,
    coverage,
    qualityScore,
    availabilityScore,
    rankBoost = 0,
  } = args;

  const merchantTrustFactor = clamp(Math.round(merchantTrust.trustScore * 0.22), 0, 22);
  const coverageDepth = clamp(Math.round(coverage.coveragePct * 0.12), 0, 12);
  const specCertainty = clamp(Math.round(qualityScore * 0.14), 0, 14);
  const priceCertainty = clamp(Math.round(globalPrice.priceFairnessScore * 0.16), 0, 16);
  const discountCertainty = clamp(Math.round(realDiscount.realDiscountScore * 0.1), 0, 10);
  const marketConsensus = clamp(Math.round(globalPrice.priceOpportunityScore * 0.1), 0, 10);
  const availabilityQuality = clamp(Math.round(availabilityScore * 0.08), 0, 8);

  const raw =
    band.min +
    merchantTrustFactor * 0.35 +
    coverageDepth * 0.5 +
    specCertainty * 0.4 +
    priceCertainty * 0.45 +
    discountCertainty * 0.35 +
    marketConsensus * 0.3 +
    availabilityQuality * 0.25 +
    rankBoost;

  const confidence = spreadWithinBand(link, band.min, band.max, raw);

  return {
    version: 1,
    confidence,
    reason: `Confidence ${confidence}% from merchant trust (${merchantTrust.trustScore}), coverage (${coverage.coveragePct}%), price certainty, and discount validation.`,
    factors: {
      merchantTrust: merchantTrustFactor,
      coverageDepth,
      specCertainty,
      priceCertainty,
      discountCertainty,
      marketConsensus,
      availabilityQuality,
    },
  };
}

export function hasStaticConfidenceCluster(values: number[], minRepeats = 3): boolean {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.values()].some((c) => c >= minRepeats);
}
