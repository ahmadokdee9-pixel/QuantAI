import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { enrichProductsWithIntelligence } from "@/lib/intelligence/enrichProducts";
import type { SearchCommerceAIMeta } from "@/lib/intelligence/commerceAnalysisTypes";
import { attachCommerceAiLayer } from "@/lib/intelligence/commerceAi/attachCommerceAiLayer";
import { resolveCommerceAiEngine } from "@/lib/intelligence/commerceAi/commerceAiEngine";
import { mergeCommerceSessionMemory, safeParseCommerceSessionMemory } from "@/lib/intelligence/commerceSessionMemory";
import { buildBundleSuggestions } from "@/lib/intelligence/bundleIntelligence";
import { applyMarketAwarenessRanking, computeMarketAwarenessForTray } from "@/lib/intelligence/marketAwareness";
import { buildCommerceQualityDebug, buildCommerceQualityLayer } from "@/lib/intelligence/commerceQualityLayer";
import { buildMarketComparisonSummary } from "@/lib/intelligence/marketComparisonEngine";
import { buildBuyingDecisionDebug, buildBuyingDecisionLayer } from "@/lib/intelligence/buyingDecisionEngine";
import { applyPersonaRanking } from "@/lib/intelligence/personaRanking";
import { applyPredictiveCommerceToTray } from "@/lib/intelligence/predictiveCommerceIntelligence";
import { detectShopperPersonas } from "@/lib/intelligence/shopperPersona";
import {
  countSearchesTodayUtc,
  mergeRecommendationMemory,
  memoryPatchFromSearch,
  recordSearchHistory,
} from "@/lib/intelligence/persistence";
import { buildDealClusters } from "@/lib/deals";
import { buildSearchIntelligence } from "@/lib/intelligence/searchDecisionEngine";
import { runLiveCommerceDiscovery, type LiveCommerceDiscoveryMeta } from "@/lib/intelligence/liveCommerceDiscovery";
import { applyHardIdentityGate, buildIdentityDebugSummary, recoverSafeIdentityBreadth } from "@/lib/intelligence/productIdentity";
import { intentMatchEnvelope } from "@/lib/intelligence/searchIntentV2";
import {
  enforceAuthSearchLimits,
  enforceGuestSearchLimits,
  MAX_SEARCH_QUERY_LENGTH,
} from "@/lib/search/searchAbuseProtection";
import { entitlementsForTier } from "@/lib/subscription/entitlements";
import { planDefinition } from "@/lib/subscription/plans";
import { resolveServerSubscriptionTier } from "@/lib/subscription/resolveTier";
import { buildUniversalCommerceContext, tasteTagListForApi } from "@/lib/commerce-os";
import { canonicalQueryForDebug, type CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import { buildQueryIntelligence } from "@/lib/intelligence/queryIntelligence";
import { buildMultiCategoryIntelligence } from "@/lib/intelligence/multiCategoryIntelligence";
import { buildTasteIntelligence } from "@/lib/intelligence/tasteIntelligenceEngine";
import { buildLifestyleIntelligence } from "@/lib/intelligence/lifestyleIntelligenceEngine";
import { buildContextIntelligence } from "@/lib/intelligence/contextIntelligenceEngine";
import { buildIntentConfidence } from "@/lib/intelligence/intentConfidenceEngine";
import { buildMemoryPreparation } from "@/lib/intelligence/memoryPreparationEngine";
import { buildUniversalBuyerModel } from "@/lib/intelligence/universalBuyerModelEngine";
import { buildBuyerIntentVector } from "@/lib/intelligence/buyerIntentVectorEngine";
import { buildShopperPsychology } from "@/lib/intelligence/shopperPsychologyEngine";
import {
  applyDecisionReadinessToBrief,
  buildDecisionReadiness,
} from "@/lib/intelligence/decisionReadinessEngine";
import { activateQuantAIIntelligence } from "@/lib/intelligence/intelligenceActivationEngine";
import { translateQuantAIIntelligence } from "@/lib/intelligence/intelligenceTranslationLayer";
import { buildPurchaseFriction } from "@/lib/intelligence/purchaseFrictionEngine";
import { buildConversionProbability } from "@/lib/intelligence/conversionProbabilityEngine";
import { buildDealSensitivity } from "@/lib/intelligence/dealSensitivityEngine";
import { buildBrandAffinity } from "@/lib/intelligence/brandAffinityEngine";
import { buildProductAttributeAffinity } from "@/lib/intelligence/productAttributeAffinityEngine";
import { buildRetailerTrust } from "@/lib/intelligence/retailerTrustEngine";
import { buildReviewCredibility } from "@/lib/intelligence/reviewCredibilityEngine";
import { buildRealDiscount } from "@/lib/intelligence/realDiscountEngine";
import { buildValueIntelligence } from "@/lib/intelligence/valueIntelligenceEngine";
import { buildRankingPreparation } from "@/lib/intelligence/rankingPreparationEngine";
import { aggregateRankingSignals } from "@/lib/ranking/rankingSignalsAggregator";
import { buildDeterministicRanking } from "@/lib/ranking/deterministicRankingEngine";
import { applyProductRanking } from "@/lib/ranking/productRankingApplication";
import { prepareRankingExecution } from "@/lib/ranking/rankingExecutionPreparation";
import { executeControlledRanking } from "@/lib/ranking/controlledRankingExecution";
import { normalizeSearchCacheKey } from "@/lib/search/searchCacheKey";
import {
  applyBetaDiscoveryDefaults,
  createAuthPipelineCache,
  createGuestPipelineCache,
  isProductionShadowStackDisabled,
  loadPipelineWithInflightDedupe,
  searchFallbackQueryCap,
  searchPrimaryMinProducts,
} from "@/lib/search/productionStabilization";
import type { SearchPipelineTray } from "@/lib/search/productionStabilizationEnv";
import { applyMerchantDiversitySafeguard } from "@/lib/search/merchantDiversityRerank";
import { semanticRerankSearchResults } from "@/lib/search/semanticReranker";
import { buildLatencyBudgetReport } from "@/lib/search/latencyBudget";
import { PipelineTrace } from "@/lib/search/pipelineTrace";
import { rebuildSearchTrayArtifacts, verifyTrayMetaCoherence } from "@/lib/search/searchTrayArtifacts";
import { composeProductionMeta } from "@/lib/search/productionMetaComposer";
import { applySearchIntelligenceUpgrade } from "@/lib/search/searchIntelligenceUpgrade";
import { applyPhase92TrayIntegrity } from "@/lib/search/phase92TrayIntegrity";
import { applyPhase93TrustDiscountHardening } from "@/lib/intelligence/phase93TrustDiscountHardening";
import { applyPhase95CommerceMemory } from "@/lib/intelligence/phase95CommerceMemory";
import { applyVerdictIntelligence } from "@/lib/intelligence/verdictEngine";
import { applyExplainabilityIntelligence } from "@/lib/intelligence/explainabilityEngine";
import { applyAlternativeIntelligence } from "@/lib/intelligence/alternativeIntelligenceEngine";
import { applyMarketContextIntelligence } from "@/lib/intelligence/marketContextEngine";
import { applyCompetitiveIntelligence } from "@/lib/intelligence/competitiveIntelligenceEngine";
import { applyConfidenceIntelligence } from "@/lib/intelligence/confidenceEngine";
import { applyIntentAlignmentIntelligence } from "@/lib/intelligence/intentAlignmentEngine";
import { applyPersonalizationIntelligence } from "@/lib/intelligence/personalizationEngine";
import { applyRetailerIntelligence } from "@/lib/intelligence/retailerIntelligenceEngine";
import { applyDealIntelligence } from "@/lib/intelligence/phase109DealIntelligenceEngine";
import { applyCommerceFusion } from "@/lib/intelligence/commerceFusionEngine";
import {
  prefetchTruthFoundationBatch,
  serializeTruthFoundationPrefetch,
} from "@/lib/truth/truthFoundationLoader";
import { serializeTruthRankingByLink } from "@/lib/truth/rankingDecisionRecord";
import { computeTrustDrivenRankScore } from "@/lib/truth/trustDrivenCompositeRank";
import {
  circuitSnapshot,
  getGuestStaleTray,
  isCircuitOpen,
  markCircuitFailure,
  markCircuitSuccess,
  markRateLimited429,
  markSearchRequest,
  reliabilityTelemetrySnapshot,
  saveGuestStaleTray,
  searchRequestTimeoutMs,
  withTimeout,
} from "@/lib/search/searchReliabilityGuardrails";
import { sparseExpansionQueriesForFetch } from "@/lib/search/sparseResultIntelligence";
import { scanControlledStackRegistry } from "@/lib/governance/controlledStackRegistry";
import { runUnifiedControlledStack } from "@/lib/governance/unifiedControlledStackKernel";
import {
  executeNormalizationStage,
  finalizeSearchNormalization,
  type NormalizationShadowTelemetry,
  type NormalizationTrayMeta,
} from "@/lib/intelligence/normalization";
import {
  buildIdentityFoundation,
  identityFoundationMetaForSearch,
} from "@/lib/intelligence/identity";
import {
  buildTrustTruthEngine,
  trustEngineMetaForSearch,
  snapshotTrustOrchestration,
} from "@/lib/intelligence/trust";
import {
  buildCommerceMemoryFoundation,
  commerceMemoryMetaForSearch,
  snapshotMemoryOrchestration,
} from "@/lib/intelligence/memory";
import {
  buildRecommendationCognition,
  recommendationCognitionMetaForSearch,
  snapshotRecommendationCognitionOrchestration,
} from "@/lib/intelligence/recommendationCognition";
import {
  buildAutonomousCommerceOs,
  autonomousCommerceOsMetaForSearch,
  snapshotAutonomousCommerceOrchestration,
} from "@/lib/intelligence/autonomousCommerce";
import {
  buildControlledActivation,
  controlledActivationMetaForSearch,
} from "@/lib/governance/controlledActivation";
import {
  buildCommerceEvolution,
  commerceEvolutionMetaForSearch,
  snapshotEvolutionOrchestration,
} from "@/lib/intelligence/commerceEvolution";
import {
  buildUnifiedCommerceBrain,
  commerceBrainMetaForSearch,
  snapshotBrainOrchestration,
} from "@/lib/intelligence/commerceBrain";
import {
  buildLiveAdaptiveCommerceSignals,
  liveCommerceSignalsMetaForSearch,
  snapshotLiveSignalOrchestration,
} from "@/lib/intelligence/liveAdaptiveCommerceSignals";
import {
  buildAutonomousCommerceIdentity,
  autonomousCommerceIdentityMetaForSearch,
  snapshotCommerceIdentityOrchestration,
} from "@/lib/intelligence/autonomousCommerceIdentity";
import {
  buildPredictiveCommerceIntent,
  predictiveCommerceIntentMetaForSearch,
  snapshotPredictiveIntentOrchestration,
} from "@/lib/intelligence/predictiveCommerceIntent";
import {
  buildAutonomousCommerceStrategy,
  autonomousCommerceStrategyMetaForSearch,
  snapshotStrategyOrchestration,
} from "@/lib/intelligence/autonomousCommerceStrategy";
import {
  buildUniversalCommerceIntelligence,
  universalCommerceIntelligenceMetaForSearch,
  snapshotUniversalOrchestration,
} from "@/lib/intelligence/universalCommerceIntelligence";
import {
  buildEmotionalCommerceIntelligence,
  emotionalCommerceIntelligenceMetaForSearch,
  snapshotEmotionalOrchestration,
} from "@/lib/intelligence/emotionalCommerceIntelligence";
import {
  buildAutonomousCommerceEvolution,
  autonomousCommerceEvolutionMetaForSearch,
  snapshotAutonomousEvolutionOrchestration,
} from "@/lib/intelligence/autonomousCommerceEvolution";
import { buildVerticalTasteShadowMeta } from "@/lib/taste/verticalTasteShadow";
import { buildFragranceTasteCanaryMeta } from "@/lib/taste/fragranceTasteApply";
import { buildFurnitureTasteCanaryMeta } from "@/lib/taste/furnitureTasteApply";
import { buildUnifiedTasteMeta } from "@/lib/taste/unifiedTasteIdentity";
import { buildUnifiedTasteCanaryMeta, buildUnifiedLiveSoakCanaryMeta } from "@/lib/taste/unifiedTasteApply";
import { isUnifiedTasteMetaEnabled } from "@/lib/taste/unifiedTasteFlags";
import { computeIntentIntelligence } from "@/lib/intent/intentIntelligenceEngine";
import { isIntentIntelligenceMetaEnabled } from "@/lib/intent/intentIntelligenceFlags";
import { buildIntentApplyMeta } from "@/lib/intent/intentApply";
import { buildIntentProductionApplyMeta } from "@/lib/intent/intentProductionApply";
import { buildIntentObservabilityMeta } from "@/lib/intent/intentObservability";
import {
  buildIntentCanaryMeta,
  getIntentCanarySessionKey,
  resolveIntentCanarySessionKey,
  setIntentCanarySessionKey,
} from "@/lib/intent/intentCanaryController";
import { buildIntentEvaluationMeta } from "@/lib/intent/intentEvaluationEngine";
import { buildIntentOptimizationMeta } from "@/lib/intent/intentOptimizationEngine";
import { buildIntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import { buildIntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import { buildWatchTasteCanaryMeta } from "@/lib/taste/watchTasteApply";
import { TASTE_GRAMMAR_PIPELINE_CACHE_KEY } from "@/lib/taste/verticalTasteFlags";
import { buildDegradedTrayNotice, buildEmptyTrayExplanation } from "@/lib/search/trayDiagnostics";
import { logSearchEvent } from "@/lib/log/productionLog";
import type { DealClusterDTO } from "@/lib/deals/types";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { SearchEntitlementsDTO } from "@/lib/subscription/entitlements";
import type { QuantProduct } from "@/lib/shoppingScore";
import { fetchShoppingProductsDeduped } from "./lib/fetchShoppingDeduped";
import { fetchShoppingProducts } from "./lib/fetchShopping";

const SEARCH_UPSTREAM_PREFIX = "__SEARCH_UPSTREAM__:";

function fallbackLiveDiscoveryMeta(
  products: QuantProduct[],
  status: LiveCommerceDiscoveryMeta["status"],
  error?: unknown
): LiveCommerceDiscoveryMeta {
  return {
    version: 1,
    status,
    discoveryEnabled: false,
    discoveryMode: "disabled",
    discoveryStatus: status,
    discoveryCandidates: 0,
    candidateCount: 0,
    candidateMerchants: [],
    attemptedQueries: [],
    externalRows: 0,
    externalRowsAccepted: 0,
    validatedExternalRows: 0,
    validatedMerchantCount: 0,
    rejectedDiscoveryRows: 0,
    fusedRows: products.length,
    timedOut: false,
    timeoutTriggered: false,
    source: status === "disabled_missing_key" ? "disabled_missing_key" : "disabled",
    unknownCategoryMode: false,
    identityGatePassed: 0,
    exactMatchPassed: 0,
    discoveryLatency: 0,
    fusionConfidence: 0,
    maxDiscoveryRows: 0,
    maxDiscoveryMerchants: 0,
    timeoutMs: 0,
    discoveryHealthScore: 0,
    upstreamReliabilityScore: 0,
    successfulQueries: 0,
    failedQueries: 0,
    retriesAttempted: 0,
    fallbackQueriesAttempted: 0,
    partialRecovery: false,
    recoveredFromFallback: false,
    upstreamFailures: [],
    merchantReliability: [],
    refreshLatencyMs: 0,
    primaryQueriesAttempted: 0,
    duplicateQueriesSuppressed: 0,
    fallbackConfidenceScore: 0,
    marketBreadthTarget: 0,
    marketRowsPreserved: products.length,
    merchantDiversityScore: 0,
    priceSpreadRatio: 0,
    ...(error
      ? { error: error instanceof Error ? error.message : "Live discovery failed." }
      : {}),
  };
}

async function runSafeLiveCommerceDiscovery(
  query: string,
  internalProducts: QuantProduct[],
  canonicalQuery?: CanonicalQueryContract
) {
  try {
    return await runLiveCommerceDiscovery(query, internalProducts, canonicalQuery);
  } catch (error) {
    console.error("[QuantAI:live-discovery] Falling back to internal results", error);
    return {
      products: internalProducts,
      candidates: [],
      meta: fallbackLiveDiscoveryMeta(internalProducts, "failed", error),
    };
  }
}

async function runSearchPipeline(query: string): Promise<{
  products: QuantProduct[];
  dealClusters: DealClusterDTO[];
  searchIntelligence: SearchIntelligenceDTO | null;
  commerceMeta: SearchCommerceAIMeta;
  liveDiscovery: LiveCommerceDiscoveryMeta;
  canonicalQuery: CanonicalQueryContract;
}> {
  applyBetaDiscoveryDefaults();
  const canonicalQuery = buildQueryIntelligence(query).canonicalQuery;
  const result = await fetchShoppingProductsWithFallback(query, canonicalQuery);
  if (!result.ok) {
    const status =
      result.status >= 400 && result.status < 600 ? result.status : 502;
    throw new Error(
      `${SEARCH_UPSTREAM_PREFIX}${status}:${result.error || "Search upstream failed."}`
    );
  }
  const liveDiscovery = await runSafeLiveCommerceDiscovery(query, result.products, canonicalQuery);
  let products = enrichProductsWithIntelligence(liveDiscovery.products, query, canonicalQuery);
  if (products.length === 0 && liveDiscovery.products.length > 0) {
    products = liveDiscovery.products.slice(0, 24).map((p, i) => ({ ...p, qiRank: i }));
  }
  const layered = await attachCommerceAiLayer(products, query);
  products = layered.products;
  const dealClusters = buildDealClusters(products);
  const searchIntelligence = buildSearchIntelligence(query, products, dealClusters);
  return {
    products,
    dealClusters,
    searchIntelligence,
    commerceMeta: layered.commerceMeta,
    liveDiscovery: liveDiscovery.meta,
    canonicalQuery,
  };
}

async function fetchShoppingProductsWithFallback(
  query: string,
  canonicalQuery: CanonicalQueryContract
) {
  const primary = await fetchShoppingProductsDeduped(query, canonicalQuery);

  const semanticFallback = canonicalQuery.semantic.semanticKeywords
    .slice(0, 6)
    .join(" ");
  const normalizedEnvelope = `${canonicalQuery.normalizedQuery} ${canonicalQuery.semantic.envelope}`.toLowerCase();
  const productSpecificFallback =
    /\b(robot vacuum|robotstofzuiger|stofzuiger robot|roborock|irobot)\b/i.test(normalizedEnvelope)
      ? "robot vacuum robotstofzuiger roborock irobot"
      : /\b(ps5|dualsense|playstation controller)\b/i.test(normalizedEnvelope)
        ? "ps5 dualsense wireless controller"
        : "";
  const categoryFallback =
    canonicalQuery.category === "furniture"
      ? "corner sofa hoekbank couch living room"
      : canonicalQuery.category === "fragrance"
        ? "designer perfume eau de parfum yves saint laurent libre"
        : canonicalQuery.category === "beauty"
          ? "skincare serum beauty"
          : canonicalQuery.category === "home"
            ? "home appliance household"
            : canonicalQuery.category === "electronics"
              ? "electronics device"
              : canonicalQuery.productType !== "unknown"
                ? canonicalQuery.productType
                : "";
  const fallbackQueries = [
    [canonicalQuery.brand, canonicalQuery.model, canonicalQuery.variant, canonicalQuery.productType !== "unknown" ? canonicalQuery.productType : ""]
      .filter(Boolean)
      .join(" "),
    productSpecificFallback,
    semanticFallback,
    categoryFallback,
    ...sparseExpansionQueriesForFetch(query, canonicalQuery),
    canonicalQuery.upstreamQuery,
    canonicalQuery.normalizedQuery,
    query,
  ];

  const primaryMin = searchPrimaryMinProducts();
  if (primary.ok && primary.products.length >= primaryMin) return primary;

  const merged = new Map<string, QuantProduct>();
  if (primary.ok) {
    for (const product of primary.products) merged.set(product.link || product.title, product);
  }
  const seen = new Set<string>();
  let fallbackAttempts = 0;
  const maxFallback = searchFallbackQueryCap();
  for (const fallbackQuery of fallbackQueries) {
    if (fallbackAttempts >= maxFallback) break;
    const q = fallbackQuery.replace(/\s+/g, " ").trim();
    const key = q.toLowerCase();
    if (!q || seen.has(key) || key === canonicalQuery.upstreamQuery.toLowerCase()) continue;
    seen.add(key);
    fallbackAttempts += 1;
    const recovered = await fetchShoppingProducts(q, { ...canonicalQuery, upstreamQuery: q });
    if (recovered.ok) {
      for (const product of recovered.products) {
        const productKey = product.link || `${product.store}:${product.title}:${product.price}`;
        if (!merged.has(productKey)) merged.set(productKey, product);
      }
      if (primary.ok && merged.size >= 18) {
        return { ok: true as const, products: [...merged.values()].slice(0, 60) };
      }
      if (!primary.ok && recovered.products.length >= 8) return recovered;
    }
  }
  if (primary.ok && merged.size > primary.products.length) {
    return { ok: true as const, products: [...merged.values()].slice(0, 60) };
  }
  return primary;
}

/** Cross-request tray cache — guest TTL longer for beta cold-path reduction. */
const getCachedAuthSearchPipeline = createAuthPipelineCache(
  runSearchPipeline,
  TASTE_GRAMMAR_PIPELINE_CACHE_KEY
);
const getCachedGuestSearchPipeline = createGuestPipelineCache(
  runSearchPipeline,
  TASTE_GRAMMAR_PIPELINE_CACHE_KEY
);

type SearchDataPayload = {
  products: QuantProduct[];
  dealClusters: DealClusterDTO[];
  meta: Record<string, unknown>;
  searchIntelligence: SearchIntelligenceDTO | null;
  entitlements?: SearchEntitlementsDTO;
};

function sourceCount(products: QuantProduct[]): number {
  return new Set(products.map((p) => p.store.trim().toLowerCase()).filter(Boolean)).size;
}

function searchDebugMeta(args: {
  products: QuantProduct[];
  liveDiscovery?: LiveCommerceDiscoveryMeta | null;
  canonicalQuery?: CanonicalQueryContract | null;
  fallbackReason?: string | null;
  errorState?: string | null;
  stageSuppression?: { stage: string; before: number; after: number; suppressed: number; durationMs?: number }[];
  searchLatencyMs?: number;
  operationalState?: Record<string, unknown> | null;
  latencyBudget?: Record<string, unknown> | null;
}): Record<string, unknown> {
  const {
    products,
    liveDiscovery = null,
    canonicalQuery = null,
    fallbackReason = null,
    errorState = null,
    stageSuppression = [],
    searchLatencyMs = 0,
    operationalState = null,
    latencyBudget = null,
  } = args;
  const identityDebug = canonicalQuery ? buildIdentityDebugSummary(products, canonicalQuery) : null;
  const commerceQualityDebug = buildCommerceQualityDebug(products);
  const buyingDecisionDebug = buildBuyingDecisionDebug(products);
  const marketComparison = canonicalQuery ? buildMarketComparisonSummary(products, canonicalQuery) : null;
  return {
    productCount: products.length,
    productsCount: products.length,
    sourceCount: sourceCount(products),
    fallbackReason,
    errorState,
    operationalState,
    guestDegraded: operationalState?.degraded === true,
    latencyBudget,
    liveDiscoveryStatus: liveDiscovery?.status ?? null,
    liveDiscoverySource: liveDiscovery?.source ?? null,
    discoveryEnabled: liveDiscovery?.discoveryEnabled ?? false,
    discoveryMode: liveDiscovery?.discoveryMode ?? "disabled",
    discoveryStatus: liveDiscovery?.discoveryStatus ?? liveDiscovery?.status ?? null,
    discoveryCandidates: liveDiscovery?.discoveryCandidates ?? liveDiscovery?.candidateCount ?? 0,
    validatedMerchantCount: liveDiscovery?.validatedMerchantCount ?? 0,
    rejectedDiscoveryRows: liveDiscovery?.rejectedDiscoveryRows ?? 0,
    timeoutTriggered: liveDiscovery?.timeoutTriggered ?? liveDiscovery?.timedOut ?? false,
    externalRowsAccepted: liveDiscovery?.externalRowsAccepted ?? liveDiscovery?.validatedExternalRows ?? 0,
    unknownCategoryMode: liveDiscovery?.unknownCategoryMode ?? false,
    identityGatePassed: liveDiscovery?.identityGatePassed ?? 0,
    exactMatchPassed: liveDiscovery?.exactMatchPassed ?? 0,
    discoveryLatency: liveDiscovery?.discoveryLatency ?? 0,
    fusionConfidence: liveDiscovery?.fusionConfidence ?? 0,
    discoveryHealthScore: liveDiscovery?.discoveryHealthScore ?? 0,
    upstreamReliabilityScore: liveDiscovery?.upstreamReliabilityScore ?? 0,
    successfulQueries: liveDiscovery?.successfulQueries ?? 0,
    failedQueries: liveDiscovery?.failedQueries ?? 0,
    retriesAttempted: liveDiscovery?.retriesAttempted ?? 0,
    fallbackQueriesAttempted: liveDiscovery?.fallbackQueriesAttempted ?? 0,
    partialRecovery: liveDiscovery?.partialRecovery ?? false,
    recoveredFromFallback: liveDiscovery?.recoveredFromFallback ?? false,
    upstreamFailures: liveDiscovery?.upstreamFailures ?? [],
    merchantReliability: liveDiscovery?.merchantReliability ?? [],
    refreshLatencyMs: liveDiscovery?.refreshLatencyMs ?? 0,
    primaryQueriesAttempted: liveDiscovery?.primaryQueriesAttempted ?? 0,
    duplicateQueriesSuppressed: liveDiscovery?.duplicateQueriesSuppressed ?? 0,
    fallbackConfidenceScore: liveDiscovery?.fallbackConfidenceScore ?? 0,
    marketBreadthTarget: liveDiscovery?.marketBreadthTarget ?? 0,
    marketRowsPreserved: liveDiscovery?.marketRowsPreserved ?? products.length,
    merchantDiversityScore: liveDiscovery?.merchantDiversityScore ?? 0,
    priceSpreadRatio: liveDiscovery?.priceSpreadRatio ?? 0,
    discoveryValidationTrace: liveDiscovery?.discoveryValidationTrace ?? null,
    stageSuppression,
    searchLatencyMs,
    productionReadiness: {
      jsonStable: true,
      liveDiscoveryConfigured: Boolean(process.env.SERPAPI_KEY),
      discoveryMode: liveDiscovery?.discoveryMode ?? "disabled",
      cacheTtlSeconds: 120,
      fallbackConfidenceScore: liveDiscovery?.fallbackConfidenceScore ?? 0,
      timeoutTriggered: liveDiscovery?.timeoutTriggered ?? false,
    },
    commerceQualityDebug,
    buyingDecisionDebug,
    marketComparison,
    canonicalQuery: canonicalQuery ? canonicalQueryForDebug(canonicalQuery) : null,
    identityDebug,
  };
}

function emptySearchData(meta?: Record<string, unknown>): Pick<SearchDataPayload, "products" | "dealClusters" | "meta"> {
  return { products: [], dealClusters: [], meta: meta ?? searchDebugMeta({ products: [], errorState: null }) };
}

function jsonSearch(
  body: Record<string, unknown>,
  init?: ResponseInit
): NextResponse {
  return NextResponse.json(body, { status: 200, ...init });
}

type SearchHandleOptions = {
  commerceMemory?: unknown;
  headers?: Headers;
};

async function optionalClerkSearchUser(): Promise<{
  userId: string | null;
  user: { publicMetadata?: Record<string, unknown> } | null;
}> {
  try {
    const { userId } = await auth();
    if (!userId) return { userId: null, user: null };
    try {
      const user = await currentUser();
      return { userId, user };
    } catch {
      return { userId, user: null };
    }
  } catch {
    return { userId: null, user: null };
  }
}

function requestIdentifier(headers?: Headers): string {
  const forwarded = headers?.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers?.get("x-real-ip")?.trim();
  const cfIp = headers?.get("cf-connecting-ip")?.trim();
  return cfIp || realIp || forwarded || "unknown";
}

async function handleSearch(
  q: string | null | undefined,
  opts?: SearchHandleOptions
): Promise<NextResponse> {
  const fail = (
    status: number,
    error: string,
    message: string,
    extras?: Record<string, unknown>
  ) =>
    jsonSearch(
      {
        success: false,
        error,
        message,
        data: emptySearchData(
          searchDebugMeta({
            products: [],
            fallbackReason: error,
            errorState: error,
          })
        ),
        ...extras,
      },
      { status }
    );

  try {
    markSearchRequest();
    const searchStarted = Date.now();
    const query = q?.trim();
    if (!query) {
      return fail(400, "BAD_REQUEST", "Missing query");
    }
    if (query.length > MAX_SEARCH_QUERY_LENGTH) {
      return fail(
        400,
        "BAD_REQUEST",
        `Query too long (max ${MAX_SEARCH_QUERY_LENGTH} characters).`
      );
    }

    const queryIntelligenceBundle = buildQueryIntelligence(query);
    const phase94QueryIntelligence = {
      meta: queryIntelligenceBundle.meta,
      canonicalQuery: queryIntelligenceBundle.canonicalQuery,
    };
    const shoppingBrain = queryIntelligenceBundle.shoppingBrain;
    const multiCategory = buildMultiCategoryIntelligence({
      query,
      shoppingBrain,
      queryIntelligence: queryIntelligenceBundle.meta,
    });
    const tasteIntelligence = buildTasteIntelligence({
      query,
      shoppingBrain,
      queryIntelligence: queryIntelligenceBundle.meta,
      multiCategory,
    });
    const lifestyleIntelligence = buildLifestyleIntelligence({
      query,
      shoppingBrain,
      queryIntelligence: queryIntelligenceBundle.meta,
      multiCategory,
      tasteIntelligence,
    });
    const contextIntelligence = buildContextIntelligence({
      query,
      shoppingBrain,
      queryIntelligence: queryIntelligenceBundle.meta,
      multiCategory,
      tasteIntelligence,
      lifestyleIntelligence,
    });
    const intentConfidence = buildIntentConfidence({
      query,
      shoppingBrain,
      multiCategory,
      tasteIntelligence,
      lifestyleIntelligence,
      contextIntelligence,
    });
    const memoryPreparation = buildMemoryPreparation({
      shoppingBrain,
      multiCategory,
      tasteIntelligence,
      lifestyleIntelligence,
      contextIntelligence,
      intentConfidence,
    });
    const buyerModel = buildUniversalBuyerModel({
      shoppingBrain,
      multiCategory,
      tasteIntelligence,
      lifestyleIntelligence,
      contextIntelligence,
      intentConfidence,
      memoryPreparation,
    });
    const buyerIntentVector = buildBuyerIntentVector({
      shoppingBrain,
      multiCategory,
      tasteIntelligence,
      lifestyleIntelligence,
      contextIntelligence,
      intentConfidence,
      memoryPreparation,
      buyerModel,
    });
    const shopperPsychology = buildShopperPsychology({
      shoppingBrain,
      multiCategory,
      tasteIntelligence,
      lifestyleIntelligence,
      contextIntelligence,
      intentConfidence,
      memoryPreparation,
      buyerModel,
      buyerIntentVector,
    });
    const decisionReadiness = buildDecisionReadiness({
      shoppingBrain,
      multiCategory,
      tasteIntelligence,
      lifestyleIntelligence,
      contextIntelligence,
      intentConfidence,
      memoryPreparation,
      buyerModel,
      buyerIntentVector,
      shopperPsychology,
    });
    const purchaseFriction = buildPurchaseFriction({
      shoppingBrain,
      multiCategory,
      tasteIntelligence,
      lifestyleIntelligence,
      contextIntelligence,
      intentConfidence,
      memoryPreparation,
      buyerModel,
      buyerIntentVector,
      shopperPsychology,
      decisionReadiness,
    });
    const conversionProbability = buildConversionProbability({
      shoppingBrain,
      multiCategory,
      tasteIntelligence,
      lifestyleIntelligence,
      contextIntelligence,
      intentConfidence,
      memoryPreparation,
      buyerModel,
      buyerIntentVector,
      shopperPsychology,
      decisionReadiness,
      purchaseFriction,
    });
    const dealSensitivity = buildDealSensitivity({
      query,
      shoppingBrain,
      multiCategory,
      tasteIntelligence,
      lifestyleIntelligence,
      contextIntelligence,
      intentConfidence,
      memoryPreparation,
      buyerModel,
      buyerIntentVector,
      shopperPsychology,
      decisionReadiness,
      purchaseFriction,
      conversionProbability,
    });
    const brandAffinity = buildBrandAffinity({
      query,
      buyerModel,
      buyerIntentVector,
      shopperPsychology,
      decisionReadiness,
      purchaseFriction,
      conversionProbability,
      dealSensitivity,
      tasteIntelligence,
      lifestyleIntelligence,
    });
    const productAttributeAffinity = buildProductAttributeAffinity({
      query,
      shoppingBrain,
      buyerModel,
      buyerIntentVector,
      shopperPsychology,
      contextIntelligence,
      tasteIntelligence,
      lifestyleIntelligence,
      brandAffinity,
    });
    const retailerTrust = buildRetailerTrust({
      query,
      buyerModel,
      shopperPsychology,
      contextIntelligence,
      intentConfidence,
      dealSensitivity,
      brandAffinity,
      productAttributeAffinity,
    });
    const reviewCredibility = buildReviewCredibility({
      query,
      buyerModel,
      shopperPsychology,
      contextIntelligence,
      intentConfidence,
      productAttributeAffinity,
      retailerTrust,
    });
    const realDiscount = buildRealDiscount({
      query,
      buyerModel,
      shopperPsychology,
      dealSensitivity,
      productAttributeAffinity,
      retailerTrust,
      reviewCredibility,
    });
    const valueIntelligence = buildValueIntelligence({
      query,
      buyerModel,
      shopperPsychology,
      dealSensitivity,
      productAttributeAffinity,
      retailerTrust,
      reviewCredibility,
      realDiscount,
    });
    const rankingPreparation = buildRankingPreparation({
      query,
      buyerModel,
      buyerIntentVector,
      shopperPsychology,
      intentConfidence,
      decisionReadiness,
      brandAffinity,
      productAttributeAffinity,
      retailerTrust,
      reviewCredibility,
      valueIntelligence,
    });
    const rankingSignals = aggregateRankingSignals({
      rankingPreparation,
      brandAffinity,
      productAttributeAffinity,
      reviewCredibility,
      retailerTrust,
      realDiscount,
      valueIntelligence,
    });
    const rankingEngine = buildDeterministicRanking(rankingSignals);
    const requestCanonicalQuery = queryIntelligenceBundle.canonicalQuery;
    const pipelineKey = normalizeSearchCacheKey(requestCanonicalQuery.normalizedQuery || query);

    const { userId, user } = await optionalClerkSearchUser();
    setIntentCanarySessionKey(
      resolveIntentCanarySessionKey({
        userId,
        requestId: requestIdentifier(opts?.headers),
        query,
      })
    );
    const tier = await resolveServerSubscriptionTier(userId, user);
    const plan = planDefinition(tier);

    let guestOperationalDegraded: Record<string, unknown> | null = null;

    let preloadedGuestTray: SearchPipelineTray | null = null;
    if (!userId) {
      const guestId = requestIdentifier(opts?.headers);
      const limited = await enforceGuestSearchLimits(guestId);
      if (!limited.ok) {
        try {
          const cachedTray = await loadPipelineWithInflightDedupe(`guest:${pipelineKey}`, () =>
            getCachedGuestSearchPipeline(pipelineKey)
          );
          if (cachedTray.products.length > 0) {
            guestOperationalDegraded = {
              degraded: true,
              reason: `guest_rate_limit_${limited.code.toLowerCase()}_cached_tray`,
              retryAfter: limited.retryAfter,
            };
            preloadedGuestTray = cachedTray;
          }
        } catch {
          // no cached tray — fall through to rate-limit response
        }
        if (!guestOperationalDegraded) {
          const staleTray = getGuestStaleTray(pipelineKey);
          if (staleTray?.products.length) {
            guestOperationalDegraded = {
              degraded: true,
              reason: `guest_rate_limit_${limited.code.toLowerCase()}_stale_tray`,
              retryAfter: limited.retryAfter,
              stale: true,
            };
            preloadedGuestTray = staleTray;
          }
        }
        if (!guestOperationalDegraded) {
          markRateLimited429({ servedDegraded: false, emptyOn429: true });
          return jsonSearch(
            {
              success: false,
              error: "RATE_LIMIT",
              message: limited.message,
              code: limited.code,
              data: emptySearchData(
                searchDebugMeta({
                  products: [],
                  canonicalQuery: requestCanonicalQuery,
                  fallbackReason: "RATE_LIMIT",
                  errorState: "RATE_LIMIT",
                  operationalState: {
                    degraded: true,
                    reason: limited.code,
                    retryAfter: limited.retryAfter,
                    telemetry: reliabilityTelemetrySnapshot(),
                  },
                })
              ),
              retryAfter: limited.retryAfter,
            },
            {
              status: 429,
              headers: { "Retry-After": String(limited.retryAfter) },
            }
          );
        }
        markRateLimited429({ servedDegraded: true, emptyOn429: false });
      }
    }

    if (userId) {
      const usedToday = await countSearchesTodayUtc(userId);
      if (usedToday !== null && usedToday >= plan.searchesPerDay) {
        return fail(
          429,
          "RATE_LIMIT",
          `Daily search limit reached (${plan.searchesPerDay}) for your plan. Upgrade for more.`,
          {
            code: "PLAN_SEARCH_LIMIT",
            entitlements: entitlementsForTier(tier),
          }
        );
      }

      const limited = await enforceAuthSearchLimits(userId);
      if (!limited.ok) {
        return jsonSearch(
          {
            success: false,
            error: "RATE_LIMIT",
            message: limited.message,
            code: limited.code,
            data: emptySearchData(),
            retryAfter: limited.retryAfter,
          },
          {
            status: 429,
            headers: { "Retry-After": String(limited.retryAfter) },
          }
        );
      }
    }

    let products!: QuantProduct[];
    let dealClusters!: DealClusterDTO[];
    let searchIntelligence!: SearchIntelligenceDTO | null;
    let commerceMeta!: SearchCommerceAIMeta;
    let liveDiscovery!: LiveCommerceDiscoveryMeta;
    const canonicalQuery: CanonicalQueryContract = requestCanonicalQuery;
    const pipelineTrace = new PipelineTrace();
    const controlledRegistry = scanControlledStackRegistry();
    const skipShadowStack = isProductionShadowStackDisabled();
    let normalizationMeta: NormalizationTrayMeta | null = null;
    let normalizationShadowPostSemantic: NormalizationShadowTelemetry | null = null;
    let normalizationShadowPostControlled: NormalizationShadowTelemetry | null = null;
    let normalizationResponseMeta: Record<string, unknown> = {};
    let identityFoundationResponseMeta: Record<string, unknown> = {};
    let trustEngineResponseMeta: Record<string, unknown> = {};
    let commerceMemoryResponseMeta: Record<string, unknown> = {};
    let recommendationCognitionResponseMeta: Record<string, unknown> = {};
    let autonomousCommerceOsResponseMeta: Record<string, unknown> = {};
    let controlledActivationResponseMeta: Record<string, unknown> = {};
    let commerceEvolutionResponseMeta: Record<string, unknown> = {};
    let commerceBrainResponseMeta: Record<string, unknown> = {};
    let liveCommerceSignalsResponseMeta: Record<string, unknown> = {};
    let autonomousCommerceIdentityResponseMeta: Record<string, unknown> = {};
    let predictiveCommerceIntentResponseMeta: Record<string, unknown> = {};
    let autonomousCommerceStrategyResponseMeta: Record<string, unknown> = {};
    let universalCommerceIntelligenceResponseMeta: Record<string, unknown> = {};
    let emotionalCommerceIntelligenceResponseMeta: Record<string, unknown> = {};
    let autonomousCommerceEvolutionResponseMeta: Record<string, unknown> = {};
    const traceStage = (stage: string, before: number, after: number) => {
      pipelineTrace.trace(stage, before, after);
    };
    const circuitKey = "search_pipeline";
    const loadPipelineTray = async () => {
      const isGuestPipeline = !userId;
      if (isCircuitOpen(circuitKey)) {
        throw new Error(`${SEARCH_UPSTREAM_PREFIX}503:Circuit breaker open for search pipeline.`);
      }
      const tray = await loadPipelineWithInflightDedupe(
        `${isGuestPipeline ? "guest" : "auth"}:${pipelineKey}`,
        () =>
          isGuestPipeline
            ? getCachedGuestSearchPipeline(pipelineKey)
            : getCachedAuthSearchPipeline(pipelineKey)
      );
      products = tray.products;
      dealClusters = tray.dealClusters;
      searchIntelligence = tray.searchIntelligence;
      commerceMeta = tray.commerceMeta;
      liveDiscovery = tray.liveDiscovery;
      markCircuitSuccess(circuitKey);
      if (isGuestPipeline) {
        saveGuestStaleTray(pipelineKey, tray);
      }
      traceStage("pipeline_enrichment_and_ai", liveDiscovery.fusedRows, products.length);
    };

    try {
      if (preloadedGuestTray) {
        products = preloadedGuestTray.products;
        dealClusters = preloadedGuestTray.dealClusters;
        searchIntelligence = preloadedGuestTray.searchIntelligence;
        commerceMeta = preloadedGuestTray.commerceMeta;
        liveDiscovery = preloadedGuestTray.liveDiscovery;
        traceStage("rate_limit_preloaded_recovery", 0, products.length);
      } else {
        await withTimeout("search_pipeline", searchRequestTimeoutMs(), loadPipelineTray);
      }
    } catch (e) {
      markCircuitFailure(circuitKey);
      const msg = e instanceof Error ? e.message : "";
      if (msg.startsWith(SEARCH_UPSTREAM_PREFIX)) {
        const rest = msg.slice(SEARCH_UPSTREAM_PREFIX.length);
        const colon = rest.indexOf(":");
        const statusRaw = colon >= 0 ? rest.slice(0, colon) : rest;
        const status = Number.parseInt(statusRaw, 10);
        const message = colon >= 0 ? rest.slice(colon + 1) : "Search upstream failed.";
        const httpStatus = Number.isFinite(status) && status >= 400 && status < 600 ? status : 502;
        logSearchEvent("upstream_fail", { status: httpStatus, message: message.slice(0, 120) });
        let recovered = false;
        try {
          const recoveryScope = userId ? "auth" : "guest";
          const cachedTray = await loadPipelineWithInflightDedupe(`${recoveryScope}:${pipelineKey}`, () =>
            userId
              ? getCachedAuthSearchPipeline(pipelineKey)
              : getCachedGuestSearchPipeline(pipelineKey)
          );
          if (cachedTray.products.length > 0) {
            products = cachedTray.products;
            dealClusters = cachedTray.dealClusters;
            searchIntelligence = cachedTray.searchIntelligence;
            commerceMeta = cachedTray.commerceMeta;
            liveDiscovery = cachedTray.liveDiscovery;
            guestOperationalDegraded = {
              degraded: true,
              reason: "upstream_fail_cached_tray",
              upstreamStatus: httpStatus,
            };
            traceStage("upstream_fail_cached_recovery", 0, products.length);
            recovered = true;
          }
        } catch {
          recovered = false;
        }
        if (!recovered && !userId) {
          const staleTray = getGuestStaleTray(pipelineKey);
          if (staleTray?.products.length) {
            products = staleTray.products;
            dealClusters = staleTray.dealClusters;
            searchIntelligence = staleTray.searchIntelligence;
            commerceMeta = staleTray.commerceMeta;
            liveDiscovery = staleTray.liveDiscovery;
            guestOperationalDegraded = {
              degraded: true,
              reason: "upstream_fail_stale_tray",
              upstreamStatus: httpStatus,
              stale: true,
            };
            traceStage("upstream_fail_stale_recovery", 0, products.length);
            recovered = true;
          }
        }
        if (!recovered) {
          return fail(httpStatus, "SEARCH_FAILED", message || "Search upstream failed.", {
            data: emptySearchData(
              searchDebugMeta({
                products: [],
                canonicalQuery: requestCanonicalQuery,
                fallbackReason: "SEARCH_FAILED",
                errorState: "SEARCH_FAILED",
                operationalState: { degraded: true, reason: "upstream_fail_empty" },
              })
            ),
          });
        }
      } else {
        const timeoutErr =
          e &&
          typeof e === "object" &&
          "code" in e &&
          (e as { code?: string }).code === "SEARCH_PIPELINE_TIMEOUT";
        if (timeoutErr && !userId) {
          const staleTray = getGuestStaleTray(pipelineKey);
          if (staleTray?.products.length) {
            products = staleTray.products;
            dealClusters = staleTray.dealClusters;
            searchIntelligence = staleTray.searchIntelligence;
            commerceMeta = staleTray.commerceMeta;
            liveDiscovery = staleTray.liveDiscovery;
            guestOperationalDegraded = {
              degraded: true,
              reason: "pipeline_timeout_stale_tray",
              stale: true,
              timeoutMs: searchRequestTimeoutMs(),
            };
            traceStage("pipeline_timeout_stale_recovery", 0, products.length);
          } else {
            return fail(504, "SEARCH_TIMEOUT", "Search timed out and no fallback tray was available.", {
              data: emptySearchData(
                searchDebugMeta({
                  products: [],
                  canonicalQuery: requestCanonicalQuery,
                  fallbackReason: "SEARCH_TIMEOUT",
                  errorState: "SEARCH_TIMEOUT",
                })
              ),
            });
          }
        } else {
        return fail(
          500,
          "SEARCH_FAILED",
          e instanceof Error ? e.message : "Search could not complete.",
          {
            data: emptySearchData(
              searchDebugMeta({
                products: [],
                canonicalQuery: requestCanonicalQuery,
                fallbackReason: "SEARCH_FAILED",
                errorState: "SEARCH_FAILED",
              })
            ),
          }
        );
        }
      }
    }

    const intents = canonicalQuery.commerceIntents;
    let stageBefore = products.length;
    products = applyPredictiveCommerceToTray(products, query, intents);
    traceStage("predictive_ranking", stageBefore, products.length);
    const shopperPersona = detectShopperPersonas(query, intents);
    const prevCommerceMemory = safeParseCommerceSessionMemory(opts?.commerceMemory);
    const tasteTagIds = tasteTagListForApi(intents.taste);
    const commerceSessionMemory = mergeCommerceSessionMemory(
      prevCommerceMemory,
      query,
      products.slice(0, 20),
      shopperPersona,
      tasteTagIds
    );
    stageBefore = products.length;
    products = applyPersonaRanking(products, shopperPersona, commerceSessionMemory);
    traceStage("persona_ranking", stageBefore, products.length);
    stageBefore = products.length;
    products = applyMarketAwarenessRanking(products, query);
    traceStage("market_awareness_ranking", stageBefore, products.length);
    const preIdentityGateProducts = products;
    products = applyHardIdentityGate(products, canonicalQuery);
    traceStage("hard_identity_gate", preIdentityGateProducts.length, products.length);
    if (products.length === 0 && preIdentityGateProducts.length > 0) {
      products = recoverSafeIdentityBreadth(preIdentityGateProducts, canonicalQuery);
      traceStage("safe_identity_breadth_recovery", 0, products.length);
    }
    const preSemanticProducts = products;
    const preTasteTrayLinks =
      canonicalQuery.category === "watch" || canonicalQuery.category === "fragrance"
        ? products.slice(0, 12).map((p) => p.link || p.title)
        : [];
    products = semanticRerankSearchResults(products, query, canonicalQuery);
    traceStage("semantic_rerank", preSemanticProducts.length, products.length);
    const normPostSemantic = executeNormalizationStage({
      products,
      query,
      stage: "post_semantic",
    });
    products = normPostSemantic.products;
    normalizationMeta = normPostSemantic.meta;
    normalizationShadowPostSemantic = normPostSemantic.shadowTelemetry;
    traceStage(
      "normalization_post_semantic",
      normPostSemantic.meta.inputCount,
      normPostSemantic.meta.outputCount
    );
    if (products.length === 0 && preSemanticProducts.length > 0) {
      products = preSemanticProducts.map((p, i) => ({ ...p, qiRank: i }));
      traceStage("semantic_empty_guard", 0, products.length);
    }
    stageBefore = products.length;
    products = buildCommerceQualityLayer(products, query, canonicalQuery);
    traceStage("final_commerce_quality_order", stageBefore, products.length);
    stageBefore = products.length;
    products = buildBuyingDecisionLayer(products, query, canonicalQuery);
    traceStage("buying_decision_order", stageBefore, products.length);
    stageBefore = products.length;
    products = applyMerchantDiversitySafeguard(products);
    traceStage("merchant_diversity_safeguard", stageBefore, products.length);

    const { topCategory } = memoryPatchFromSearch(query);

    if (userId) {
      void recordSearchHistory(userId, query, products.length);
      void mergeRecommendationMemory(userId, query, topCategory, shopperPersona.labels);
    }

    const tasteGrammarShadow = buildVerticalTasteShadowMeta({
      query,
      canonicalQuery,
      products,
    });
    const tasteWatchCanary = buildWatchTasteCanaryMeta({
      query,
      canonicalQuery,
      products,
      preOrderLinks: canonicalQuery.category === "watch" ? preTasteTrayLinks : [],
    });
    const tasteFragranceCanary = buildFragranceTasteCanaryMeta({
      query,
      canonicalQuery,
      products,
      preOrderLinks: canonicalQuery.category === "fragrance" ? preTasteTrayLinks : [],
    });
    const tasteFurnitureCanary = buildFurnitureTasteCanaryMeta({
      query,
      canonicalQuery,
      products,
      preOrderLinks:
        canonicalQuery.category === "furniture" || canonicalQuery.category === "desk_setup"
          ? preTasteTrayLinks
          : [],
    });
    const unifiedTaste = isUnifiedTasteMetaEnabled()
      ? buildUnifiedTasteMeta({
          query,
          canonicalQuery,
          products,
          tasteGrammarShadow,
        })
      : {
          version: "unified-taste-v1" as const,
          active: false,
          applyEnabled: false,
          identity: null,
          confidence: 0,
          coherenceScore: 0,
          crossVerticalAlignment: 0,
          prestigeIntegrity: 1,
          boundedInfluenceMax: 4,
          verticalLane: null,
          verticalLanes: {},
          latencyMs: 0,
          skippedReason: "unified_meta_disabled",
        };
    const tasteUnifiedCanary = buildUnifiedTasteCanaryMeta({
      query,
      canonicalQuery,
      products,
      tasteGrammarShadow,
      preOrderLinks: preTasteTrayLinks,
    });
    const unifiedTasteCanary = buildUnifiedLiveSoakCanaryMeta({
      query,
      canonicalQuery,
      products,
      tasteGrammarShadow,
      preOrderLinks: preTasteTrayLinks,
    });
    const intentIntelligence = isIntentIntelligenceMetaEnabled()
      ? computeIntentIntelligence({ query, canonicalQuery })
      : {
          version: "intent-intelligence-v1" as const,
          active: false,
          confidence: 0,
          detectedIntents: {
            product: { active: false, strength: 0, labels: [], productType: null, brand: null, model: null, variant: null },
            category: { active: false, strength: 0, labels: [], category: "unknown" as const, marketMode: "broad_discovery", primaryIntent: "general_search" },
            budget: { active: false, strength: 0, labels: [], maxPrice: null, qualityExpectation: "balanced", dealSeeking: false },
            taste: { active: false, strength: 0, labels: [], aestheticDirection: "neutral", styleIntents: [], unifiedQueryClass: null },
            trust: { active: false, strength: 0, labels: [], trustedOnly: false, riskAvoidance: false, authenticitySensitive: false, deliveryCare: false },
            urgencyComparison: { active: false, strength: 0, labels: [], urgency: false, comparison: false, alternativeSeeking: false, storeDealHunter: false },
            emotional: { active: false, strength: 0, labels: [], giftOriented: false, emotionalLanguage: [], safeBuyLanguage: false },
          },
          detectedIntentLabels: [],
          languageProfile: "unknown" as const,
          applyEnabled: false,
          skippedReason: "intent_intelligence_disabled",
          latencyMs: 0,
        };
    const intentApply = buildIntentApplyMeta({
      query,
      canonicalQuery,
      products,
      preOrderLinks: preTasteTrayLinks,
    });
    const intentProductionApply = buildIntentProductionApplyMeta({ intentApply });
    const intentObservability = buildIntentObservabilityMeta({
      query,
      canonicalQuery,
      intentIntelligence,
      intentApply,
      intentProductionApply,
      products,
      preOrderLinks: preTasteTrayLinks,
      rankingStable: true,
    });
    const intentCanary = buildIntentCanaryMeta({
      sessionKey: getIntentCanarySessionKey() ?? resolveIntentCanarySessionKey({ query }),
      observability: intentObservability,
    });
    const intentEvaluation = buildIntentEvaluationMeta({
      query,
      canonicalQuery,
      intentIntelligence,
      intentApply,
      intentProductionApply,
      intentObservability,
      intentCanary,
      products,
      preOrderLinks: preTasteTrayLinks,
      rankingStable: true,
    });
    const intentOptimization = buildIntentOptimizationMeta({
      evaluation: intentEvaluation,
    });
    const intentGovernance = buildIntentGovernanceMeta({
      evaluation: intentEvaluation,
      optimization: intentOptimization,
      observability: intentObservability,
      intentApply,
      productionApply: intentProductionApply,
      canary: intentCanary,
      products,
      rankingStable: true,
    });
    const intentCalibration = buildIntentCalibrationMeta({
      evaluation: intentEvaluation,
      governance: intentGovernance,
      observability: intentObservability,
      intentApply,
      productionApply: intentProductionApply,
      products,
      rankingStable: true,
    });
    const controlledStackResult = runUnifiedControlledStack({
      products,
      registry: controlledRegistry,
      intent: {
        query,
        canonicalQuery,
        intentIntelligence,
        intentApply,
        intentProductionApply,
        intentObservability,
        intentCanary,
        intentEvaluation,
        intentOptimization,
        intentGovernance,
        intentCalibration,
        rankingStable: true,
      },
    });
    products = controlledStackResult.products;
    const {
      intentRuntime,
      intentOrchestration,
      intentMemory,
      intentCoordination,
      intentFusion,
      adaptiveReasoning,
      decisionIntelligence,
      strategyIntelligence,
      marketIntelligence,
      behavioralCommerce,
      cognitionEngine,
      intentCognition,
      multiObjectiveCommerce,
      adaptiveStrategicRanking,
      memorylessCommerceLearning,
      marketRealityIntelligence,
      commerceDecisionIntelligence,
      autonomousCommerceReasoningGraph,
      unifiedCognitiveGovernance,
      economicWorldSimulation,
    } = controlledStackResult.metas;
    const controlledStackMs = controlledStackResult.latencyMs;
    const controlledStackOrchestration = controlledStackResult.orchestration;
    const controlledStackRankingMutation = controlledStackResult.rankingMutation;
    pipelineTrace.mark(
      controlledRegistry.fastPathEligible ? "controlled_stack_fast_path" : "controlled_stack",
      products.length,
      controlledStackMs
    );

    const trayArtifactsPostControlled = rebuildSearchTrayArtifacts(query, products);
    dealClusters = trayArtifactsPostControlled.dealClusters;
    searchIntelligence = trayArtifactsPostControlled.searchIntelligence;
    traceStage("tray_artifacts_rebuild", products.length, products.length);

    const searchLatencyMs = Date.now() - searchStarted;

    const normalizationFinal = finalizeSearchNormalization({
      products,
      query,
      searchLatencyMs,
      shadowPostSemantic: normalizationShadowPostSemantic,
      priorMeta: normalizationMeta,
    });
    products = normalizationFinal.products;
    normalizationMeta = normalizationFinal.meta;
    normalizationShadowPostControlled = normalizationFinal.shadowPostControlled;
    normalizationResponseMeta = normalizationFinal.responseMeta;
    traceStage(
      "normalization_post_controlled",
      normalizationFinal.meta.inputCount,
      normalizationFinal.meta.outputCount
    );

    if (!skipShadowStack) {
    const identityFoundationResult = buildIdentityFoundation({
      products,
      query,
      normalizationMeta,
    });
    identityFoundationResponseMeta = identityFoundationMetaForSearch(identityFoundationResult);
    traceStage(
      "identity_foundation",
      identityFoundationResult.meta.inputCount,
      identityFoundationResult.meta.canonicalProductCount
    );

    const trustTruthResult = buildTrustTruthEngine(
      {
        products,
        query,
        canonicalProducts: identityFoundationResult.canonicalProducts,
      },
      {
        orchestration: {
          query,
          identityFoundation: identityFoundationResult,
          normalizationMeta,
          controlledStackFastPath: controlledRegistry.fastPathEligible,
          controlledStackRankingMutation: controlledStackRankingMutation,
        },
      }
    );
    trustEngineResponseMeta = trustEngineMetaForSearch(
      trustTruthResult,
      snapshotTrustOrchestration({
        query,
        identityFoundation: identityFoundationResult,
        normalizationMeta,
        controlledStackFastPath: controlledRegistry.fastPathEligible,
        controlledStackRankingMutation: controlledStackRankingMutation,
      })
    );
    traceStage(
      "trust_engine",
      trustTruthResult.meta.inputCount,
      trustTruthResult.meta.offerIntelligenceCount
    );

    const commerceMemoryResult = buildCommerceMemoryFoundation(
      {
        products,
        query,
        canonicalProducts: identityFoundationResult.canonicalProducts,
        trustResult: trustTruthResult,
        sessionMemory: commerceSessionMemory,
      },
      {
        sessionMemory: commerceSessionMemory,
        orchestration: {
          query,
          identityFoundation: identityFoundationResult,
          trustResult: trustTruthResult,
          normalizationMeta,
          controlledStackFastPath: controlledRegistry.fastPathEligible,
          controlledStackRankingMutation: controlledStackRankingMutation,
        },
      }
    );
    commerceMemoryResponseMeta = commerceMemoryMetaForSearch(
      commerceMemoryResult,
      snapshotMemoryOrchestration({
        query,
        identityFoundation: identityFoundationResult,
        trustResult: trustTruthResult,
        normalizationMeta,
        controlledStackFastPath: controlledRegistry.fastPathEligible,
        controlledStackRankingMutation: controlledStackRankingMutation,
      })
    );
    traceStage(
      "commerce_memory",
      commerceMemoryResult.meta.inputCount,
      commerceMemoryResult.meta.memoryNodeCount
    );

    const recommendationCognitionResult = buildRecommendationCognition(
      {
        products,
        query,
        canonicalProducts: identityFoundationResult.canonicalProducts,
        trustResult: trustTruthResult,
        memoryResult: commerceMemoryResult,
        sessionMemory: commerceSessionMemory,
      },
      {
        sessionMemory: commerceSessionMemory,
        orchestration: {
          query,
          identityFoundation: identityFoundationResult,
          trustResult: trustTruthResult,
          memoryResult: commerceMemoryResult,
          normalizationMeta,
          controlledStackFastPath: controlledRegistry.fastPathEligible,
          controlledStackRankingMutation: controlledStackRankingMutation,
        },
      }
    );
    recommendationCognitionResponseMeta = recommendationCognitionMetaForSearch(
      recommendationCognitionResult,
      snapshotRecommendationCognitionOrchestration({
        query,
        identityFoundation: identityFoundationResult,
        trustResult: trustTruthResult,
        memoryResult: commerceMemoryResult,
        normalizationMeta,
        controlledStackFastPath: controlledRegistry.fastPathEligible,
        controlledStackRankingMutation: controlledStackRankingMutation,
      })
    );
    traceStage(
      "recommendation_cognition",
      recommendationCognitionResult.meta.inputCount,
      recommendationCognitionResult.meta.candidateCount
    );

    const autonomousCommerceOsResult = buildAutonomousCommerceOs(
      {
        products,
        query,
        canonicalProducts: identityFoundationResult.canonicalProducts,
        trustResult: trustTruthResult,
        memoryResult: commerceMemoryResult,
        recommendationResult: recommendationCognitionResult,
        sessionMemory: commerceSessionMemory,
      },
      {
        sessionMemory: commerceSessionMemory,
        orchestration: {
          query,
          identityFoundation: identityFoundationResult,
          trustResult: trustTruthResult,
          memoryResult: commerceMemoryResult,
          recommendationResult: recommendationCognitionResult,
          normalizationMeta,
          controlledStackFastPath: controlledRegistry.fastPathEligible,
          controlledStackRankingMutation: controlledStackRankingMutation,
        },
      }
    );
    autonomousCommerceOsResponseMeta = autonomousCommerceOsMetaForSearch(
      autonomousCommerceOsResult,
      snapshotAutonomousCommerceOrchestration({
        query,
        identityFoundation: identityFoundationResult,
        trustResult: trustTruthResult,
        memoryResult: commerceMemoryResult,
        recommendationResult: recommendationCognitionResult,
        normalizationMeta,
        controlledStackFastPath: controlledRegistry.fastPathEligible,
        controlledStackRankingMutation: controlledStackRankingMutation,
      })
    );
    traceStage(
      "autonomous_commerce_os",
      autonomousCommerceOsResult.meta.inputCount,
      autonomousCommerceOsResult.meta.graphNodeCount
    );

    const preControlledActivationLinks = products.map((p) => p.link);
    const activationSessionKey =
      resolveIntentCanarySessionKey({ query }) ?? `q:${normalizeSearchCacheKey(query)}`;
    const controlledActivationResult = buildControlledActivation({
      products,
      query,
      sessionKey: activationSessionKey,
      category: canonicalQuery.category ?? topCategory,
      preMutationLinks: preControlledActivationLinks,
      trustResult: trustTruthResult,
      memoryResult: commerceMemoryResult,
      recommendationResult: recommendationCognitionResult,
      commerceOsResult: autonomousCommerceOsResult,
      latencyBudgetOk: searchLatencyMs < 12_000,
    });
    products = controlledActivationResult.products;
    controlledActivationResponseMeta = controlledActivationMetaForSearch(
      controlledActivationResult
    );
    traceStage(
      "controlled_activation",
      products.length,
      controlledActivationResult.shadowMutation.candidateCount
    );

    const commerceEvolutionResult = buildCommerceEvolution(
      {
        products,
        query,
        sessionMemory: commerceSessionMemory,
        memoryResult: commerceMemoryResult,
        recommendationResult: recommendationCognitionResult,
        commerceOsResult: autonomousCommerceOsResult,
        activationResult: controlledActivationResult,
      },
      { sessionMemory: commerceSessionMemory }
    );
    commerceEvolutionResponseMeta = commerceEvolutionMetaForSearch(
      commerceEvolutionResult,
      snapshotEvolutionOrchestration({
        memoryResult: commerceMemoryResult,
        recommendationResult: recommendationCognitionResult,
        commerceOsResult: autonomousCommerceOsResult,
        activationResult: controlledActivationResult,
      })
    );
    traceStage(
      "commerce_evolution",
      commerceEvolutionResult.meta.inputCount,
      commerceEvolutionResult.meta.candidateCount
    );

    const commerceBrainResult = buildUnifiedCommerceBrain({
      products,
      query,
      identity: identityFoundationResult,
      trust: trustTruthResult,
      memory: commerceMemoryResult,
      recommendation: recommendationCognitionResult,
      commerceOs: autonomousCommerceOsResult,
      activation: controlledActivationResult,
      evolution: commerceEvolutionResult,
    });
    commerceBrainResponseMeta = commerceBrainMetaForSearch(
      commerceBrainResult,
      snapshotBrainOrchestration({
        identity: identityFoundationResult,
        trust: trustTruthResult,
        memory: commerceMemoryResult,
        recommendation: recommendationCognitionResult,
        commerceOs: autonomousCommerceOsResult,
        activation: controlledActivationResult,
        evolution: commerceEvolutionResult,
      })
    );
    traceStage(
      "commerce_brain",
      commerceBrainResult.meta.inputCount,
      commerceBrainResult.meta.fusedSignalCount
    );

    const liveCommerceSignalsResult = buildLiveAdaptiveCommerceSignals({
      products,
      query,
      trust: trustTruthResult,
      memory: commerceMemoryResult,
      commerceOs: autonomousCommerceOsResult,
      activation: controlledActivationResult,
      evolution: commerceEvolutionResult,
      brain: commerceBrainResult,
    });
    liveCommerceSignalsResponseMeta = liveCommerceSignalsMetaForSearch(
      liveCommerceSignalsResult,
      snapshotLiveSignalOrchestration({
        trust: trustTruthResult,
        commerceOs: autonomousCommerceOsResult,
        activation: controlledActivationResult,
        evolution: commerceEvolutionResult,
        brain: commerceBrainResult,
        identity: identityFoundationResult,
      })
    );
    traceStage(
      "live_commerce_signals",
      liveCommerceSignalsResult.meta.inputCount,
      liveCommerceSignalsResult.meta.fusedSignalCount
    );

    const autonomousCommerceIdentityResult = buildAutonomousCommerceIdentity(
      {
        products,
        query,
        sessionMemory: commerceSessionMemory,
        shopperPersona,
        identityFoundation: identityFoundationResult,
        trust: trustTruthResult,
        memory: commerceMemoryResult,
        evolution: commerceEvolutionResult,
        brain: commerceBrainResult,
        liveSignals: liveCommerceSignalsResult,
        activation: controlledActivationResult,
      },
      { sessionMemory: commerceSessionMemory }
    );
    autonomousCommerceIdentityResponseMeta = autonomousCommerceIdentityMetaForSearch(
      autonomousCommerceIdentityResult,
      snapshotCommerceIdentityOrchestration({
        identityFoundation: identityFoundationResult,
        memory: commerceMemoryResult,
        evolution: commerceEvolutionResult,
        brain: commerceBrainResult,
        liveSignals: liveCommerceSignalsResult,
        trust: trustTruthResult,
      })
    );
    traceStage(
      "autonomous_commerce_identity",
      autonomousCommerceIdentityResult.meta.inputCount,
      autonomousCommerceIdentityResult.meta.fusedAxisCount
    );

    const predictiveCommerceIntentResult = buildPredictiveCommerceIntent(
      {
        products,
        query,
        sessionMemory: commerceSessionMemory,
        shopperPersona,
        trust: trustTruthResult,
        evolution: commerceEvolutionResult,
        brain: commerceBrainResult,
        liveSignals: liveCommerceSignalsResult,
        commerceIdentity: autonomousCommerceIdentityResult,
        activation: controlledActivationResult,
      },
      { sessionMemory: commerceSessionMemory }
    );
    predictiveCommerceIntentResponseMeta = predictiveCommerceIntentMetaForSearch(
      predictiveCommerceIntentResult,
      snapshotPredictiveIntentOrchestration({
        evolution: commerceEvolutionResult,
        brain: commerceBrainResult,
        liveSignals: liveCommerceSignalsResult,
        commerceIdentity: autonomousCommerceIdentityResult,
      })
    );
    traceStage(
      "predictive_commerce_intent",
      predictiveCommerceIntentResult.meta.inputCount,
      predictiveCommerceIntentResult.meta.fusedAxisCount
    );

    const autonomousCommerceStrategyResult = buildAutonomousCommerceStrategy(
      {
        products,
        query,
        sessionMemory: commerceSessionMemory,
        shopperPersona,
        trust: trustTruthResult,
        commerceOs: autonomousCommerceOsResult,
        evolution: commerceEvolutionResult,
        brain: commerceBrainResult,
        liveSignals: liveCommerceSignalsResult,
        commerceIdentity: autonomousCommerceIdentityResult,
        predictiveIntent: predictiveCommerceIntentResult,
        activation: controlledActivationResult,
      },
      { sessionMemory: commerceSessionMemory }
    );
    autonomousCommerceStrategyResponseMeta = autonomousCommerceStrategyMetaForSearch(
      autonomousCommerceStrategyResult,
      snapshotStrategyOrchestration({
        commerceOs: autonomousCommerceOsResult,
        brain: commerceBrainResult,
        predictiveIntent: predictiveCommerceIntentResult,
        commerceIdentity: autonomousCommerceIdentityResult,
      })
    );
    traceStage(
      "autonomous_commerce_strategy",
      autonomousCommerceStrategyResult.meta.inputCount,
      autonomousCommerceStrategyResult.meta.fusedAxisCount
    );

    const universalCommerceIntelligenceResult = buildUniversalCommerceIntelligence({
      products,
      query,
      trust: trustTruthResult,
      commerceOs: autonomousCommerceOsResult,
      commerceIdentity: autonomousCommerceIdentityResult,
      predictiveIntent: predictiveCommerceIntentResult,
      commerceStrategy: autonomousCommerceStrategyResult,
      activation: controlledActivationResult,
    });
    universalCommerceIntelligenceResponseMeta = universalCommerceIntelligenceMetaForSearch(
      universalCommerceIntelligenceResult,
      snapshotUniversalOrchestration({
        commerceIdentity: autonomousCommerceIdentityResult,
        predictiveIntent: predictiveCommerceIntentResult,
        commerceStrategy: autonomousCommerceStrategyResult,
      })
    );
    traceStage(
      "universal_commerce_intelligence",
      universalCommerceIntelligenceResult.meta.inputCount,
      universalCommerceIntelligenceResult.meta.fusedAxisCount
    );

    const emotionalCommerceIntelligenceResult = buildEmotionalCommerceIntelligence({
      products,
      query,
      sessionMemory: commerceSessionMemory,
      shopperPersona,
      trust: trustTruthResult,
      memory: commerceMemoryResult,
      commerceIdentity: autonomousCommerceIdentityResult,
      universalCommerce: universalCommerceIntelligenceResult,
      commerceStrategy: autonomousCommerceStrategyResult,
      activation: controlledActivationResult,
    });
    emotionalCommerceIntelligenceResponseMeta = emotionalCommerceIntelligenceMetaForSearch(
      emotionalCommerceIntelligenceResult,
      snapshotEmotionalOrchestration({
        universalCommerce: universalCommerceIntelligenceResult,
        commerceStrategy: autonomousCommerceStrategyResult,
        commerceIdentity: autonomousCommerceIdentityResult,
      })
    );
    traceStage(
      "emotional_commerce_intelligence",
      emotionalCommerceIntelligenceResult.meta.inputCount,
      emotionalCommerceIntelligenceResult.meta.fusedAxisCount
    );

    const autonomousCommerceEvolutionResult = buildAutonomousCommerceEvolution({
      products,
      query,
      sessionMemory: commerceSessionMemory,
      trust: trustTruthResult,
      memory: commerceMemoryResult,
      commerceEvolution: commerceEvolutionResult,
      commerceIdentity: autonomousCommerceIdentityResult,
      universalCommerce: universalCommerceIntelligenceResult,
      commerceStrategy: autonomousCommerceStrategyResult,
      emotionalCommerce: emotionalCommerceIntelligenceResult,
      activation: controlledActivationResult,
    });
    autonomousCommerceEvolutionResponseMeta = autonomousCommerceEvolutionMetaForSearch(
      autonomousCommerceEvolutionResult,
      snapshotAutonomousEvolutionOrchestration({
        commerceEvolution: commerceEvolutionResult,
        universalCommerce: universalCommerceIntelligenceResult,
        emotionalCommerce: emotionalCommerceIntelligenceResult,
      })
    );
    traceStage(
      "autonomous_commerce_evolution",
      autonomousCommerceEvolutionResult.meta.inputCount,
      autonomousCommerceEvolutionResult.meta.fusedAxisCount
    );

    const trayArtifactsFinal = rebuildSearchTrayArtifacts(query, products);
    dealClusters = trayArtifactsFinal.dealClusters;
    searchIntelligence = trayArtifactsFinal.searchIntelligence;
    } else {
      traceStage("shadow_stack_skipped", products.length, products.length);
    }

    stageBefore = products.length;
    products = applyMerchantDiversitySafeguard(products);
    traceStage("merchant_diversity_final", stageBefore, products.length);

    stageBefore = products.length;
    const intelligenceUpgrade = applySearchIntelligenceUpgrade(products, query, canonicalQuery);
    products = intelligenceUpgrade.products;
    traceStage("search_intelligence_upgrade", stageBefore, products.length);

    stageBefore = products.length;
    const phase92Integrity = applyPhase92TrayIntegrity(
      products,
      query,
      intelligenceUpgrade.meta.extractedIntent,
      canonicalQuery
    );
    products = phase92Integrity.products;
    traceStage("phase92_tray_integrity", stageBefore, products.length);

    const phase93TrustDiscount = applyPhase93TrustDiscountHardening(products, query, {
      decisionBrief: intelligenceUpgrade.meta.decisionBrief,
      baseDiscount: intelligenceUpgrade.meta.discountIntelligence,
    });
    products = phase93TrustDiscount.products;
    traceStage("phase93_trust_discount", products.length, products.length);

    const phase95CommerceMemory = applyPhase95CommerceMemory(products, query, {
      canonicalQuery,
      sessionMemory: commerceSessionMemory,
      queryIntelligence: phase94QueryIntelligence.meta,
      intent: intelligenceUpgrade.meta.extractedIntent,
      decisionBrief: phase93TrustDiscount.decisionBrief,
    });
    products = phase95CommerceMemory.products;
    traceStage("phase95_commerce_memory", products.length, products.length);

    const verdictIntelligence = applyVerdictIntelligence({
      query,
      products,
      decisionBrief: phase95CommerceMemory.decisionBrief,
      phase93: phase93TrustDiscount.meta,
      phase92: phase92Integrity.meta,
      queryIntelligence: phase94QueryIntelligence.meta,
      commerceMemory: phase95CommerceMemory.meta,
      comparison: intelligenceUpgrade.meta.comparisonIntelligence,
      intent: intelligenceUpgrade.meta.extractedIntent,
      canonicalQuery,
      sparse: intelligenceUpgrade.meta.sparseResult,
      trustRanking: intelligenceUpgrade.meta.trustRanking,
    });
    traceStage("phase10_verdict_intelligence", products.length, products.length);

    const explainability = applyExplainabilityIntelligence({
      phase92: phase92Integrity.meta,
      phase93: phase93TrustDiscount.meta,
      queryIntelligence: phase94QueryIntelligence.meta,
      commerceMemory: phase95CommerceMemory.meta,
      verdictIntelligence: verdictIntelligence.meta,
      decisionBrief: verdictIntelligence.decisionBrief,
    });
    traceStage("phase101_explainability", products.length, products.length);

    const alternativeIntelligence = applyAlternativeIntelligence({
      products,
      decisionBrief: explainability.decisionBrief,
      phase93: phase93TrustDiscount.meta,
      comparison: intelligenceUpgrade.meta.comparisonIntelligence,
      queryIntelligence: phase94QueryIntelligence.meta,
      commerceMemory: phase95CommerceMemory.meta,
      verdictIntelligence: explainability.verdictIntelligence,
      explainability: explainability.meta,
    });
    traceStage("phase102_alternative_intelligence", products.length, products.length);

    const marketContextIntelligence = applyMarketContextIntelligence({
      products,
      decisionBrief: alternativeIntelligence.decisionBrief,
      phase93: phase93TrustDiscount.meta,
      sparse: intelligenceUpgrade.meta.sparseResult,
      verdictIntelligence: explainability.verdictIntelligence,
      explainability: explainability.meta,
      alternativeIntelligence: alternativeIntelligence.meta,
    });
    traceStage("phase103_market_context", products.length, products.length);

    const competitiveIntelligence = applyCompetitiveIntelligence({
      products,
      decisionBrief: marketContextIntelligence.decisionBrief,
      phase93: phase93TrustDiscount.meta,
      verdictIntelligence: explainability.verdictIntelligence,
      explainability: explainability.meta,
      alternativeIntelligence: alternativeIntelligence.meta,
      comparison: intelligenceUpgrade.meta.comparisonIntelligence,
      marketContext: marketContextIntelligence.meta,
    });
    traceStage("phase104_competitive_intelligence", products.length, products.length);

    const confidenceIntelligence = applyConfidenceIntelligence({
      products,
      decisionBrief: competitiveIntelligence.decisionBrief,
      phase92: phase92Integrity.meta,
      phase93: phase93TrustDiscount.meta,
      sparse: intelligenceUpgrade.meta.sparseResult,
      verdictIntelligence: explainability.verdictIntelligence,
      explainability: explainability.meta,
      alternativeIntelligence: alternativeIntelligence.meta,
      marketContext: marketContextIntelligence.meta,
      competitiveIntelligence: competitiveIntelligence.meta,
    });
    traceStage("phase105_confidence_intelligence", products.length, products.length);

    const intentAlignmentIntelligence = applyIntentAlignmentIntelligence({
      products,
      decisionBrief: confidenceIntelligence.decisionBrief,
      queryIntelligence: phase94QueryIntelligence.meta,
      commerceMemory: phase95CommerceMemory.meta,
      verdictIntelligence: explainability.verdictIntelligence,
      explainability: explainability.meta,
      alternativeIntelligence: alternativeIntelligence.meta,
      marketContext: marketContextIntelligence.meta,
      competitiveIntelligence: competitiveIntelligence.meta,
      confidenceIntelligence: confidenceIntelligence.meta,
    });
    traceStage("phase106_intent_alignment", products.length, products.length);

    const personalizationIntelligence = applyPersonalizationIntelligence({
      products,
      decisionBrief: intentAlignmentIntelligence.decisionBrief,
      queryIntelligence: phase94QueryIntelligence.meta,
      commerceMemory: phase95CommerceMemory.meta,
      verdictIntelligence: explainability.verdictIntelligence,
      explainability: explainability.meta,
      alternativeIntelligence: alternativeIntelligence.meta,
      marketContext: marketContextIntelligence.meta,
      competitiveIntelligence: competitiveIntelligence.meta,
      confidenceIntelligence: confidenceIntelligence.meta,
      intentAlignment: intentAlignmentIntelligence.meta,
    });
    traceStage("phase107_personalization", products.length, products.length);

    const retailerIntelligence = applyRetailerIntelligence({
      products,
      decisionBrief: personalizationIntelligence.decisionBrief,
      phase92: phase92Integrity.meta,
      phase93: phase93TrustDiscount.meta,
      sparse: intelligenceUpgrade.meta.sparseResult,
      verdictIntelligence: explainability.verdictIntelligence,
      explainability: explainability.meta,
      alternativeIntelligence: alternativeIntelligence.meta,
      marketContext: marketContextIntelligence.meta,
      competitiveIntelligence: competitiveIntelligence.meta,
      confidenceIntelligence: confidenceIntelligence.meta,
      intentAlignment: intentAlignmentIntelligence.meta,
      personalization: personalizationIntelligence.meta,
    });
    traceStage("phase108_retailer_intelligence", products.length, products.length);

    const dealIntelligence = applyDealIntelligence({
      products,
      decisionBrief: retailerIntelligence.decisionBrief,
      phase92: phase92Integrity.meta,
      phase93: phase93TrustDiscount.meta,
      sparse: intelligenceUpgrade.meta.sparseResult,
      verdictIntelligence: explainability.verdictIntelligence,
      explainability: explainability.meta,
      alternativeIntelligence: alternativeIntelligence.meta,
      marketContext: marketContextIntelligence.meta,
      competitiveIntelligence: competitiveIntelligence.meta,
      confidenceIntelligence: confidenceIntelligence.meta,
      intentAlignment: intentAlignmentIntelligence.meta,
      personalization: personalizationIntelligence.meta,
      retailerIntelligence: retailerIntelligence.meta,
    });
    traceStage("phase109_deal_intelligence", products.length, products.length);

    const commerceFusion = applyCommerceFusion({
      products,
      decisionBrief: dealIntelligence.decisionBrief,
      verdictIntelligence: explainability.verdictIntelligence,
      explainability: explainability.meta,
      alternativeIntelligence: alternativeIntelligence.meta,
      marketContext: marketContextIntelligence.meta,
      competitiveIntelligence: competitiveIntelligence.meta,
      confidenceIntelligence: confidenceIntelligence.meta,
      intentAlignment: intentAlignmentIntelligence.meta,
      personalization: personalizationIntelligence.meta,
      retailerIntelligence: retailerIntelligence.meta,
      dealIntelligence: dealIntelligence.meta,
    });
    traceStage("phase110_commerce_fusion", products.length, products.length);

    const decisionBriefBeforeActivation = applyDecisionReadinessToBrief(
      commerceFusion.decisionBrief,
      decisionReadiness
    );

    const productRanking = applyProductRanking({
      rankingEngine,
      products: products.map((product) => ({
        id: product.id,
        link: product.link,
        qiRank: product.qiRank,
      })),
    });
    const rankingExecution = prepareRankingExecution(productRanking);
    const controlledRanking = executeControlledRanking({
      rankingExecution,
      products,
    });
    products = controlledRanking.products;
    const executedRanking = controlledRanking.executedRanking;

    const decisionBrief = translateQuantAIIntelligence({
      decisionBrief: activateQuantAIIntelligence({
        decisionBrief: decisionBriefBeforeActivation,
        verdictIntelligence: explainability.verdictIntelligence,
        rankingEngine,
        executedRanking,
        valueIntelligence,
        retailerTrust,
        reviewCredibility,
        realDiscount,
        rankingPreparation,
        intentConfidence,
        decisionReadiness,
      }),
      verdictIntelligence: explainability.verdictIntelligence,
      rankingEngine,
      executedRanking,
      valueIntelligence,
      retailerTrust,
      reviewCredibility,
      realDiscount,
      rankingPreparation,
      intentConfidence,
      decisionReadiness,
    });

    const marketAwareness = computeMarketAwarenessForTray(query, products);
    const bundleSuggestions = buildBundleSuggestions(products.slice(0, 36), query, shopperPersona);
    const trayMetaCoherence = verifyTrayMetaCoherence(products, dealClusters);

    const fallbackReason = guestOperationalDegraded
      ? String(guestOperationalDegraded.reason ?? "operational_degraded")
      : liveDiscovery.status === "enabled"
        ? null
        : liveDiscovery.error || liveDiscovery.status;
    const stageSuppression = pipelineTrace.rowsSnapshot();
    const latencyBudget = buildLatencyBudgetReport(searchLatencyMs, stageSuppression);

    const debugMeta = searchDebugMeta({
      products,
      liveDiscovery,
      canonicalQuery,
      fallbackReason,
      errorState: null,
      stageSuppression,
      searchLatencyMs,
      operationalState: guestOperationalDegraded,
      latencyBudget,
    });

    const truthFoundationPrefetchMap = await prefetchTruthFoundationBatch(
      products.slice(0, 36).map((product) => ({
        product,
        listingUrl: product.link,
        searchQuery: query,
      }))
    );
    const truthFoundationPrefetch = serializeTruthFoundationPrefetch(truthFoundationPrefetchMap);

    const truthRankingRecords = new Map<string, import("@/lib/truth/rankingDecisionRecord").RankingDecisionRecord>();
    const traySlice = products.slice(0, 36);
    for (const product of traySlice) {
      const prefetch = truthFoundationPrefetchMap.get(product.link) ?? null;
      const trustDriven = computeTrustDrivenRankScore({
        product,
        list: traySlice,
        query,
        prefetch,
      });
      truthRankingRecords.set(product.link, trustDriven.record);
    }
    const truthRankingByLink = serializeTruthRankingByLink(truthRankingRecords);

    const data: SearchDataPayload = {
      products,
      dealClusters,
      searchIntelligence,
      entitlements: entitlementsForTier(tier),
      meta: {
        category: topCategory,
        intelligenceVersion: 13,
        predictiveCommerceVersion: 2,
        marketAwareness,
        commerceAI: commerceMeta,
        commerceAiEngine: resolveCommerceAiEngine(),
        universalCommerce: buildUniversalCommerceContext(query, intentMatchEnvelope(query)),
        canonicalQuery: canonicalQueryForDebug(canonicalQuery),
        queryIntelligence: phase94QueryIntelligence.meta,
        shoppingBrain,
        multiCategory,
        tasteIntelligence,
        lifestyleIntelligence,
        contextIntelligence,
        intentConfidence,
        memoryPreparation,
        buyerModel,
        buyerIntentVector,
        shopperPsychology,
        decisionReadiness,
        purchaseFriction,
        conversionProbability,
        dealSensitivity,
        brandAffinity,
        productAttributeAffinity,
        retailerTrust,
        reviewCredibility,
        realDiscount,
        valueIntelligence,
        rankingPreparation,
        rankingSignals,
        rankingEngine,
        productRanking,
        rankingExecution,
        executedRanking,
        decisionBrief,
        extractedIntent: intelligenceUpgrade.meta.extractedIntent,
        constraints: intelligenceUpgrade.meta.constraints,
        trustRanking: intelligenceUpgrade.meta.trustRanking,
        comparisonIntelligence: intelligenceUpgrade.meta.comparisonIntelligence,
        discountIntelligence: phase93TrustDiscount.meta.discountIntelligence,
        sparseResult: intelligenceUpgrade.meta.sparseResult,
        searchIntelligenceUpgrade: {
          version: intelligenceUpgrade.meta.version,
          rankingAdjustmentsApplied: intelligenceUpgrade.meta.rankingAdjustmentsApplied,
        },
        phase92TrayIntegrity: phase92Integrity.meta,
        phase93TrustDiscount: phase93TrustDiscount.meta,
        commerceMemory: phase95CommerceMemory.meta,
        verdictIntelligence: explainability.verdictIntelligence,
        explainability: explainability.meta,
        alternativeIntelligence: alternativeIntelligence.meta,
        marketContext: marketContextIntelligence.meta,
        competitiveIntelligence: competitiveIntelligence.meta,
        confidenceIntelligence: confidenceIntelligence.meta,
        intentAlignment: intentAlignmentIntelligence.meta,
        personalization: personalizationIntelligence.meta,
        retailerIntelligence: retailerIntelligence.meta,
        dealIntelligence: dealIntelligence.meta,
        commerceFusion: commerceFusion.meta,
        truthFoundationPrefetch,
        truthRankingByLink,
        identityDebug: debugMeta.identityDebug,
        liveDiscovery,
        liveDiscoveryStatus: liveDiscovery.status,
        discoveryEnabled: debugMeta.discoveryEnabled,
        discoveryMode: debugMeta.discoveryMode,
        discoveryStatus: debugMeta.discoveryStatus,
        discoveryCandidates: debugMeta.discoveryCandidates,
        validatedMerchantCount: debugMeta.validatedMerchantCount,
        rejectedDiscoveryRows: debugMeta.rejectedDiscoveryRows,
        timeoutTriggered: debugMeta.timeoutTriggered,
        externalRowsAccepted: debugMeta.externalRowsAccepted,
        unknownCategoryMode: debugMeta.unknownCategoryMode,
        identityGatePassed: debugMeta.identityGatePassed,
        exactMatchPassed: debugMeta.exactMatchPassed,
        discoveryLatency: debugMeta.discoveryLatency,
        fusionConfidence: debugMeta.fusionConfidence,
        discoveryHealthScore: debugMeta.discoveryHealthScore,
        upstreamReliabilityScore: debugMeta.upstreamReliabilityScore,
        successfulQueries: debugMeta.successfulQueries,
        failedQueries: debugMeta.failedQueries,
        retriesAttempted: debugMeta.retriesAttempted,
        fallbackQueriesAttempted: debugMeta.fallbackQueriesAttempted,
        partialRecovery: debugMeta.partialRecovery,
        recoveredFromFallback: debugMeta.recoveredFromFallback,
        upstreamFailures: debugMeta.upstreamFailures,
        merchantReliability: debugMeta.merchantReliability,
        refreshLatencyMs: debugMeta.refreshLatencyMs,
        primaryQueriesAttempted: debugMeta.primaryQueriesAttempted,
        duplicateQueriesSuppressed: debugMeta.duplicateQueriesSuppressed,
        fallbackConfidenceScore: debugMeta.fallbackConfidenceScore,
        marketBreadthTarget: debugMeta.marketBreadthTarget,
        marketRowsPreserved: debugMeta.marketRowsPreserved,
        merchantDiversityScore: debugMeta.merchantDiversityScore,
        priceSpreadRatio: debugMeta.priceSpreadRatio,
        discoveryValidationTrace: debugMeta.discoveryValidationTrace,
        stageSuppression: debugMeta.stageSuppression,
        searchLatencyMs: debugMeta.searchLatencyMs,
        productionReadiness: debugMeta.productionReadiness,
        commerceQualityDebug: debugMeta.commerceQualityDebug,
        buyingDecisionDebug: debugMeta.buyingDecisionDebug,
        marketComparison: debugMeta.marketComparison,
        buyingDecision: debugMeta.buyingDecisionDebug,
        localMarket: (debugMeta.marketComparison as { localMarket?: unknown } | null)?.localMarket ?? null,
        regionalCoverage: (debugMeta.marketComparison as { regionalCoverage?: unknown } | null)?.regionalCoverage ?? null,
        cheapestTrustedOffer: (debugMeta.marketComparison as { cheapestTrustedOffer?: unknown } | null)?.cheapestTrustedOffer ?? null,
        strongestValueOffer: (debugMeta.marketComparison as { strongestValueOffer?: unknown } | null)?.strongestValueOffer ?? null,
        highestConfidenceOffer: (debugMeta.marketComparison as { highestConfidenceOffer?: unknown } | null)?.highestConfidenceOffer ?? null,
        strongestDiscountOffer: (debugMeta.marketComparison as { strongestDiscountOffer?: unknown } | null)?.strongestDiscountOffer ?? null,
        premiumSellerOption: (debugMeta.marketComparison as { premiumSellerOption?: unknown } | null)?.premiumSellerOption ?? null,
        lowRiskOption: (debugMeta.marketComparison as { lowRiskOption?: unknown } | null)?.lowRiskOption ?? null,
        dealStrength: debugMeta.commerceQualityDebug,
        fakeDiscountRisk: debugMeta.commerceQualityDebug,
        buyTimingSignal: debugMeta.commerceQualityDebug,
        merchantTrustConfidence: debugMeta.commerceQualityDebug,
        valueScore: debugMeta.commerceQualityDebug,
        marketSpreadAnalysis: debugMeta.commerceQualityDebug,
        volatilitySignals: debugMeta.commerceQualityDebug,
        rankingReasonTrace: debugMeta.commerceQualityDebug,
        searchDebug: debugMeta,
        productCount: debugMeta.productCount,
        productsCount: debugMeta.productsCount,
        sourceCount: debugMeta.sourceCount,
        fallbackReason: debugMeta.fallbackReason,
        errorState: debugMeta.errorState,
        commerceSessionMemory,
        shopperPersona: {
          dominant: shopperPersona.dominant,
          labels: shopperPersona.labels,
          scores: shopperPersona.scores,
        },
        shopperPersonaSummary: `${shopperPersona.labels.join(" · ")} · session memory v${commerceSessionMemory.version} · interactions ${commerceSessionMemory.interactionCount}`,
        bundleSuggestions,
        trayExplanation:
          products.length === 0
            ? buildEmptyTrayExplanation({
                query,
                productCount: 0,
                stageSuppression,
                fallbackReason: debugMeta.fallbackReason as string | null,
                identityGatePassed: debugMeta.identityGatePassed as number | null,
                discoveryCandidates: debugMeta.discoveryCandidates as number | null,
                upstreamReliabilityScore: debugMeta.upstreamReliabilityScore as number | null,
              })
            : guestOperationalDegraded
              ? buildDegradedTrayNotice(String(guestOperationalDegraded.reason ?? ""))
              : null,
        operationalState: guestOperationalDegraded,
        reliability: {
          telemetry: reliabilityTelemetrySnapshot(),
          circuitBreaker: circuitSnapshot(circuitKey),
        },
        tasteGrammarShadow,
        tasteWatchCanary,
        tasteFragranceCanary,
        tasteFurnitureCanary,
        unifiedTaste,
        tasteUnifiedCanary,
        unifiedTasteCanary,
        intentIntelligence,
        intentApply,
        intentProductionApply,
        intentObservability,
        intentCanary,
        intentEvaluation,
        intentOptimization,
        intentGovernance,
        intentCalibration,
        intentRuntime,
        intentOrchestration,
        intentMemory,
        intentCoordination,
        intentFusion,
        adaptiveReasoning,
        decisionIntelligence,
        strategyIntelligence,
        marketIntelligence,
        behavioralCommerce,
        cognitionEngine,
        intentCognition,
        multiObjectiveCommerce,
        adaptiveStrategicRanking,
        memorylessCommerceLearning,
        marketRealityIntelligence,
        commerceDecisionIntelligence,
        autonomousCommerceReasoningGraph,
        unifiedCognitiveGovernance,
        economicWorldSimulation,
        controlledStack: {
          version: "phase3",
          fastPath: controlledRegistry.fastPathEligible,
          enabledLayerCount: controlledRegistry.enabledCount,
          enabledLayerIds: controlledRegistry.enabledLayerIds,
          latencyMs: controlledStackMs,
          rankingMutation: controlledStackRankingMutation,
          orchestration: controlledStackOrchestration,
        },
        normalizationStage1: {
          rankingMutation: false,
        },
        trayMetaCoherence,
        latencyBudget,
        ...normalizationResponseMeta,
        ...identityFoundationResponseMeta,
        ...trustEngineResponseMeta,
        ...commerceMemoryResponseMeta,
        ...recommendationCognitionResponseMeta,
        ...autonomousCommerceOsResponseMeta,
        ...controlledActivationResponseMeta,
        ...commerceEvolutionResponseMeta,
        ...commerceBrainResponseMeta,
        ...liveCommerceSignalsResponseMeta,
        ...autonomousCommerceIdentityResponseMeta,
        ...predictiveCommerceIntentResponseMeta,
        ...autonomousCommerceStrategyResponseMeta,
        ...universalCommerceIntelligenceResponseMeta,
        ...emotionalCommerceIntelligenceResponseMeta,
        ...autonomousCommerceEvolutionResponseMeta,
        normalizationShadowPostSemantic,
        normalizationShadowPostControlled,
      },
    };

    data.meta = composeProductionMeta({
      meta: data.meta,
      controlledStackFastPath: controlledRegistry.fastPathEligible,
    });
    data.meta.commerceMemory = phase95CommerceMemory.meta;

    logSearchEvent(products.length > 0 ? "success" : "empty", {
      queryLength: query.length,
      products: products.length,
      latencyMs: searchLatencyMs,
      suppressionStages: stageSuppression.length,
      ...(normalizationShadowPostControlled?.enabled
        ? {
            normalizationShadow: true,
            top3DuplicateRateBefore: normalizationShadowPostControlled.top3DuplicateRateBefore,
            projectedRankingLift: normalizationShadowPostControlled.projectedRankingLift,
            rolloutReadinessScore: normalizationShadowPostControlled.rolloutReadinessScore,
          }
        : {}),
    });

    return jsonSearch(
      { success: true, data },
      {
        headers: {
          "Cache-Control": "private, s-maxage=90, stale-while-revalidate=180",
          Vary: "Cookie",
        },
      }
    );
  } catch (e) {
    return fail(
      500,
      "SEARCH_FAILED",
      e instanceof Error ? e.message : "Search could not complete."
    );
  } finally {
    setIntentCanarySessionKey(null);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    return await handleSearch(q, { headers: req.headers });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: "SEARCH_FAILED",
        message: e instanceof Error ? e.message : "Search could not complete.",
        data: emptySearchData(
          searchDebugMeta({
            products: [],
            fallbackReason: "GET_FATAL",
            errorState: "SEARCH_FAILED",
          })
        ),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    let q: string | null = null;
    let commerceMemory: unknown;
    try {
      const body = (await req.json()) as { query?: string; q?: string; commerceMemory?: unknown };
      q = body.query ?? body.q ?? null;
      commerceMemory = body.commerceMemory;
    } catch {
      return NextResponse.json(
        {
          success: false,
          ok: false,
          error: "BAD_REQUEST",
          message: "Invalid JSON body",
          data: emptySearchData(
            searchDebugMeta({
              products: [],
              fallbackReason: "BAD_REQUEST",
              errorState: "BAD_REQUEST",
            })
          ),
          products: [],
          results: [],
        },
        { status: 400 }
      );
    }
    return await handleSearch(q, { commerceMemory, headers: req.headers });
  } catch (error) {
    console.error("[api/search] fatal", error);
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: "search_failed",
        message: error instanceof Error ? error.message : "Unknown search error",
        data: emptySearchData(
          searchDebugMeta({
            products: [],
            fallbackReason: "POST_FATAL",
            errorState: "search_failed",
          })
        ),
        products: [],
        results: [],
      },
      { status: 500 }
    );
  }
}
