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
    args.existing.trustEngine
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

  return {
    ...withEvidenceGraph,
    trustEngine: buildUnifiedTrustEngine(withEvidenceGraph),
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
  };
}

export type { TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";
