/**
 * Phase 27.4 — Universal Product Decision.
 * Single authority object for card, drawer, brief, expand, and tray voting.
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import type { ExposureChip } from "@/lib/ui/intelligenceExposureActivation";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { VerdictReasonAuthority } from "@/lib/ui/verdictReasonAuthority";
import type { Phase273ProductPresentation } from "@/lib/ui/phase273PresentationActivation";
import type {
  ProductIntelligenceSegment,
  UniversalProductIntelligenceScores,
} from "@/lib/ui/universalProductIntelligenceEngine";

export type UniversalProductIntelligenceSnapshot = UniversalProductIntelligenceScores & {
  finalVerdict: PrimaryVerdict;
  segment: ProductIntelligenceSegment | null;
  segmentLabel: string;
  dimensions: Array<{ key: string; label: string; score: number; signal: string }>;
  productUnderstandingLine: string;
  buyOpportunityScore?: number;
  buyEligible?: boolean;
  buyOpportunityFlags?: string[];
  alignmentFlags?: string[];
  /** Phase 33 — commerce intelligence authority scores. */
  marketOpportunityScore?: number;
  marketValueScore?: number;
  merchantTrustScore?: number;
  marketAveragePrice?: number;
  priceAdvantage?: number;
  dealStrength?: number;
  dealRarity?: number;
  valueDelta?: number;
  intentProfile?: import("@/lib/intelligence/intentUnderstandingEngine").IntentProfile;
  commerceReasoning?: {
    whyWon: string;
    whyLost: string;
    competitorEdge: string;
    improvementPath: string;
  };
  /** Phase 34 — preference intelligence scores. */
  buyerIdentity?: import("@/lib/intelligence/buyerIdentityEngine").BuyerIdentityProfile;
  tasteMatchScore?: number;
  tastePreferences?: import("@/lib/intelligence/tasteMatchEngine").TastePreferenceProfile;
  personalizedDecisionScore?: import("@/lib/intelligence/personalizedDecisionScoringEngine").PersonalizedDecisionScore;
  spreadScore?: number;
  buyerIdentityScore?: number;
  advancedCommerceReasoning?: import("@/lib/intelligence/advancedCommerceReasoningEngine").AdvancedCommerceReasoning;
  /** Phase 35 — personal commerce intelligence. */
  personalBuyerIdentity?: import("@/lib/intelligence/personalBuyerIdentityEngine").PersonalBuyerIdentity;
  personalTasteProfile?: import("@/lib/intelligence/personalTasteIntelligenceEngine").PersonalTasteProfile;
  personalCommerceScore?: import("@/lib/intelligence/personalCommerceScoreEngine").PersonalCommerceScore;
  buyerMatchPct?: number;
  tasteMatchPct?: number;
  buyerReasoning?: import("@/lib/intelligence/buyerReasoningEngine").BuyerReasoning;
  personalCommerceRank?: number;
  /** Phase 36 — discount opportunity intelligence. */
  discountOpportunity?: import("@/lib/intelligence/discountOpportunityEngine").DiscountOpportunityInsight;
  /** Phase 36 — same/equivalent product matching. */
  equivalentMatches?: import("@/lib/intelligence/equivalentProductMatchingEngine").EquivalentMatchResult;
  /** Phase 36 — commerce opportunity reasoning. */
  commerceOpportunityReasoning?: import("@/lib/intelligence/commerceOpportunityReasoningEngine").CommerceOpportunityReasoning;
  /** Phase 36 — tray-level commerce summary (leader row only). */
  trayCommerceSummary?: import("@/lib/intelligence/trayVerdictSummaryEngine").TrayCommerceSummary;
  imageConfidence?: number;
  /** Phase 37 — global commerce intelligence. */
  globalProductIdentity?: import("@/lib/intelligence/globalProductIdentityEngine").GlobalProductIdentity;
  globalPriceIntelligence?: import("@/lib/intelligence/globalPriceIntelligenceEngine").GlobalPriceIntelligence;
  discountIntelligenceV2?: import("@/lib/intelligence/discountIntelligenceV2Engine").DiscountIntelligenceV2;
  globalAlternatives?: import("@/lib/intelligence/globalAlternativeEngine").GlobalAlternatives;
  globalBuyOpportunity?: import("@/lib/intelligence/globalBuyOpportunityEngine").GlobalBuyOpportunity;
  globalDecisionReasoning?: import("@/lib/intelligence/globalDecisionReasoningEngine").GlobalDecisionReasoning;
  universalOfferGraph?: import("@/lib/intelligence/universalOfferGraphEngine").UniversalOfferGraph;
  commercePriorityLabel?: import("@/lib/ui/globalCommerceVerdictEngine").GlobalCommercePriorityLabel;
  /** Phase 38 — commerce dominance intelligence. */
  bestPlaceToBuy?: import("@/lib/intelligence/bestPlaceToBuyEngine").BestPlaceToBuy;
  marketCoverage?: import("@/lib/intelligence/marketCoverageEngine").MarketCoverageIntelligence;
  merchantTrustIntelligence?: import("@/lib/intelligence/merchantTrustEngineV2").MerchantTrustSignal;
  shopperIntentMode?: import("@/lib/intelligence/shopperIntentModeEngine").ShopperIntentProfile;
  productUniverse?: import("@/lib/intelligence/productUniverseEngine").ProductUniverse;
  commercePriceHistory?: import("@/lib/intelligence/commercePriceHistoryEngine").CommercePriceHistoryIntelligence;
  rankedOpportunity?: import("@/lib/intelligence/commerceOpportunityRankEngine").RankedCommerceOpportunity;
  bestDealFound?: import("@/lib/intelligence/bestDealFoundEngine").BestDealFoundAssessment;
  waitPrediction?: import("@/lib/intelligence/waitPredictionEngine").WaitPrediction;
  buyExplanation?: import("@/lib/intelligence/buyExplanationEngine").BuyExplanation;
  globalCommerceGraph?: import("@/lib/intelligence/globalCommerceGraphEngine").GlobalCommerceGraph;
  /** Phase 39 — commerce decision calibration intelligence. */
  opportunityPriorityV2?: import("@/lib/intelligence/opportunityPriorityEngineV2").OpportunityPriorityV2;
  realDiscountValidationV3?: import("@/lib/intelligence/realDiscountValidationV3Engine").RealDiscountValidationV3;
  calibratedConfidence?: import("@/lib/intelligence/confidenceCalibrationEngine").CalibratedConfidence;
  waitExplanation?: import("@/lib/intelligence/waitExplanationEngine").WaitExplanation;
  bestPlaceToBuyV2?: import("@/lib/intelligence/bestPlaceToBuyEngineV2").BestPlaceToBuyV2;
  buyerDecisionIntelligence?: import("@/lib/intelligence/buyerDecisionIntelligenceEngine").BuyerDecisionIntelligence;
  bestDealDominance?: {
    isHolder: boolean;
    dominanceScore: number;
    tiedCount: number;
  };
  calibrationConsistency?: import("@/lib/intelligence/noContradictionEngine").ContradictionReport;
  /** Phase 40 — global ranking + winner intelligence. */
  opportunityLabel?: import("@/lib/intelligence/opportunityLabelEngine").OpportunityLabel;
  dynamicConfidence?: import("@/lib/intelligence/dynamicConfidenceEngine").DynamicConfidence;
  waitForecastV2?: import("@/lib/intelligence/waitForecastEngineV2").WaitForecastV2;
  buyReadyValidationV2?: import("@/lib/intelligence/buyReadyValidationV2").BuyReadyValidationV2;
  globalWinner?: {
    isWinner: boolean;
    winnerScore: number;
    winnerTitle: string | null;
  };
  searchRank?: import("@/lib/intelligence/searchRankingEngine").SearchRankEntry;
  rankingConsistency?: import("@/lib/intelligence/searchRankingContradictionEngine").SearchContradictionReport;
  bestSavings?: import("@/lib/intelligence/bestSavingsEngine").BestSavingsIntelligence;
  searchDominanceSummary?: import("@/lib/intelligence/searchDominanceSummaryEngine").SearchDominanceSummary;
  /** Phase 41 — global category + billion-dollar buy intelligence. */
  globalCategoryIntelligence?: import("@/lib/intelligence/globalCategoryIntelligenceEngine").GlobalCategoryIntelligence;
  productIdentityV2?: import("@/lib/intelligence/productIdentityMatchingV2Engine").ProductIdentityMatchV2;
  billionDollarDiscount?: import("@/lib/intelligence/billionDollarDiscountEngine").BillionDollarDiscountIntelligence;
  marketBreadth?: import("@/lib/intelligence/marketBreadthEngine").MarketBreadthIntelligence;
  evidenceConfidence?: import("@/lib/intelligence/evidenceConfidenceEngine").EvidenceConfidence;
  verdictConsistencyV2?: import("@/lib/intelligence/verdictConsistencyV2Engine").VerdictConsistencyV2;
  rankExplanation?: import("@/lib/intelligence/rankExplanationEngine").RankExplanation;
  dataQuality?: import("@/lib/intelligence/insufficientDataHandlingEngine").DataQualityAssessment;
  categoryBalancedScore?: import("@/lib/intelligence/categoryBalancedRankingEngine").CategoryBalancedScore;
  universalQuery?: import("@/lib/intelligence/universalQueryIntelligenceEngine").UniversalQueryIntelligence;
  stagedIntelligence?: import("@/lib/intelligence/stagedIntelligenceEngine").StagedIntelligencePass;
  marketSummaryV2?: import("@/lib/intelligence/marketSummaryV2Engine").MarketSummaryV2;
  /** Phase 42 — global commerce intelligence core. */
  realDiscountProof?: import("@/lib/intelligence/realDiscountProofEngine").RealDiscountProof;
  realMerchantVerification?: import("@/lib/intelligence/realMerchantVerificationEngine").RealMerchantVerification;
  categoryIntelligenceCore?: import("@/lib/intelligence/categoryIntelligenceCoreEngine").CategoryIntelligenceCore;
  alternativeDiscovery?: import("@/lib/intelligence/alternativeDiscoveryEngine").AlternativeDiscovery;
  marketDepth?: import("@/lib/intelligence/marketDepthEngine").MarketDepthIntelligence;
  valueIntelligenceCore?: import("@/lib/intelligence/valueIntelligenceCoreEngine").ValueIntelligenceCore;
  commerceDecisionCore?: import("@/lib/intelligence/commerceDecisionCoreEngine").CommerceDecisionCore;
  buyOpportunityCore?: import("@/lib/intelligence/buyOpportunityCoreEngine").BuyOpportunityCoreResult;
  decisionCalibration?: import("@/lib/intelligence/decisionCalibrationEngine").DecisionCalibrationResult;
  opportunity?: import("@/lib/intelligence/opportunityDetectionEngine").ProductOpportunityIntelligence;
  /** Phase 45 — production readiness intelligence. */
  categoryValue?: import("@/lib/intelligence/categoryValueEngine").CategoryValueIntelligence;
  trueValue?: import("@/lib/intelligence/trueValueEngine").TrueValueIntelligence;
  discountConfidence?: import("@/lib/intelligence/discountConfidenceEngine").DiscountConfidenceIntelligence;
  merchantReliability?: import("@/lib/intelligence/merchantReliabilityEngine").MerchantReliabilityIntelligence;
  decisionReasoning?: import("@/lib/intelligence/decisionReasoningEngine").DecisionReasoningIntelligence;
  commerceIntelligenceCoreSummary?: {
    distribution: import("@/lib/intelligence/buyOpportunityCoreEngine").BuyOpportunityDistribution;
    marketDepthHeadline: string;
    executiveRule: string;
  };
};

export type UniversalProductDecision = {
  link: string;
  verdict: PrimaryVerdict;
  confidence: number;
  confidenceReason: string;
  reasonLine: string;
  reasonAuthority: VerdictReasonAuthority;
  displayChips: ExposureChip[];
  summaryLines: [string, string];
  alternativePressureScore: number;
  buyerAuthority: number;
  integrityFlags?: string[];
  primaryReason?: string;
  secondaryReason?: string;
  /** Phase 31 — one-sentence decision thesis (score-free). */
  decisionThesis?: string;
  productIntelligence?: UniversalProductIntelligenceSnapshot;
};

export function universalFromPhase273(
  link: string,
  presentation: Phase273ProductPresentation
): UniversalProductDecision {
  return {
    link,
    verdict: presentation.distributionVerdict,
    confidence: presentation.spreadConfidence,
    confidenceReason: presentation.spreadConfidenceReason,
    reasonLine: presentation.distributionReason,
    reasonAuthority: presentation.reasonAuthority,
    displayChips: presentation.displayChips,
    summaryLines: presentation.summaryLines,
    alternativePressureScore: presentation.alternativePressureScore,
    buyerAuthority: presentation.buyerAuthority,
  };
}

/** Overlay universal authority onto coherent signals for drawer/expand/brief surfaces. */
export function overlayCoherentWithUniversal(
  coherent: CoherentProductDecision,
  universal: UniversalProductDecision
): CoherentProductDecision {
  return {
    ...coherent,
    verdict: universal.verdict,
    alignmentScore: universal.confidence,
    reasonLine: universal.reasonLine,
    reasonAuthority: universal.reasonAuthority,
    summaryLines: [...universal.summaryLines],
    intelligenceExposure: {
      ...coherent.intelligenceExposure,
      chips:
        universal.displayChips.length > 0
          ? universal.displayChips
          : coherent.intelligenceExposure.chips,
    },
  };
}

export type CardAuthorityView = {
  verdict: PrimaryVerdict;
  confidence: number;
  reason: string;
  chips: ExposureChip[];
  summaryLines: [string, string];
};

/** Resolve rendered card authority — universal first, never legacy buckets when universal exists. */
export function resolveCardAuthorityView(args: {
  universal?: UniversalProductDecision | null;
  coherent?: CoherentProductDecision | null;
  fallback: { verdict: PrimaryVerdict; confidence: number; reason: string };
}): CardAuthorityView {
  const { universal, coherent, fallback } = args;
  if (universal) {
    return {
      verdict: universal.verdict,
      confidence: universal.confidence,
      reason: universal.reasonLine,
      chips: universal.displayChips,
      summaryLines: universal.summaryLines,
    };
  }
  if (coherent) {
    return {
      verdict: coherent.verdict,
      confidence: coherent.alignmentScore,
      reason: coherent.reasonLine,
      chips: coherent.intelligenceExposure?.chips ?? [],
      summaryLines: [coherent.summaryLines[0] ?? "", coherent.summaryLines[1] ?? ""],
    };
  }
  return {
    verdict: fallback.verdict,
    confidence: fallback.confidence,
    reason: fallback.reason,
    chips: [],
    summaryLines: ["", ""],
  };
}

/** Detect static confidence clusters in rendered tray output. */
export function hasStaticConfidenceCluster(scores: number[], value: number, minRepeats = 3): boolean {
  if (scores.length < minRepeats) return false;
  return scores.filter((score) => score === value).length >= minRepeats;
}
