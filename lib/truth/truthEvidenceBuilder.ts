/**
 * Phase 1D.5 + 1E — Build truth foundation + evidence sources from intel, product, and DB prefetch.
 */

import type { MarketMemoryState } from "@/lib/intelligence/marketMemory";
import { getSnapshotsForLink } from "@/lib/intelligence/marketMemory";
import type { QuantProduct } from "@/lib/shoppingScore";
import { classifyAvailability, classifiedLabelToDbStatus } from "@/lib/truth/availabilityClassifier";
import type { AvailabilityObservationRow } from "@/lib/truth/availabilityObservationTypes";
import { deriveAvailabilityState, STALE_LISTING_HOURS } from "@/lib/truth/availabilityStateModel";
import { aggregateCrossMerchantTruth } from "@/lib/truth/crossMerchantTruthAggregator";
import { buildMarketTruthRollup } from "@/lib/truth/marketTruthRollup";
import { buildMerchantReliabilityTruth } from "@/lib/truth/merchantReliabilityTruth";
import {
  buildProductIntelligenceFoundation,
  computeProductTruthConfidence,
  hasProductIntelligenceSignal,
  type ProductIntelligenceFoundationInput,
} from "@/lib/truth/productIntelligenceFoundation";
import { computeFreshnessScoreFromObservedAt } from "@/lib/truth/freshnessScore";
import type { HistoricalPriceObservationRow } from "@/lib/truth/priceHistoryTypes";
import { buildPriceTruthBundle } from "@/lib/truth/priceTruth";
import { resolveSkuIdentity } from "@/lib/truth/skuResolver";
import {
  buildUniversalCommerceIntelligence,
  hasCommerceIntelligenceSignal,
} from "@/lib/truth/universalCommerceIntelligence";
import {
  buildCommerceReasoningLayer,
  hasCommerceReasoningSignal,
} from "@/lib/truth/commerceReasoningLayer";
import {
  buildEvidenceReasoningGraph,
  hasEvidenceReasoningGraphSignal,
} from "@/lib/truth/evidenceReasoningGraph";
import {
  buildUnifiedTrustEngine,
  hasTrustEngineSignal,
} from "@/lib/truth/unifiedTrustEngine";
import {
  buildDecisionIntelligenceLayer,
  getStrongestNegativeFactor,
  getStrongestPositiveFactor,
  hasDecisionEngineSignal,
} from "@/lib/truth/decisionIntelligenceLayer";
import { buildIntentIntelligenceEngine } from "@/lib/truth/intentIntelligenceEngine";
import {
  buildIntentAwareRetrieval,
  hasIntentRetrievalSignal,
} from "@/lib/truth/intentAwareRetrievalEngine";
import {
  buildProductMatchingEngine,
  hasProductMatchSignal,
} from "@/lib/truth/productMatchingEngine";
import {
  buildProductReasoningEngine,
  buildProductReasoningEvidenceChain,
  hasProductReasoningSignal,
} from "@/lib/truth/productReasoningEngine";
import {
  buildRecommendationIntelligenceEngine,
  hasRecommendationIntelligenceSignal,
} from "@/lib/truth/recommendationIntelligenceEngine";
import {
  buildExplainableAIEngine,
  buildExplainableAIEvidenceChain,
  hasExplainableAISignal,
} from "@/lib/truth/explainableAIEngine";
import {
  buildConversationalIntentEngine,
  buildConversationalIntentEvidenceChain,
  hasConversationalIntentSignal,
} from "@/lib/truth/conversationalIntentEngine";
import {
  buildTastePreferenceEngine,
  buildTastePreferenceEvidenceChain,
  hasTastePreferenceSignal,
} from "@/lib/truth/tastePreferenceEngine";
import {
  buildUserDecisionIntelligenceEngine,
  buildUserDecisionEvidenceChain,
  hasUserDecisionIntelligenceSignal,
} from "@/lib/truth/userDecisionIntelligenceEngine";
import {
  buildPurchaseMotivationEngine,
  buildPurchaseMotivationEvidenceChain,
  hasPurchaseMotivationSignal,
} from "@/lib/truth/purchaseMotivationEngine";
import {
  buildPurchaseConstraintsEngine,
  buildPurchaseConstraintsEvidenceChain,
  hasPurchaseConstraintsSignal,
} from "@/lib/truth/purchaseConstraintsEngine";
import { buildTruthDebugTrace } from "@/lib/truth/truthDebug";
import type {
  ExtendedTruthEvidenceSources,
  TruthFoundationPrefetchEntry,
  TruthFoundationSnapshot,
} from "@/lib/truth/truthFoundationTypes";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";

function availabilityFromProduct(product: QuantProduct): TruthFoundationSnapshot["availability"] {
  const classification = classifyAvailability({
    availabilityText: product.availability,
    extensions: product.extensions,
    delivery: product.shipping,
  });
  return {
    freshnessScore: 100,
    listingAgeHours: 0,
    observedAt: null,
    availabilityStatus: classifiedLabelToDbStatus(classification.label),
  };
}

function availabilityFromObservation(
  row: AvailabilityObservationRow,
  productFallback: TruthFoundationSnapshot["availability"]
): TruthFoundationSnapshot["availability"] {
  const freshness = computeFreshnessScoreFromObservedAt(row.observed_at);
  return {
    freshnessScore: row.freshness_score ?? freshness.freshnessScore,
    listingAgeHours: freshness.ageHours,
    observedAt: row.observed_at,
    availabilityStatus: row.availability,
  };
}

function memoryToHistoricalRows(
  canonicalSkuId: string,
  link: string,
  memory: MarketMemoryState | null | undefined
): HistoricalPriceObservationRow[] {
  const snaps = getSnapshotsForLink(memory, link);
  return snaps.map((snap, index) => ({
    id: `mem-${index}`,
    canonical_sku_id: canonicalSkuId,
    merchant_key: snap.store.toLowerCase().replace(/\s+/g, "_").slice(0, 48) || "unknown",
    listing_url: link,
    observed_price: snap.price,
    currency: "EUR",
    observed_at: new Date(snap.ts).toISOString(),
    availability_status: "in_stock",
    source: "market_memory",
    created_at: new Date(snap.ts).toISOString(),
  }));
}

function mergeHistoricalRows(
  dbRows: HistoricalPriceObservationRow[],
  memoryRows: HistoricalPriceObservationRow[]
): { rows: HistoricalPriceObservationRow[]; source: "db" | "memory" | "inline" } {
  if (dbRows.length > 0) {
    const seen = new Set(dbRows.map((row) => `${row.merchant_key}:${row.observed_at}:${row.observed_price}`));
    const merged = [...dbRows];
    for (const row of memoryRows) {
      const key = `${row.merchant_key}:${row.observed_at}:${row.observed_price}`;
      if (seen.has(key)) continue;
      merged.push(row);
    }
    merged.sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at));
    return { rows: merged, source: "db" };
  }
  if (memoryRows.length > 0) return { rows: memoryRows, source: "memory" };
  return { rows: [], source: "inline" };
}

/** Build truth foundation snapshot for one listing (sync; uses prefetch when provided). */
export function buildTruthFoundationSnapshot(args: {
  product: QuantProduct;
  listingUrl: string;
  searchQuery?: string;
  marketMemory?: MarketMemoryState | null;
  prefetch?: TruthFoundationPrefetchEntry | null;
  existing?: TruthFoundationSnapshot | null;
}): TruthFoundationSnapshot {
  if (
    args.existing?.version === 1 &&
    args.existing.availabilityState &&
    args.existing.merchantCount != null &&
    args.existing.marketIntelligence &&
    args.existing.merchantReliability &&
    args.existing.productIntelligence &&
    args.existing.commerceIntelligence &&
    args.existing.commerceReasoning &&
    args.existing.evidenceReasoningGraph &&
    args.existing.trustEngine &&
    args.existing.decisionEngine &&
    args.existing.intentEngine &&
    args.existing.intentRetrieval &&
    args.existing.productMatch &&
    args.existing.productReasoning &&
    args.existing.recommendationIntelligence &&
    args.existing.explainableAI &&
    args.existing.conversationalIntent &&
    args.existing.tastePreference &&
    args.existing.userDecisionIntelligence &&
    args.existing.purchaseMotivation &&
    args.existing.purchaseConstraints
  ) {
    return args.existing;
  }

  const sku = args.prefetch
    ? {
        canonicalSkuId: args.prefetch.canonicalSkuId,
        identityConfidence: args.prefetch.skuIdentityConfidence,
      }
    : resolveSkuIdentity({
        product: args.product,
        listingUrl: args.listingUrl,
        searchQuery: args.searchQuery ?? null,
      });

  const inlineAvailability = availabilityFromProduct(args.product);
  const availability = args.prefetch?.availabilityObservation
    ? availabilityFromObservation(args.prefetch.availabilityObservation, inlineAvailability)
    : inlineAvailability;

  const memoryRows = memoryToHistoricalRows(sku.canonicalSkuId, args.listingUrl, args.marketMemory);
  const dbRows = args.prefetch?.priceObservations ?? [];
  const { rows: historicalRows, source: priceHistoryDataSource } = mergeHistoricalRows(dbRows, memoryRows);

  const currentPrice = args.product.price > 0 ? args.product.price : null;
  const priceTruth =
    currentPrice != null
      ? buildPriceTruthBundle({
          canonicalSkuId: sku.canonicalSkuId,
          currentPrice,
          observations: historicalRows,
          marketedOldPrice: args.product.oldPrice,
        })
      : null;

  const availabilityState = deriveAvailabilityState({
    availabilityStatus: availability.availabilityStatus,
    listingAgeHours: availability.listingAgeHours,
    freshnessScore: availability.freshnessScore,
    hasObservation: Boolean(args.prefetch?.availabilityObservation),
  });

  const crossMerchant = aggregateCrossMerchantTruth({
    observations: historicalRows,
    currentPrice,
  });

  const marketIntelligence = buildMarketTruthRollup({
    merchantCount: crossMerchant.merchantCount,
    availabilityConsensus: crossMerchant.availabilityConsensus,
    crossMerchantReferencePrice: crossMerchant.crossMerchantReferencePrice,
    marketPriceSpread: crossMerchant.marketPriceSpread,
    merchantAgreementScore: crossMerchant.merchantAgreementScore,
    listingPriceOutlier: crossMerchant.listingPriceOutlier,
    priceTruthConfidence: priceTruth?.priceTruthConfidence ?? 0,
    baselineSamples90d: priceTruth?.baselineCoverage?.samples90d ?? 0,
    availabilityState,
    availabilityFreshness: availability.freshnessScore,
  });

  const merchantReliabilityBundle = buildMerchantReliabilityTruth({
    store: args.product.store,
    listingUrl: args.listingUrl,
    observations: historicalRows,
    availabilityObservation: args.prefetch?.availabilityObservation ?? null,
    currentPrice,
    referencePrice: crossMerchant.crossMerchantReferencePrice,
    listingAgeHours: availability.listingAgeHours,
  });

  const snapshotWithoutProductIntelligence = {
    version: 1,
    canonicalSkuId: sku.canonicalSkuId,
    skuIdentityConfidence: sku.identityConfidence,
    availabilityState,
    availability,
    priceTruth,
    discountEvidence: priceTruth?.discountEvidence ?? null,
    baselineCoverage: priceTruth?.baselineCoverage ?? null,
    priceTruthConfidence: priceTruth?.priceTruthConfidence ?? 0,
    merchantCount: crossMerchant.merchantCount,
    availabilityConsensus: crossMerchant.availabilityConsensus,
    crossMerchantReferencePrice: crossMerchant.crossMerchantReferencePrice,
    marketPriceSpread: crossMerchant.marketPriceSpread,
    merchantAgreementScore: crossMerchant.merchantAgreementScore,
    listingPriceOutlier: crossMerchant.listingPriceOutlier,
    marketIntelligence,
    merchantReliability: {
      merchantReliabilityScore: merchantReliabilityBundle.merchantReliabilityScore,
      merchantAvailabilityReliability: merchantReliabilityBundle.merchantAvailabilityReliability,
      merchantPricingReliability: merchantReliabilityBundle.merchantPricingReliability,
      merchantFreshnessReliability: merchantReliabilityBundle.merchantFreshnessReliability,
      merchantVolatilityScore: merchantReliabilityBundle.merchantVolatilityScore,
      merchantState: merchantReliabilityBundle.merchantState,
    },
    merchantObservationCount: merchantReliabilityBundle.merchantObservationCount,
    debugTrace: buildTruthDebugTrace({
      listingUrl: args.listingUrl,
      canonicalSkuId: sku.canonicalSkuId,
      availabilityState,
      dataSources: {
        availability: args.prefetch?.availabilityDataSource ?? "inline",
        priceHistory: args.prefetch?.priceHistoryDataSource ?? priceHistoryDataSource,
      },
      listingAgeHours: availability.listingAgeHours,
      freshnessScore: availability.freshnessScore,
      priceObservationCount: historicalRows.length,
      skuIdentityConfidence: sku.identityConfidence,
      priceTruthConfidence: priceTruth?.priceTruthConfidence ?? 0,
      discountState: priceTruth?.discountEvidence?.state ?? null,
    }),
  } satisfies ProductIntelligenceFoundationInput;

  const withProductIntelligence = {
    ...snapshotWithoutProductIntelligence,
    productIntelligence: buildProductIntelligenceFoundation(snapshotWithoutProductIntelligence),
  };

  const withCommerceIntelligence = {
    ...withProductIntelligence,
    commerceIntelligence: buildUniversalCommerceIntelligence(withProductIntelligence),
  };

  const withCommerceReasoning = {
    ...withCommerceIntelligence,
    commerceReasoning: buildCommerceReasoningLayer(withCommerceIntelligence),
  };

  const withEvidenceGraph = {
    ...withCommerceReasoning,
    evidenceReasoningGraph: buildEvidenceReasoningGraph(withCommerceReasoning),
  };

  const withTrustEngine = {
    ...withEvidenceGraph,
    trustEngine: buildUnifiedTrustEngine(withEvidenceGraph),
  };

  const withDecisionEngine = {
    ...withTrustEngine,
    decisionEngine: buildDecisionIntelligenceLayer(withTrustEngine),
  };

  const withIntentEngine = {
    ...withDecisionEngine,
    intentEngine: buildIntentIntelligenceEngine(args.searchQuery ?? ""),
  };

  const withIntentRetrieval = {
    ...withIntentEngine,
    intentRetrieval: buildIntentAwareRetrieval({
      product: args.product,
      intentEngine: withIntentEngine.intentEngine,
    }),
  };

  const withProductMatch = {
    ...withIntentRetrieval,
    productMatch: buildProductMatchingEngine({
      product: args.product,
      intentEngine: withIntentEngine.intentEngine,
    }),
  };

  const withProductReasoning = {
    ...withProductMatch,
    productReasoning: buildProductReasoningEngine(withProductMatch),
  };

  const withRecommendationIntelligence = {
    ...withProductReasoning,
    recommendationIntelligence: buildRecommendationIntelligenceEngine(withProductReasoning),
  };

  const withExplainableAI = {
    ...withRecommendationIntelligence,
    explainableAI: buildExplainableAIEngine(withRecommendationIntelligence),
  };

  const withConversationalIntent = {
    ...withExplainableAI,
    conversationalIntent: buildConversationalIntentEngine(withExplainableAI, args.searchQuery ?? ""),
  };

  const withTastePreference = {
    ...withConversationalIntent,
    tastePreference: buildTastePreferenceEngine(withConversationalIntent, args.searchQuery ?? ""),
  };

  const withUserDecisionIntelligence = {
    ...withTastePreference,
    userDecisionIntelligence: buildUserDecisionIntelligenceEngine(
      withTastePreference,
      args.searchQuery ?? ""
    ),
  };

  const withPurchaseMotivation = {
    ...withUserDecisionIntelligence,
    purchaseMotivation: buildPurchaseMotivationEngine(
      withUserDecisionIntelligence,
      args.searchQuery ?? ""
    ),
  };

  return {
    ...withPurchaseMotivation,
    purchaseConstraints: buildPurchaseConstraintsEngine(
      withPurchaseMotivation,
      args.searchQuery ?? ""
    ),
  };
}

/** Attach truth foundation to a universal decision before gating. */
export function attachTruthFoundationToDecision(
  decision: UniversalProductDecision,
  args: {
    product: QuantProduct;
    searchQuery?: string;
    marketMemory?: MarketMemoryState | null;
    prefetch?: TruthFoundationPrefetchEntry | null;
  }
): UniversalProductDecision {
  const intel = decision.productIntelligence;
  if (!intel) return decision;

  const foundation = buildTruthFoundationSnapshot({
    product: args.product,
    listingUrl: decision.link,
    searchQuery: args.searchQuery,
    marketMemory: args.marketMemory,
    prefetch: args.prefetch ?? null,
    existing: intel.truthFoundation ?? null,
  });

  return {
    ...decision,
    productIntelligence: {
      ...intel,
      truthFoundation: foundation,
    },
  };
}

/** Read gate evidence primarily from TruthFoundationSnapshot (Phase 1E). */
export function buildExtendedTruthEvidenceSources(
  intel: NonNullable<UniversalProductDecision["productIntelligence"]>
): ExtendedTruthEvidenceSources {
  const foundation = intel.truthFoundation;

  if (foundation) {
    const availabilityState = deriveAvailabilityState({
      availabilityStatus: foundation.availability.availabilityStatus,
      listingAgeHours: foundation.availability.listingAgeHours,
      freshnessScore: foundation.availability.freshnessScore,
      hasObservation: foundation.availability.observedAt != null,
    });

    const {
      productIntelligence: _ignoredProductIntelligence,
      commerceIntelligence: _ignoredCommerceIntelligence,
      commerceReasoning: _ignoredCommerceReasoning,
      evidenceReasoningGraph: _ignoredEvidenceReasoningGraph,
      trustEngine: _ignoredTrustEngine,
      decisionEngine: _ignoredDecisionEngine,
      ...foundationInput
    } = foundation;
    const productIntelligence = buildProductIntelligenceFoundation(foundationInput);
    const commerceIntelligence = buildUniversalCommerceIntelligence({
      ...foundationInput,
      productIntelligence,
    });
    const commerceReasoning = buildCommerceReasoningLayer({
      ...foundationInput,
      productIntelligence,
      commerceIntelligence,
    });
    const evidenceReasoningGraph = buildEvidenceReasoningGraph({
      ...foundationInput,
      productIntelligence,
      commerceIntelligence,
      commerceReasoning,
    });
    const trustEngine = buildUnifiedTrustEngine({
      ...foundationInput,
      productIntelligence,
      commerceIntelligence,
      commerceReasoning,
      evidenceReasoningGraph,
    });
    const decisionEngine = buildDecisionIntelligenceLayer({
      ...foundationInput,
      productIntelligence,
      commerceIntelligence,
      commerceReasoning,
      evidenceReasoningGraph,
      trustEngine,
    });
    const { productReasoning: _ignoredProductReasoning, ...reasoningInput } = foundation;

    return {
      priceHistorySamples: foundation.baselineCoverage?.samples90d ?? 0,
      identityConfidence: foundation.skuIdentityConfidence,
      marketCoverageScore: Math.max(
        foundation.marketIntelligence.marketCoverage,
        intel.marketDepth?.marketCoverageScore ?? intel.marketCoverage?.coveragePct ?? 0
      ),
      discountProofScore: foundation.priceTruthConfidence,
      discountFake: foundation.priceTruth?.fakeDiscount.isFake === true,
      merchantTrustScore:
        intel.merchantReliability?.merchantReliabilityScore ??
        intel.realMerchantVerification?.merchantTrustScore ??
        intel.merchantTrustIntelligence?.trustScore ??
        0,
      hasListingPrice: (intel.globalPriceIntelligence?.lowestPriceFound ?? 0) > 0,
      priceTruthConfidence: foundation.priceTruthConfidence,
      discountEvidence: foundation.discountEvidence,
      baselineCoverage: foundation.baselineCoverage,
      availabilityState,
      availabilityFreshness: foundation.availability.freshnessScore,
      listingAgeHours: foundation.availability.listingAgeHours,
      availabilityStatus: foundation.availability.availabilityStatus,
      canonicalSkuId: foundation.canonicalSkuId,
      skuIdentityConfidence: foundation.skuIdentityConfidence,
      discountVerificationState: foundation.discountEvidence?.state ?? null,
      merchantCount: foundation.merchantCount,
      availabilityConsensus: foundation.availabilityConsensus,
      crossMerchantReferencePrice: foundation.crossMerchantReferencePrice,
      marketPriceSpread: foundation.marketPriceSpread,
      merchantAgreementScore: foundation.merchantAgreementScore,
      listingPriceOutlier: foundation.listingPriceOutlier,
      currentListingPrice: intel.globalPriceIntelligence?.lowestPriceFound ?? null,
      marketDepth: foundation.marketIntelligence.marketDepth,
      marketCoverage: foundation.marketIntelligence.marketCoverage,
      marketAgreementScore: foundation.marketIntelligence.marketAgreementScore,
      marketPriceConfidence: foundation.marketIntelligence.marketPriceConfidence,
      marketAvailabilityConfidence: foundation.marketIntelligence.marketAvailabilityConfidence,
      merchantReliabilityScore: foundation.merchantReliability.merchantReliabilityScore,
      merchantAvailabilityReliability: foundation.merchantReliability.merchantAvailabilityReliability,
      merchantPricingReliability: foundation.merchantReliability.merchantPricingReliability,
      merchantFreshnessReliability: foundation.merchantReliability.merchantFreshnessReliability,
      merchantVolatilityScore: foundation.merchantReliability.merchantVolatilityScore,
      merchantState: foundation.merchantReliability.merchantState,
      merchantObservationCount: foundation.merchantObservationCount,
      overallProductConfidence: productIntelligence.overallProductConfidence,
      productMarketConfidence: productIntelligence.marketConfidence,
      productMerchantReliabilityConfidence: productIntelligence.merchantReliabilityConfidence,
      productTruthConfidence: computeProductTruthConfidence(productIntelligence),
      intelligenceState: productIntelligence.intelligenceState,
      hasProductIntelligence: hasProductIntelligenceSignal(productIntelligence),
      commerceConfidence: commerceIntelligence.commerceConfidence,
      commerceProductConfidence: commerceIntelligence.productConfidence,
      commerceMarketConfidence: commerceIntelligence.marketConfidence,
      commerceMerchantConfidence: commerceIntelligence.merchantConfidence,
      commerceState: commerceIntelligence.commerceState,
      hasCommerceIntelligence: hasCommerceIntelligenceSignal(commerceIntelligence),
      reasoningConfidence: commerceReasoning.reasoningConfidence,
      reasoningState: commerceReasoning.reasoningState,
      primaryRisk: commerceReasoning.primaryRisk,
      secondaryRisk: commerceReasoning.secondaryRisk,
      strongestPositiveSignal: commerceReasoning.strongestPositiveSignal,
      strongestNegativeSignal: commerceReasoning.strongestNegativeSignal,
      hasCommerceReasoning: hasCommerceReasoningSignal(commerceReasoning),
      evidenceStrength: evidenceReasoningGraph.evidenceStrength,
      evidenceCompleteness: evidenceReasoningGraph.evidenceCompleteness,
      evidenceState: evidenceReasoningGraph.evidenceState,
      conflictingEvidenceCount: evidenceReasoningGraph.conflictingEvidence.length,
      hasEvidenceReasoningGraph: hasEvidenceReasoningGraphSignal(evidenceReasoningGraph),
      trustScore: trustEngine.trustScore,
      trustConfidence: trustEngine.trustConfidence,
      trustStrength: trustEngine.trustStrength,
      trustState: trustEngine.trustState,
      trustRiskCount: trustEngine.trustRisks.length,
      hasTrustEngine: hasTrustEngineSignal(trustEngine),
      decisionScore: decisionEngine.decisionScore,
      decisionConfidence: decisionEngine.decisionConfidence,
      decisionState: decisionEngine.decisionState,
      decisionRiskCount: decisionEngine.decisionRisks.length,
      strongestPositiveFactor: getStrongestPositiveFactor(decisionEngine.decisionSignals),
      strongestNegativeFactor: getStrongestNegativeFactor(decisionEngine.decisionRisks),
      hasDecisionEngine: hasDecisionEngineSignal(decisionEngine),
      retrievalIntentScore: foundation.intentRetrieval?.retrievalIntentScore ?? 0,
      retrievalReasons: foundation.intentRetrieval?.retrievalReasons ?? [],
      hasIntentRetrieval: hasIntentRetrievalSignal(foundation.intentRetrieval),
      overallMatchScore: foundation.productMatch?.overallMatchScore ?? 0,
      intentMatchScore: foundation.productMatch?.intentMatchScore ?? 0,
      budgetMatchScore: foundation.productMatch?.budgetMatchScore ?? 0,
      qualityMatchScore: foundation.productMatch?.qualityMatchScore ?? 0,
      brandMatchScore: foundation.productMatch?.brandMatchScore ?? 0,
      useCaseMatchScore: foundation.productMatch?.useCaseMatchScore ?? 0,
      strongestMatchReason: foundation.productMatch?.strongestMatchReason ?? "General intent alignment",
      strongestMismatchReason: foundation.productMatch?.strongestMismatchReason ?? "No major mismatch detected",
      hasProductMatch: hasProductMatchSignal(foundation.productMatch),
      recommendationStrength: foundation.productReasoning?.recommendationStrength ?? "UNKNOWN",
      productReasoningConfidence: foundation.productReasoning?.reasoningConfidence ?? 0,
      explainabilityScore: foundation.productReasoning?.explainabilityScore ?? 0,
      summaryReason: foundation.productReasoning?.summaryReason ?? "",
      shortReason: foundation.productReasoning?.shortReason ?? "",
      topPositiveReasonCount: foundation.productReasoning?.topPositiveReasons.length ?? 0,
      topNegativeReasonCount: foundation.productReasoning?.topNegativeReasons.length ?? 0,
      reasoningEvidenceChain: buildProductReasoningEvidenceChain(reasoningInput),
      hasProductReasoning: hasProductReasoningSignal(foundation.productReasoning),
      recommendationTier: foundation.recommendationIntelligence?.recommendationTier ?? "NOT_RECOMMENDED",
      recommendationScore: foundation.recommendationIntelligence?.recommendationScore ?? 0,
      recommendationConfidenceScore: foundation.recommendationIntelligence?.confidenceScore ?? 0,
      recommendationSummary: foundation.recommendationIntelligence?.recommendationSummary ?? "",
      primaryRecommendationReason: foundation.recommendationIntelligence?.primaryRecommendationReason ?? "",
      primaryWarningReason: foundation.recommendationIntelligence?.primaryWarningReason ?? "",
      shouldRecommend: foundation.recommendationIntelligence?.shouldRecommend ?? false,
      shouldHighlight: foundation.recommendationIntelligence?.shouldHighlight ?? false,
      recommendationEvidenceChain: foundation.recommendationIntelligence?.recommendationEvidenceChain ?? [],
      hasRecommendationIntelligence: hasRecommendationIntelligenceSignal(foundation.recommendationIntelligence),
      explainableHeadline: foundation.explainableAI?.headline ?? "",
      explainableNarrative: foundation.explainableAI?.recommendationNarrative ?? "",
      whyThisProduct: foundation.explainableAI?.whyThisProduct ?? "",
      explainableStrengthCount: foundation.explainableAI?.strengths.length ?? 0,
      explainableWeaknessCount: foundation.explainableAI?.weaknesses.length ?? 0,
      trustSummary: foundation.explainableAI?.trustSummary ?? "",
      valueSummary: foundation.explainableAI?.valueSummary ?? "",
      explainableFinalVerdict: foundation.explainableAI?.finalVerdict ?? "",
      explainabilityConfidence: foundation.explainableAI?.explainabilityConfidence ?? 0,
      explainableEvidenceChain: foundation.explainableAI
        ? buildExplainableAIEvidenceChain(foundation.explainableAI)
        : [],
      hasExplainableAI: hasExplainableAISignal(foundation.explainableAI),
      explicitIntent: foundation.conversationalIntent?.explicitIntent ?? "",
      implicitIntent: foundation.conversationalIntent?.implicitIntent ?? "",
      shoppingGoal: foundation.conversationalIntent?.shoppingGoal ?? "",
      conversationalUserContext: foundation.conversationalIntent?.userContext ?? "",
      conversationalExpertiseLevel: foundation.conversationalIntent?.expertiseLevel ?? "UNKNOWN",
      conversationalUrgencyLevel: foundation.conversationalIntent?.urgencyLevel ?? "UNKNOWN",
      conversationalBudgetSensitivity: foundation.conversationalIntent?.budgetSensitivity ?? "UNKNOWN",
      conversationalQualitySensitivity: foundation.conversationalIntent?.qualitySensitivity ?? "UNKNOWN",
      conversationalBrandFlexibility: foundation.conversationalIntent?.brandFlexibility ?? "FLEXIBLE",
      conversationalRiskTolerance: foundation.conversationalIntent?.riskTolerance ?? "UNKNOWN",
      preferenceSignalCount: foundation.conversationalIntent?.preferenceSignals.length ?? 0,
      conversationalConfidence: foundation.conversationalIntent?.conversationalConfidence ?? 0,
      conversationalEvidenceChain: foundation.conversationalIntent
        ? buildConversationalIntentEvidenceChain(foundation.conversationalIntent)
        : [],
      hasConversationalIntent: hasConversationalIntentSignal(foundation.conversationalIntent),
      aestheticProfile: foundation.tastePreference?.aestheticProfile ?? "balanced",
      styleProfile: foundation.tastePreference?.styleProfile ?? "general",
      premiumAffinity: foundation.tastePreference?.premiumAffinity ?? 0,
      valueAffinity: foundation.tastePreference?.valueAffinity ?? 0,
      minimalistPreference: foundation.tastePreference?.minimalistPreference ?? 0,
      performancePreference: foundation.tastePreference?.performancePreference ?? 0,
      portabilityPreference: foundation.tastePreference?.portabilityPreference ?? 0,
      luxuryPreference: foundation.tastePreference?.luxuryPreference ?? 0,
      practicalityPreference: foundation.tastePreference?.practicalityPreference ?? 0,
      innovationPreference: foundation.tastePreference?.innovationPreference ?? 0,
      tasteSignalCount: foundation.tastePreference?.tasteSignals.length ?? 0,
      tasteConfidence: foundation.tastePreference?.tasteConfidence ?? 0,
      tasteEvidenceChain: foundation.tastePreference
        ? buildTastePreferenceEvidenceChain(foundation.tastePreference)
        : [],
      hasTastePreference: hasTastePreferenceSignal(foundation.tastePreference),
      userDecisionStrategy: foundation.userDecisionIntelligence?.decisionStrategy ?? "bestValue",
      userDecisionBehavior: foundation.userDecisionIntelligence?.decisionBehavior ?? "",
      userDecisionConfidence: foundation.userDecisionIntelligence?.decisionConfidence ?? 0,
      userDecisionSignalCount: foundation.userDecisionIntelligence?.decisionSignals.length ?? 0,
      bestValueStrategyScore: foundation.userDecisionIntelligence?.strategyScores.bestValue ?? 0,
      bestQualityStrategyScore: foundation.userDecisionIntelligence?.strategyScores.bestQuality ?? 0,
      premiumChoiceStrategyScore: foundation.userDecisionIntelligence?.strategyScores.premiumChoice ?? 0,
      budgetChoiceStrategyScore: foundation.userDecisionIntelligence?.strategyScores.budgetChoice ?? 0,
      longTermInvestmentStrategyScore:
        foundation.userDecisionIntelligence?.strategyScores.longTermInvestment ?? 0,
      fastPurchaseStrategyScore: foundation.userDecisionIntelligence?.strategyScores.fastPurchase ?? 0,
      safeChoiceStrategyScore: foundation.userDecisionIntelligence?.strategyScores.safeChoice ?? 0,
      experimentalChoiceStrategyScore:
        foundation.userDecisionIntelligence?.strategyScores.experimentalChoice ?? 0,
      userDecisionEvidenceChain: foundation.userDecisionIntelligence
        ? buildUserDecisionEvidenceChain(foundation.userDecisionIntelligence)
        : [],
      hasUserDecisionIntelligence: hasUserDecisionIntelligenceSignal(foundation.userDecisionIntelligence),
      purchaseMotivation: foundation.purchaseMotivation?.motivation ?? "productivity",
      purchaseMotivationConfidence: foundation.purchaseMotivation?.motivationConfidence ?? 0,
      purchaseMotivationSignalCount: foundation.purchaseMotivation?.motivationSignals.length ?? 0,
      productivityMotivationScore: foundation.purchaseMotivation?.motivationScores.productivity ?? 0,
      statusMotivationScore: foundation.purchaseMotivation?.motivationScores.status ?? 0,
      luxuryMotivationScore: foundation.purchaseMotivation?.motivationScores.luxury ?? 0,
      enjoymentMotivationScore: foundation.purchaseMotivation?.motivationScores.enjoyment ?? 0,
      gamingMotivationScore: foundation.purchaseMotivation?.motivationScores.gaming ?? 0,
      creativityMotivationScore: foundation.purchaseMotivation?.motivationScores.creativity ?? 0,
      workMotivationScore: foundation.purchaseMotivation?.motivationScores.work ?? 0,
      educationMotivationScore: foundation.purchaseMotivation?.motivationScores.education ?? 0,
      travelMotivationScore: foundation.purchaseMotivation?.motivationScores.travel ?? 0,
      fitnessMotivationScore: foundation.purchaseMotivation?.motivationScores.fitness ?? 0,
      giftingMotivationScore: foundation.purchaseMotivation?.motivationScores.gifting ?? 0,
      replacementMotivationScore: foundation.purchaseMotivation?.motivationScores.replacement ?? 0,
      necessityMotivationScore: foundation.purchaseMotivation?.motivationScores.necessity ?? 0,
      curiosityMotivationScore: foundation.purchaseMotivation?.motivationScores.curiosity ?? 0,
      innovationMotivationScore: foundation.purchaseMotivation?.motivationScores.innovation ?? 0,
      purchaseMotivationEvidenceChain: foundation.purchaseMotivation
        ? buildPurchaseMotivationEvidenceChain(foundation.purchaseMotivation)
        : [],
      hasPurchaseMotivation: hasPurchaseMotivationSignal(foundation.purchaseMotivation),
      primaryConstraint: foundation.purchaseConstraints?.primaryConstraint ?? "budget",
      constraintConfidence: foundation.purchaseConstraints?.constraintConfidence ?? 0,
      constraintSignalCount: foundation.purchaseConstraints?.constraintSignals.length ?? 0,
      hardRequirementCount: foundation.purchaseConstraints?.hardRequirements.length ?? 0,
      budgetConstraintScore: foundation.purchaseConstraints?.constraintScores.budget ?? 0,
      performanceConstraintScore: foundation.purchaseConstraints?.constraintScores.performance ?? 0,
      portabilityConstraintScore: foundation.purchaseConstraints?.constraintScores.portability ?? 0,
      batteryConstraintScore: foundation.purchaseConstraints?.constraintScores.battery ?? 0,
      screenConstraintScore: foundation.purchaseConstraints?.constraintScores.screen ?? 0,
      cameraConstraintScore: foundation.purchaseConstraints?.constraintScores.camera ?? 0,
      storageConstraintScore: foundation.purchaseConstraints?.constraintScores.storage ?? 0,
      compatibilityConstraintScore: foundation.purchaseConstraints?.constraintScores.compatibility ?? 0,
      deliveryConstraintScore: foundation.purchaseConstraints?.constraintScores.delivery ?? 0,
      travelConstraintScore: foundation.purchaseConstraints?.constraintScores.travel ?? 0,
      gamingConstraintScore: foundation.purchaseConstraints?.constraintScores.gaming ?? 0,
      workConstraintScore: foundation.purchaseConstraints?.constraintScores.work ?? 0,
      educationConstraintScore: foundation.purchaseConstraints?.constraintScores.education ?? 0,
      weightConstraintScore: foundation.purchaseConstraints?.constraintScores.weight ?? 0,
      brandConstraintScore: foundation.purchaseConstraints?.constraintScores.brand ?? 0,
      purchaseConstraintsEvidenceChain: foundation.purchaseConstraints
        ? buildPurchaseConstraintsEvidenceChain(foundation.purchaseConstraints)
        : [],
      hasPurchaseConstraints: hasPurchaseConstraintsSignal(foundation.purchaseConstraints),
    };
  }

  const priceHistorySamples = intel.commercePriceHistory?.insight?.sampleCount ?? 0;
  const identityConfidence =
    intel.productIdentityV2?.identityConfidence ?? intel.globalProductIdentity?.identityConfidence ?? 0;
  const inlineAvailability = {
    freshnessScore: 100,
    listingAgeHours: 0,
    availabilityStatus: "unknown" as const,
  };

  return {
    priceHistorySamples,
    identityConfidence,
    marketCoverageScore: intel.marketDepth?.marketCoverageScore ?? intel.marketCoverage?.coveragePct ?? 50,
    discountProofScore:
      intel.realDiscountProof?.discountAuthenticityScore ?? intel.discountConfidence?.discountConfidence ?? 0,
    discountFake:
      intel.realDiscountProof?.band.includes("Fake") ||
      intel.realDiscountValidationV3?.fakeDiscountScoreHigh === true ||
      intel.discountConfidence?.label === "Weak Discount Signal",
    merchantTrustScore:
      intel.merchantReliability?.merchantReliabilityScore ??
      intel.realMerchantVerification?.merchantTrustScore ??
      intel.merchantTrustIntelligence?.trustScore ??
      0,
    hasListingPrice: (intel.globalPriceIntelligence?.lowestPriceFound ?? 0) > 0,
    priceTruthConfidence: 0,
    discountEvidence: null,
    baselineCoverage: null,
    availabilityState: "UNKNOWN",
    availabilityFreshness: inlineAvailability.freshnessScore,
    listingAgeHours: inlineAvailability.listingAgeHours,
    availabilityStatus: inlineAvailability.availabilityStatus,
    canonicalSkuId: null,
    skuIdentityConfidence: identityConfidence,
    discountVerificationState: null,
    merchantCount: 0,
    availabilityConsensus: "CONSENSUS_UNKNOWN",
    crossMerchantReferencePrice: null,
    marketPriceSpread: null,
    merchantAgreementScore: 0,
    listingPriceOutlier: false,
    currentListingPrice: (intel.globalPriceIntelligence?.lowestPriceFound ?? 0) > 0
      ? (intel.globalPriceIntelligence?.lowestPriceFound ?? null)
      : null,
    marketDepth: 0,
    marketCoverage: 0,
    marketAgreementScore: 0,
    marketPriceConfidence: 0,
    marketAvailabilityConfidence: 0,
    merchantReliabilityScore: 0,
    merchantAvailabilityReliability: 0,
    merchantPricingReliability: 0,
    merchantFreshnessReliability: 0,
    merchantVolatilityScore: 0,
    merchantState: "UNKNOWN",
    merchantObservationCount: 0,
    overallProductConfidence: 0,
    productMarketConfidence: 0,
    productMerchantReliabilityConfidence: 0,
    productTruthConfidence: 0,
    intelligenceState: "PRODUCT_UNKNOWN",
    hasProductIntelligence: false,
    commerceConfidence: 0,
    commerceProductConfidence: 0,
    commerceMarketConfidence: 0,
    commerceMerchantConfidence: 0,
    commerceState: "COMMERCE_UNKNOWN",
    hasCommerceIntelligence: false,
    reasoningConfidence: 0,
    reasoningState: "COMMERCE_REASONING_UNKNOWN",
    primaryRisk: "none",
    secondaryRisk: "none",
    strongestPositiveSignal: "Limited positive confirmation",
    strongestNegativeSignal: "No major negative signal",
    hasCommerceReasoning: false,
    evidenceStrength: 0,
    evidenceCompleteness: 0,
    evidenceState: "EVIDENCE_UNKNOWN",
    conflictingEvidenceCount: 0,
    hasEvidenceReasoningGraph: false,
    trustScore: 0,
    trustConfidence: 0,
    trustStrength: 0,
    trustState: "TRUST_UNKNOWN",
    trustRiskCount: 0,
    hasTrustEngine: false,
    decisionScore: 0,
    decisionConfidence: 0,
    decisionState: "UNKNOWN",
    decisionRiskCount: 0,
    strongestPositiveFactor: "Limited positive confirmation",
    strongestNegativeFactor: "No major negative signal",
    hasDecisionEngine: false,
    retrievalIntentScore: 0,
    retrievalReasons: [],
    hasIntentRetrieval: false,
    overallMatchScore: 0,
    intentMatchScore: 0,
    budgetMatchScore: 0,
    qualityMatchScore: 0,
    brandMatchScore: 0,
    useCaseMatchScore: 0,
    strongestMatchReason: "General intent alignment",
    strongestMismatchReason: "No major mismatch detected",
    hasProductMatch: false,
    recommendationStrength: "UNKNOWN",
    productReasoningConfidence: 0,
    explainabilityScore: 0,
    summaryReason: "",
    shortReason: "",
    topPositiveReasonCount: 0,
    topNegativeReasonCount: 0,
    reasoningEvidenceChain: [],
    hasProductReasoning: false,
    recommendationTier: "NOT_RECOMMENDED",
    recommendationScore: 0,
    recommendationConfidenceScore: 0,
    recommendationSummary: "",
    primaryRecommendationReason: "",
    primaryWarningReason: "",
    shouldRecommend: false,
    shouldHighlight: false,
    recommendationEvidenceChain: [],
    hasRecommendationIntelligence: false,
    explainableHeadline: "",
    explainableNarrative: "",
    whyThisProduct: "",
    explainableStrengthCount: 0,
    explainableWeaknessCount: 0,
    trustSummary: "",
    valueSummary: "",
    explainableFinalVerdict: "",
    explainabilityConfidence: 0,
    explainableEvidenceChain: [],
    hasExplainableAI: false,
    explicitIntent: "",
    implicitIntent: "",
    shoppingGoal: "",
    conversationalUserContext: "",
    conversationalExpertiseLevel: "UNKNOWN",
    conversationalUrgencyLevel: "UNKNOWN",
    conversationalBudgetSensitivity: "UNKNOWN",
    conversationalQualitySensitivity: "UNKNOWN",
    conversationalBrandFlexibility: "FLEXIBLE",
    conversationalRiskTolerance: "UNKNOWN",
    preferenceSignalCount: 0,
    conversationalConfidence: 0,
    conversationalEvidenceChain: [],
    hasConversationalIntent: false,
    aestheticProfile: "balanced",
    styleProfile: "general",
    premiumAffinity: 0,
    valueAffinity: 0,
    minimalistPreference: 0,
    performancePreference: 0,
    portabilityPreference: 0,
    luxuryPreference: 0,
    practicalityPreference: 0,
    innovationPreference: 0,
    tasteSignalCount: 0,
    tasteConfidence: 0,
    tasteEvidenceChain: [],
    hasTastePreference: false,
    userDecisionStrategy: "bestValue",
    userDecisionBehavior: "",
    userDecisionConfidence: 0,
    userDecisionSignalCount: 0,
    bestValueStrategyScore: 0,
    bestQualityStrategyScore: 0,
    premiumChoiceStrategyScore: 0,
    budgetChoiceStrategyScore: 0,
    longTermInvestmentStrategyScore: 0,
    fastPurchaseStrategyScore: 0,
    safeChoiceStrategyScore: 0,
    experimentalChoiceStrategyScore: 0,
    userDecisionEvidenceChain: [],
    hasUserDecisionIntelligence: false,
    purchaseMotivation: "productivity",
    purchaseMotivationConfidence: 0,
    purchaseMotivationSignalCount: 0,
    productivityMotivationScore: 0,
    statusMotivationScore: 0,
    luxuryMotivationScore: 0,
    enjoymentMotivationScore: 0,
    gamingMotivationScore: 0,
    creativityMotivationScore: 0,
    workMotivationScore: 0,
    educationMotivationScore: 0,
    travelMotivationScore: 0,
    fitnessMotivationScore: 0,
    giftingMotivationScore: 0,
    replacementMotivationScore: 0,
    necessityMotivationScore: 0,
    curiosityMotivationScore: 0,
    innovationMotivationScore: 0,
    purchaseMotivationEvidenceChain: [],
    hasPurchaseMotivation: false,
    primaryConstraint: "budget",
    constraintConfidence: 0,
    constraintSignalCount: 0,
    hardRequirementCount: 0,
    budgetConstraintScore: 0,
    performanceConstraintScore: 0,
    portabilityConstraintScore: 0,
    batteryConstraintScore: 0,
    screenConstraintScore: 0,
    cameraConstraintScore: 0,
    storageConstraintScore: 0,
    compatibilityConstraintScore: 0,
    deliveryConstraintScore: 0,
    travelConstraintScore: 0,
    gamingConstraintScore: 0,
    workConstraintScore: 0,
    educationConstraintScore: 0,
    weightConstraintScore: 0,
    brandConstraintScore: 0,
    purchaseConstraintsEvidenceChain: [],
    hasPurchaseConstraints: false,
  };
}

export type { TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";
