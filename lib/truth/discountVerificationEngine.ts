/**
 * Phase 1D — Discount verification engine (evidence-based internal states).
 * User-facing output uses Phase 1A qualified labels only.
 */

import type { QualifiedDiscountProofBand } from "@/lib/truth/truthLanguagePolicy";
import type {
  BaselineCoverage,
  DiscountEvidence,
  DiscountVerificationResult,
  DiscountVerificationState,
  FakeDiscountAssessment,
  PriceHistoryBaselines,
  ReferencePriceSnapshot,
} from "@/lib/truth/priceHistoryTypes";

function stateToQualifiedBand(state: DiscountVerificationState, fake: FakeDiscountAssessment): QualifiedDiscountProofBand {
  if (fake.isFake) return "Fake Discount Signal";
  switch (state) {
    case "VERIFIED_DISCOUNT":
      return "Exceptional Discount Signal";
    case "POSSIBLE_DISCOUNT":
      return "Discount Signal";
    case "UNVERIFIED_DISCOUNT":
      return "Weak Discount Signal";
    case "NO_DISCOUNT":
      return "Weak Discount Signal";
  }
}

function discountPct(current: number, reference: number | null): number | null {
  if (reference == null || reference <= 0 || current <= 0) return null;
  return ((reference - current) / reference) * 100;
}

/** Verify discount state from baselines + reference prices + fake discount assessment. */
export function verifyDiscount(args: {
  currentPrice: number;
  baselines: PriceHistoryBaselines;
  referencePrices: ReferencePriceSnapshot;
  baselineCoverage: BaselineCoverage;
  fakeDiscount: FakeDiscountAssessment;
  marketedOldPrice?: number | null;
}): DiscountVerificationResult {
  const { referencePrices, baselineCoverage, fakeDiscount } = args;

  if (fakeDiscount.isFake) {
    return {
      state: "UNVERIFIED_DISCOUNT",
      qualifiedBand: "Fake Discount Signal",
      discountPctVsReference: discountPct(args.currentPrice, referencePrices.primaryReference),
      referencePriceUsed: referencePrices.primaryReference,
      referenceWindowDays: referencePrices.primaryWindowDays,
      reasoning: fakeDiscount.reasoning,
    };
  }

  const ref = referencePrices.primaryReference;
  const pct = discountPct(args.currentPrice, ref);

  if (ref == null || pct == null) {
    return {
      state: "NO_DISCOUNT",
      qualifiedBand: "Weak Discount Signal",
      discountPctVsReference: null,
      referencePriceUsed: null,
      referenceWindowDays: null,
      reasoning: "No sufficient historical reference price for this canonical SKU.",
    };
  }

  if (pct <= 0) {
    return {
      state: "NO_DISCOUNT",
      qualifiedBand: "Weak Discount Signal",
      discountPctVsReference: pct,
      referencePriceUsed: ref,
      referenceWindowDays: referencePrices.primaryWindowDays,
      reasoning: "Current price is at or above the observed historical reference.",
    };
  }

  if (
    baselineCoverage.sufficientForStrongVerification &&
    pct >= 12 &&
    referencePrices.primaryWindowDays === 90
  ) {
    return {
      state: "VERIFIED_DISCOUNT",
      qualifiedBand: stateToQualifiedBand("VERIFIED_DISCOUNT", fakeDiscount),
      discountPctVsReference: pct,
      referencePriceUsed: ref,
      referenceWindowDays: 90,
      reasoning: `Current price is ~${pct.toFixed(0)}% below the 90-day observed median with strong sample coverage.`,
    };
  }

  if (baselineCoverage.sufficientForVerification && pct >= 8) {
    return {
      state: "VERIFIED_DISCOUNT",
      qualifiedBand: stateToQualifiedBand("VERIFIED_DISCOUNT", fakeDiscount),
      discountPctVsReference: pct,
      referencePriceUsed: ref,
      referenceWindowDays: referencePrices.primaryWindowDays,
      reasoning: `Current price is ~${pct.toFixed(0)}% below the historical reference with adequate observation coverage.`,
    };
  }

  if (pct >= 5 && baselineCoverage.samples30d >= 2) {
    return {
      state: "POSSIBLE_DISCOUNT",
      qualifiedBand: stateToQualifiedBand("POSSIBLE_DISCOUNT", fakeDiscount),
      discountPctVsReference: pct,
      referencePriceUsed: ref,
      referenceWindowDays: referencePrices.primaryWindowDays,
      reasoning: `Price is below recent observed reference (~${pct.toFixed(0)}%) — limited history; treat as possible discount signal.`,
    };
  }

  if (
    args.marketedOldPrice != null &&
    args.marketedOldPrice > args.currentPrice &&
    pct < 5
  ) {
    return {
      state: "UNVERIFIED_DISCOUNT",
      qualifiedBand: stateToQualifiedBand("UNVERIFIED_DISCOUNT", fakeDiscount),
      discountPctVsReference: pct,
      referencePriceUsed: ref,
      referenceWindowDays: referencePrices.primaryWindowDays,
      reasoning: "Marketing suggests a discount, but observed price history does not corroborate material savings.",
    };
  }

  return {
    state: "NO_DISCOUNT",
    qualifiedBand: stateToQualifiedBand("NO_DISCOUNT", fakeDiscount),
    discountPctVsReference: pct,
    referencePriceUsed: ref,
    referenceWindowDays: referencePrices.primaryWindowDays,
    reasoning: "Observed historical reference does not support a material discount claim.",
  };
}

export function buildDiscountEvidence(verification: DiscountVerificationResult): DiscountEvidence {
  return {
    state: verification.state,
    qualifiedBand: verification.qualifiedBand,
    discountPctVsReference: verification.discountPctVsReference,
    referenceWindowDays: verification.referenceWindowDays,
    sampleCount: 0,
    evidenceSummary: verification.reasoning,
  };
}

export function computePriceTruthConfidence(args: {
  baselineCoverage: BaselineCoverage;
  verification: DiscountVerificationResult;
  fakeDiscount: FakeDiscountAssessment;
}): number {
  let score = 20 + args.baselineCoverage.coverageScore * 0.35;

  if (args.fakeDiscount.isFake) score -= 35;
  if (args.verification.state === "VERIFIED_DISCOUNT") score += 28;
  else if (args.verification.state === "POSSIBLE_DISCOUNT") score += 12;
  else if (args.verification.state === "UNVERIFIED_DISCOUNT") score -= 10;

  if (args.baselineCoverage.sufficientForStrongVerification) score += 15;
  else if (args.baselineCoverage.sufficientForVerification) score += 8;

  return Math.min(98, Math.max(5, Math.round(score)));
}
