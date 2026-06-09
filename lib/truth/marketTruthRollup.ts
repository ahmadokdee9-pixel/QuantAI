/**
 * Phase 1G — Market intelligence snapshot types.
 */

export type MarketIntelligenceSnapshot = {
  marketDepth: number;
  marketCoverage: number;
  marketAgreementScore: number;
  marketPriceConfidence: number;
  marketAvailabilityConfidence: number;
  consensusState: string;
  referencePrice: number | null;
  marketSpread: number | null;
};

export type MarketTruthRollupInput = {
  merchantCount: number;
  availabilityConsensus: string;
  crossMerchantReferencePrice: number | null;
  marketPriceSpread: number | null;
  merchantAgreementScore: number;
  listingPriceOutlier: boolean;
  priceTruthConfidence: number;
  baselineSamples90d: number;
  availabilityState: string;
  availabilityFreshness: number;
};

export const THIN_MARKET_DEPTH_THRESHOLD = 50;
export const LOW_MARKET_AGREEMENT_THRESHOLD = 55;
export const HIGH_MARKET_SPREAD_THRESHOLD = 22;
export const WEAK_MARKET_PRICE_CONFIDENCE_THRESHOLD = 45;
export const WEAK_MARKET_AVAILABILITY_CONFIDENCE_THRESHOLD = 50;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function computeMarketDepth(merchantCount: number, baselineSamples90d: number): number {
  let depth = 18;
  if (merchantCount >= 5) depth = 92;
  else if (merchantCount >= 4) depth = 82;
  else if (merchantCount >= 3) depth = 68;
  else if (merchantCount >= 2) depth = 48;
  else if (merchantCount >= 1) depth = 28;

  depth += Math.min(18, baselineSamples90d * 3);
  return clampScore(depth);
}

function computeMarketCoverage(args: {
  merchantCount: number;
  baselineSamples90d: number;
  marketPriceSpread: number | null;
}): number {
  let coverage = args.merchantCount * 16;
  if (args.baselineSamples90d >= 5) coverage += 28;
  else if (args.baselineSamples90d >= 3) coverage += 18;
  else if (args.baselineSamples90d >= 1) coverage += 8;

  const spread = args.marketPriceSpread;
  if (spread != null) {
    if (spread <= 10) coverage += 12;
    else if (spread <= 18) coverage += 4;
    else if (spread >= 25) coverage -= 12;
  }

  return clampScore(coverage);
}

function computeMarketPriceConfidence(args: {
  priceTruthConfidence: number;
  merchantCount: number;
  marketPriceSpread: number | null;
  listingPriceOutlier: boolean;
}): number {
  let score = args.priceTruthConfidence * 0.55;
  if (args.merchantCount >= 3) score += 22;
  else if (args.merchantCount >= 2) score += 14;
  else if (args.merchantCount >= 1) score += 6;

  const spread = args.marketPriceSpread;
  if (spread != null) {
    if (spread <= 10) score += 10;
    else if (spread >= HIGH_MARKET_SPREAD_THRESHOLD) score -= 22;
    else if (spread >= 18) score -= 12;
  }

  if (args.listingPriceOutlier) score -= 18;
  return clampScore(score);
}

function computeMarketAvailabilityConfidence(args: {
  availabilityConsensus: string;
  availabilityState: string;
  availabilityFreshness: number;
}): number {
  let score = 42;

  switch (args.availabilityConsensus) {
    case "CONSENSUS_AVAILABLE":
      score = 86;
      break;
    case "CONSENSUS_UNAVAILABLE":
      score = 68;
      break;
    case "CONSENSUS_CONFLICT":
      score = 32;
      break;
    case "CONSENSUS_UNKNOWN":
    default:
      score = 44;
      break;
  }

  if (args.availabilityState === "UNAVAILABLE") score = Math.min(score, 38);
  else if (args.availabilityState === "STALE") score -= 16;
  else if (args.availabilityState === "UNKNOWN") score -= 12;

  if (args.availabilityFreshness < 50) score -= 12;
  else if (args.availabilityFreshness < 80) score -= 6;

  return clampScore(score);
}

/** Build market intelligence block from cross-merchant truth rollup inputs. */
export function buildMarketTruthRollup(input: MarketTruthRollupInput): MarketIntelligenceSnapshot {
  const marketDepth = computeMarketDepth(input.merchantCount, input.baselineSamples90d);
  const marketCoverage = computeMarketCoverage({
    merchantCount: input.merchantCount,
    baselineSamples90d: input.baselineSamples90d,
    marketPriceSpread: input.marketPriceSpread,
  });
  const marketAgreementScore = clampScore(input.merchantAgreementScore);
  const marketPriceConfidence = computeMarketPriceConfidence({
    priceTruthConfidence: input.priceTruthConfidence,
    merchantCount: input.merchantCount,
    marketPriceSpread: input.marketPriceSpread,
    listingPriceOutlier: input.listingPriceOutlier,
  });
  const marketAvailabilityConfidence = computeMarketAvailabilityConfidence({
    availabilityConsensus: input.availabilityConsensus,
    availabilityState: input.availabilityState,
    availabilityFreshness: input.availabilityFreshness,
  });

  return {
    marketDepth,
    marketCoverage,
    marketAgreementScore,
    marketPriceConfidence,
    marketAvailabilityConfidence,
    consensusState: input.availabilityConsensus,
    referencePrice: input.crossMerchantReferencePrice,
    marketSpread: input.marketPriceSpread,
  };
}
