/**
 * Phase 1D.5 + 1E + 1F + 1G + 1H — Truth foundation snapshot types for gate integration.
 */

import type { AvailabilityConsensus } from "@/lib/truth/availabilityConsensusModel";
import type { AvailabilityState } from "@/lib/truth/availabilityStateModel";
import type { AvailabilityStatus } from "@/lib/truth/availabilityObservationTypes";
import type { MarketIntelligenceSnapshot } from "@/lib/truth/marketTruthRollup";
import type { MerchantReliabilitySnapshot } from "@/lib/truth/merchantReliabilityTruth";
import type { CommerceReasoningSnapshot } from "@/lib/truth/commerceReasoningLayer";
import type { EvidenceReasoningGraph } from "@/lib/truth/evidenceReasoningGraph";
import type { IntentEngineSnapshot } from "@/lib/truth/intentIntelligenceEngine";
import type { IntentRetrievalSnapshot } from "@/lib/truth/intentAwareRetrievalEngine";
import type { ProductMatchSnapshot } from "@/lib/truth/productMatchingEngine";
import type { ProductReasoningSnapshot } from "@/lib/truth/productReasoningEngine";
import type { DecisionEngineSnapshot } from "@/lib/truth/decisionIntelligenceLayer";
import type { TrustEngineSnapshot } from "@/lib/truth/unifiedTrustEngine";
import type { CommerceIntelligenceSnapshot } from "@/lib/truth/universalCommerceIntelligence";
import type { ProductIntelligenceSnapshot } from "@/lib/truth/productIntelligenceFoundation";
import type { TruthDebugTrace } from "@/lib/truth/truthDebug";
import type {
  BaselineCoverage,
  DiscountEvidence,
  DiscountVerificationState,
  HistoricalPriceObservationRow,
  PriceTruthBundle,
} from "@/lib/truth/priceHistoryTypes";
import type { AvailabilityObservationRow } from "@/lib/truth/availabilityObservationTypes";

export type AvailabilityFreshnessSnapshot = {
  freshnessScore: number;
  listingAgeHours: number;
  observedAt: string | null;
  availabilityStatus: AvailabilityStatus | "unknown";
};

export type TruthFoundationSnapshot = {
  version: 1;
  canonicalSkuId: string | null;
  skuIdentityConfidence: number;
  availabilityState: AvailabilityState;
  availability: AvailabilityFreshnessSnapshot;
  priceTruth: PriceTruthBundle | null;
  discountEvidence: DiscountEvidence | null;
  baselineCoverage: BaselineCoverage | null;
  priceTruthConfidence: number;
  merchantCount: number;
  availabilityConsensus: AvailabilityConsensus;
  crossMerchantReferencePrice: number | null;
  marketPriceSpread: number | null;
  merchantAgreementScore: number;
  listingPriceOutlier: boolean;
  marketIntelligence: MarketIntelligenceSnapshot;
  merchantReliability: MerchantReliabilitySnapshot;
  merchantObservationCount: number;
  productIntelligence: ProductIntelligenceSnapshot;
  commerceIntelligence: CommerceIntelligenceSnapshot;
  commerceReasoning: CommerceReasoningSnapshot;
  evidenceReasoningGraph: EvidenceReasoningGraph;
  trustEngine: TrustEngineSnapshot;
  decisionEngine: DecisionEngineSnapshot;
  intentEngine: IntentEngineSnapshot;
  intentRetrieval: IntentRetrievalSnapshot;
  productMatch: ProductMatchSnapshot;
  productReasoning: ProductReasoningSnapshot;
  debugTrace?: TruthDebugTrace | null;
};

export type TruthFoundationPrefetchEntry = {
  listingUrl: string;
  canonicalSkuId: string;
  skuIdentityConfidence: number;
  availabilityObservation: AvailabilityObservationRow | null;
  priceObservations: HistoricalPriceObservationRow[];
  availabilityDataSource: "db" | "inline";
  priceHistoryDataSource: "db" | "memory" | "inline";
};

export type ExtendedTruthEvidenceSources = {
  priceHistorySamples: number;
  identityConfidence: number;
  marketCoverageScore: number;
  discountProofScore: number;
  discountFake: boolean;
  merchantTrustScore: number;
  hasListingPrice: boolean;
  priceTruthConfidence: number;
  discountEvidence: DiscountEvidence | null;
  baselineCoverage: BaselineCoverage | null;
  availabilityState: AvailabilityState;
  availabilityFreshness: number;
  listingAgeHours: number;
  availabilityStatus: AvailabilityStatus | "unknown";
  canonicalSkuId: string | null;
  skuIdentityConfidence: number;
  discountVerificationState: DiscountVerificationState | null;
  merchantCount: number;
  availabilityConsensus: AvailabilityConsensus;
  crossMerchantReferencePrice: number | null;
  marketPriceSpread: number | null;
  merchantAgreementScore: number;
  listingPriceOutlier: boolean;
  currentListingPrice: number | null;
  marketDepth: number;
  marketCoverage: number;
  marketAgreementScore: number;
  marketPriceConfidence: number;
  marketAvailabilityConfidence: number;
  merchantReliabilityScore: number;
  merchantAvailabilityReliability: number;
  merchantPricingReliability: number;
  merchantFreshnessReliability: number;
  merchantVolatilityScore: number;
  merchantState: string;
  merchantObservationCount: number;
  overallProductConfidence: number;
  productMarketConfidence: number;
  productMerchantReliabilityConfidence: number;
  productTruthConfidence: number;
  intelligenceState: string;
  hasProductIntelligence: boolean;
  commerceConfidence: number;
  commerceProductConfidence: number;
  commerceMarketConfidence: number;
  commerceMerchantConfidence: number;
  commerceState: string;
  hasCommerceIntelligence: boolean;
  reasoningConfidence: number;
  reasoningState: string;
  primaryRisk: string;
  secondaryRisk: string;
  strongestPositiveSignal: string;
  strongestNegativeSignal: string;
  hasCommerceReasoning: boolean;
  evidenceStrength: number;
  evidenceCompleteness: number;
  evidenceState: string;
  conflictingEvidenceCount: number;
  hasEvidenceReasoningGraph: boolean;
  trustScore: number;
  trustConfidence: number;
  trustStrength: number;
  trustState: string;
  trustRiskCount: number;
  hasTrustEngine: boolean;
  decisionScore: number;
  decisionConfidence: number;
  decisionState: string;
  decisionRiskCount: number;
  strongestPositiveFactor: string;
  strongestNegativeFactor: string;
  hasDecisionEngine: boolean;
  retrievalIntentScore: number;
  retrievalReasons: string[];
  hasIntentRetrieval: boolean;
  overallMatchScore: number;
  intentMatchScore: number;
  budgetMatchScore: number;
  qualityMatchScore: number;
  brandMatchScore: number;
  useCaseMatchScore: number;
  strongestMatchReason: string;
  strongestMismatchReason: string;
  hasProductMatch: boolean;
  recommendationStrength: string;
  productReasoningConfidence: number;
  explainabilityScore: number;
  summaryReason: string;
  shortReason: string;
  topPositiveReasonCount: number;
  topNegativeReasonCount: number;
  reasoningEvidenceChain: string[];
  hasProductReasoning: boolean;
};

export type { AvailabilityState } from "@/lib/truth/availabilityStateModel";
export type { AvailabilityConsensus } from "@/lib/truth/availabilityConsensusModel";
export type { MarketIntelligenceSnapshot } from "@/lib/truth/marketTruthRollup";
export type { MerchantReliabilitySnapshot } from "@/lib/truth/merchantReliabilityTruth";
export type { ProductIntelligenceSnapshot } from "@/lib/truth/productIntelligenceFoundation";
export type { CommerceIntelligenceSnapshot } from "@/lib/truth/universalCommerceIntelligence";
export type { CommerceReasoningSnapshot } from "@/lib/truth/commerceReasoningLayer";
export type { EvidenceReasoningGraph } from "@/lib/truth/evidenceReasoningGraph";
export type { TrustEngineSnapshot } from "@/lib/truth/unifiedTrustEngine";
export type { DecisionEngineSnapshot } from "@/lib/truth/decisionIntelligenceLayer";
export type { IntentEngineSnapshot, IntentSnapshot } from "@/lib/truth/intentIntelligenceEngine";
export type { IntentRetrievalSnapshot } from "@/lib/truth/intentAwareRetrievalEngine";
export type { ProductMatchSnapshot } from "@/lib/truth/productMatchingEngine";
export type { ProductReasoningSnapshot, RecommendationStrength } from "@/lib/truth/productReasoningEngine";
