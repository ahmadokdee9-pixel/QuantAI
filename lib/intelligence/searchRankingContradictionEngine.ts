/**
 * Phase 40 — Search Ranking Contradiction Engine.
 * Rejects impossible verdict/rank/confidence combinations.
 */

import type { DynamicConfidence } from "@/lib/intelligence/dynamicConfidenceEngine";
import type { OpportunityLabel } from "@/lib/intelligence/opportunityLabelEngine";
import { isWeakOpportunity } from "@/lib/intelligence/opportunityLabelEngine";
import type { WaitForecastV2 } from "@/lib/intelligence/waitForecastEngineV2";
import type { SearchRankEntry } from "@/lib/intelligence/searchRankingEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { MerchantTrustSignal } from "@/lib/intelligence/merchantTrustEngineV2";

export type SearchContradictionReport = {
  valid: boolean;
  issues: string[];
};

export function validateSearchRankingConsistency(args: {
  verdict: PrimaryVerdict;
  confidence: DynamicConfidence;
  opportunityLabel: OpportunityLabel;
  merchantTrust: MerchantTrustSignal;
  waitForecast?: WaitForecastV2;
  searchRank?: SearchRankEntry;
  globalWinner?: boolean;
}): SearchContradictionReport {
  const issues: string[] = [];

  if (args.verdict === "BUY READY" && args.confidence.confidence < 70) {
    issues.push("BUY READY + Low Confidence");
  }
  if (args.verdict === "BUY READY" && isWeakOpportunity(args.opportunityLabel)) {
    issues.push("BUY READY + Weak Opportunity");
  }
  if (args.verdict === "BUY READY" && args.merchantTrust.trustScore < 45) {
    issues.push("BUY READY + Poor Merchant");
  }
  if (args.verdict === "BUY READY" && args.opportunityLabel.score <= 20) {
    issues.push("BUY READY + Severe Price Risk");
  }
  if (args.verdict === "WAIT" && (!args.waitForecast || !args.waitForecast.forecastValid)) {
    issues.push("WAIT + No Forecast");
  }
  if (
    args.opportunityLabel.band === "Exceptional Opportunity" &&
    args.searchRank &&
    args.searchRank.rank > 3 &&
    !args.globalWinner
  ) {
    issues.push("Exceptional Opportunity + Low Ranking");
  }

  return { valid: issues.length === 0, issues };
}

export function resolveSearchRankingContradictions(args: {
  verdict: PrimaryVerdict;
  confidence: DynamicConfidence;
  opportunityLabel: OpportunityLabel;
  merchantTrust: MerchantTrustSignal;
  waitForecast?: WaitForecastV2;
}): { verdict: PrimaryVerdict; confidence: DynamicConfidence } {
  let verdict = args.verdict;
  let confidence = args.confidence;

  if (verdict === "BUY READY") {
    if (confidence.confidence < 70) {
      confidence = { ...confidence, confidence: 70 };
    }
    if (isWeakOpportunity(args.opportunityLabel) || args.merchantTrust.trustScore < 45) {
      verdict = "COMPARE";
    }
  }

  if (verdict === "WAIT" && (!args.waitForecast || !args.waitForecast.forecastValid)) {
    verdict = "COMPARE";
  }

  return { verdict, confidence };
}
