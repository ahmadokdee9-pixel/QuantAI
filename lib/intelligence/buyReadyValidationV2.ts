/**
 * Phase 40 — Buy Ready Validation V2.
 * Stricter BUY READY gate — downgrade when validation fails.
 */

import type { OpportunityLabel } from "@/lib/intelligence/opportunityLabelEngine";
import { isStrongOpportunity } from "@/lib/intelligence/opportunityLabelEngine";
import type { RealDiscountValidationV3 } from "@/lib/intelligence/realDiscountValidationV3Engine";
import type { MerchantTrustIntelligence } from "@/lib/intelligence/merchantTrustIntelligenceEngine";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";
import type { MarketCoverageIntelligence } from "@/lib/intelligence/marketCoverageEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";

export type BuyReadyValidationV2 = {
  version: 2;
  buyReadyValid: boolean;
  validatedVerdict: PrimaryVerdict;
  checks: {
    opportunityStrong: boolean;
    merchantTrustAcceptable: boolean;
    coverageSufficient: boolean;
    priceQualityPasses: boolean;
    productConfidencePasses: boolean;
  };
  downgradeReason: string | null;
};

const MIN_TRUST = 58;
const MIN_COVERAGE = 40;
const MIN_PRICE_FAIRNESS = 48;
const MIN_QUALITY = 52;

/** Validate BUY READY — downgrade to COMPARE or WAIT when checks fail. */
export function validateBuyReadyV2(args: {
  currentVerdict: PrimaryVerdict;
  opportunityLabel: OpportunityLabel;
  merchantTrust: MerchantTrustIntelligence;
  globalPrice: GlobalPriceIntelligence;
  realDiscount: RealDiscountValidationV3;
  coverage: MarketCoverageIntelligence;
  qualityScore: number;
  waitForecastValid?: boolean;
}): BuyReadyValidationV2 {
  const checks = {
    opportunityStrong: isStrongOpportunity(args.opportunityLabel),
    merchantTrustAcceptable: args.merchantTrust.trustScore >= MIN_TRUST,
    coverageSufficient: args.coverage.coveragePct >= MIN_COVERAGE,
    priceQualityPasses:
      args.globalPrice.priceFairnessScore >= MIN_PRICE_FAIRNESS && !args.realDiscount.fakeDiscountScoreHigh,
    productConfidencePasses: args.qualityScore >= MIN_QUALITY,
  };

  const allPass = Object.values(checks).every(Boolean);
  let validatedVerdict = args.currentVerdict;
  let downgradeReason: string | null = null;

  if (args.currentVerdict === "BUY READY" && !allPass) {
    if (!checks.opportunityStrong || !checks.priceQualityPasses) {
      validatedVerdict = args.waitForecastValid ? "WAIT" : "COMPARE";
      downgradeReason = "Opportunity or price quality below BUY READY threshold.";
    } else if (!checks.merchantTrustAcceptable || !checks.productConfidencePasses) {
      validatedVerdict = "COMPARE";
      downgradeReason = "Merchant trust or product confidence requires comparison first.";
    } else if (!checks.coverageSufficient) {
      validatedVerdict = "COMPARE";
      downgradeReason = "Market coverage insufficient for confident checkout.";
    }
  }

  return {
    version: 2,
    buyReadyValid: args.currentVerdict === "BUY READY" && allPass,
    validatedVerdict,
    checks,
    downgradeReason,
  };
}
