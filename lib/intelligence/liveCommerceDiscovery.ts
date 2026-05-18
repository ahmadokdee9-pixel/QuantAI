/**
 * QuantAI Live Commerce Discovery Engine v1.
 * Expands, refreshes, fuses, dedupes, and live-ranks products before enrichment.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import { buildExternalMerchantCandidates, type ExternalMerchantCandidate } from "./externalMerchantSearch";
import { refreshLiveMarketProducts } from "./liveMarketRefresh";
import { mergeExternalAndInternalOffersWithoutEarlyCollapse } from "./productFeedFusion";
import { rankLiveDeals } from "./liveDealRanking";
import { assessUniversalListingIdentity } from "./universalListingIdentity";
import { assessIdentityGateDecision } from "./productIdentity";
import {
  discoveryReliabilitySnapshot,
  recordDiscoveryReliability,
  reliabilityPenaltyForMerchant,
  type MerchantReliabilitySnapshot,
} from "./discoveryReliability";

export type LiveCommerceDiscoveryMeta = {
  version: 1;
  status: "enabled" | "disabled" | "disabled_missing_key" | "failed";
  discoveryEnabled: boolean;
  discoveryMode: "universal" | "conservative" | "disabled";
  discoveryStatus: "enabled" | "disabled" | "disabled_missing_key" | "failed";
  discoveryCandidates: number;
  candidateCount: number;
  candidateMerchants: string[];
  attemptedQueries: string[];
  externalRows: number;
  externalRowsAccepted: number;
  validatedExternalRows: number;
  validatedMerchantCount: number;
  rejectedDiscoveryRows: number;
  fusedRows: number;
  timedOut: boolean;
  timeoutTriggered: boolean;
  source: "serpapi" | "disabled" | "disabled_missing_key" | "empty";
  unknownCategoryMode: boolean;
  identityGatePassed: number;
  exactMatchPassed: number;
  discoveryLatency: number;
  fusionConfidence: number;
  maxDiscoveryRows: number;
  maxDiscoveryMerchants: number;
  timeoutMs: number;
  discoveryHealthScore: number;
  upstreamReliabilityScore: number;
  successfulQueries: number;
  failedQueries: number;
  retriesAttempted: number;
  fallbackQueriesAttempted: number;
  partialRecovery: boolean;
  recoveredFromFallback: boolean;
  upstreamFailures: { query: string; status: number; error: string; attempt: number }[];
  merchantReliability: MerchantReliabilitySnapshot[];
  refreshLatencyMs: number;
  primaryQueriesAttempted: number;
  duplicateQueriesSuppressed: number;
  fallbackConfidenceScore: number;
  marketBreadthTarget: number;
  marketRowsPreserved: number;
  merchantDiversityScore: number;
  priceSpreadRatio: number;
  discoveryValidationTrace?: {
    marketMode: string;
    totalExternalRows: number;
    identityRejected: number;
    exactRejected: number;
    confidenceRejected: number;
    accepted: number;
    rejectionReasons: Record<string, number>;
  };
  error?: string;
};

export type LiveCommerceDiscoveryResult = {
  products: QuantProduct[];
  candidates: ExternalMerchantCandidate[];
  meta: LiveCommerceDiscoveryMeta;
};

function avg(nums: number[]): number {
  const clean = nums.filter((n) => Number.isFinite(n));
  if (!clean.length) return 0;
  return clean.reduce((sum, n) => sum + n, 0) / clean.length;
}

function discoveryModeFor(canonicalQuery?: CanonicalQueryContract): LiveCommerceDiscoveryMeta["discoveryMode"] {
  const configured = process.env.DISCOVERY_MODE?.trim().toLowerCase();
  if (configured === "universal" && canonicalQuery?.category !== "unknown") return "universal";
  return "conservative";
}

function envFlagEnabled(name: string, defaultValue: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return defaultValue;
  return !["0", "false", "off", "no"].includes(value);
}

function boundedEnvInt(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.round(raw)));
}

function rolloutControls(): { enabled: boolean; maxRows: number; maxMerchants: number; timeoutMs: number; maxAttemptedQueries: number } {
  const maxMerchants = boundedEnvInt("MAX_DISCOVERY_MERCHANTS", 48, 8, 96);
  const maxRows = boundedEnvInt("MAX_DISCOVERY_ROWS", 32, 4, 72);
  const timeoutMs = boundedEnvInt("DISCOVERY_TIMEOUT_MS", 6_500, 2_500, 11_000);
  return {
    enabled: envFlagEnabled("ENABLE_WIDE_DISCOVERY", true),
    maxRows,
    maxMerchants,
    timeoutMs,
    maxAttemptedQueries: boundedEnvInt("MAX_DISCOVERY_QUERIES", 4, 1, 6),
  };
}

function priceSpreadRatio(products: QuantProduct[]): number {
  const prices = products.map((p) => p.price).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (prices.length < 2) return 0;
  const low = prices[0]!;
  const high = prices[prices.length - 1]!;
  return Number(((high - low) / Math.max(1, low)).toFixed(2));
}

function merchantDiversityScore(products: QuantProduct[], target: number): number {
  const merchants = new Set(products.map((p) => p.store.trim().toLowerCase()).filter(Boolean));
  return Math.round(Math.min(100, (merchants.size / Math.max(1, target)) * 100));
}

function validateExternalRows(
  products: QuantProduct[],
  query: string,
  canonicalQuery: CanonicalQueryContract | undefined,
  mode: LiveCommerceDiscoveryMeta["discoveryMode"],
  maxRows: number
): {
  products: QuantProduct[];
  rejected: number;
  identityGatePassed: number;
  exactMatchPassed: number;
  fusionConfidence: number;
  trace: NonNullable<LiveCommerceDiscoveryMeta["discoveryValidationTrace"]>;
} {
  const unknownCategoryMode = !canonicalQuery || canonicalQuery.category === "unknown";
  const exactSkuMode = canonicalQuery?.marketMode === "exact_sku";
  const allowMarketFamily = !exactSkuMode;
  const accepted: QuantProduct[] = [];
  let identityGatePassed = 0;
  let exactMatchPassed = 0;
  let identityRejected = 0;
  let exactRejected = 0;
  let confidenceRejected = 0;
  const rejectionReasons: Record<string, number> = {};
  const confidences: number[] = [];

  for (const raw of products) {
    const product = raw.qiListingIdentity ? raw : { ...raw, qiListingIdentity: assessUniversalListingIdentity(raw, query) };
    const decision = assessIdentityGateDecision(product, canonicalQuery, {
      strictExternalDiscovery: true,
      unknownCategoryMode,
      allowMarketFamily,
    });
    const withGate = { ...product, qiIdentityGate: decision };
    if (!decision.identityGatePassed) {
      identityRejected += 1;
      const reason = decision.exclusionReason ?? "identity_rejected";
      rejectionReasons[reason] = (rejectionReasons[reason] ?? 0) + 1;
      continue;
    }
    identityGatePassed += 1;
    if (exactSkuMode && !decision.exactMatchPassed) {
      exactRejected += 1;
      rejectionReasons.exact_match_required = (rejectionReasons.exact_match_required ?? 0) + 1;
      continue;
    }
    const confidenceFloor = exactSkuMode ? 0.68 : unknownCategoryMode ? 0.58 : 0.32;
    if (mode === "conservative" && decision.fusionConfidence < confidenceFloor) {
      confidenceRejected += 1;
      rejectionReasons.low_fusion_confidence = (rejectionReasons.low_fusion_confidence ?? 0) + 1;
      continue;
    }
    if (decision.exactMatchPassed) exactMatchPassed += 1;
    confidences.push(decision.fusionConfidence);
    accepted.push(withGate);
    if (accepted.length >= maxRows) break;
  }

  return {
    products: accepted,
    rejected: Math.max(0, products.length - accepted.length),
    identityGatePassed,
    exactMatchPassed,
    fusionConfidence: Number(avg(confidences).toFixed(2)),
    trace: {
      marketMode: canonicalQuery?.marketMode ?? "unknown",
      totalExternalRows: products.length,
      identityRejected,
      exactRejected,
      confidenceRejected,
      accepted: accepted.length,
      rejectionReasons,
    },
  };
}

function isExternalDiscoveryRow(p: QuantProduct): boolean {
  return Array.isArray(p.extensions) && p.extensions.includes("Live market refresh");
}

function protectInternalTopResults(
  products: QuantProduct[],
  mode: LiveCommerceDiscoveryMeta["discoveryMode"]
): QuantProduct[] {
  if (mode !== "conservative" || products.length <= 1) return products;
  const maxExternalTop12 = 4;
  const head: QuantProduct[] = [];
  const delayed: QuantProduct[] = [];
  let externalInHead = 0;

  for (const product of products) {
    const external = isExternalDiscoveryRow(product);
    if (head.length < 12 && (!external || externalInHead < maxExternalTop12)) {
      head.push(product);
      if (external) externalInHead += 1;
    } else {
      delayed.push(product);
    }
  }
  return [...head, ...delayed].map((p, i) => ({ ...p, id: i + 1, qiRank: i }));
}

function selectCandidateFanout(candidates: ExternalMerchantCandidate[], maxMerchants: number): ExternalMerchantCandidate[] {
  const selected = new Map<string, ExternalMerchantCandidate>();
  const reliabilityRanked = [...candidates]
    .map((candidate) => ({
      candidate,
      adjustedQuality: (candidate.routeQuality ?? candidate.priority) - reliabilityPenaltyForMerchant(candidate.merchantKey),
    }))
    .sort((a, b) => b.adjustedQuality - a.adjustedQuality || a.candidate.label.localeCompare(b.candidate.label));
  for (const { candidate } of reliabilityRanked) {
    const prev = selected.get(candidate.merchantKey);
    if (
      !prev ||
      (candidate.directRoute && !prev.directRoute) ||
      (candidate.routeQuality ?? 0) > (prev.routeQuality ?? 0)
    ) {
      selected.set(candidate.merchantKey, candidate);
    }
    if (selected.size >= maxMerchants) break;
  }
  return Array.from(selected.values());
}

function discoveryHealthScore(args: {
  refreshSource: string;
  upstreamReliabilityScore: number;
  validatedRows: number;
  rejectedRows: number;
  timedOut: boolean;
  recoveredFromFallback: boolean;
}): number {
  if (args.refreshSource === "disabled" || args.refreshSource === "disabled_missing_key") return 0;
  const validationRatio = args.validatedRows / Math.max(1, args.validatedRows + args.rejectedRows);
  const score =
    args.upstreamReliabilityScore * 0.56 +
    validationRatio * 28 +
    (args.validatedRows > 0 ? 10 : 0) +
    (args.recoveredFromFallback ? 4 : 0) -
    (args.timedOut ? 18 : 0);
  return Math.round(Math.min(100, Math.max(0, score)));
}

export async function runLiveCommerceDiscovery(
  query: string,
  internalProducts: QuantProduct[],
  canonicalQuery?: CanonicalQueryContract
): Promise<LiveCommerceDiscoveryResult> {
  const started = Date.now();
  const mode = discoveryModeFor(canonicalQuery);
  const unknownCategoryMode = !canonicalQuery || canonicalQuery.category === "unknown";
  const controls = rolloutControls();
  if (!controls.enabled) {
    return {
      products: internalProducts,
      candidates: [],
      meta: {
        version: 1,
        status: "disabled",
        discoveryEnabled: false,
        discoveryMode: "disabled",
        discoveryStatus: "disabled",
        discoveryCandidates: 0,
        candidateCount: 0,
        candidateMerchants: [],
        attemptedQueries: [],
        externalRows: 0,
        externalRowsAccepted: 0,
        validatedExternalRows: 0,
        validatedMerchantCount: 0,
        rejectedDiscoveryRows: 0,
        fusedRows: internalProducts.length,
        timedOut: false,
        timeoutTriggered: false,
        source: "disabled",
        unknownCategoryMode,
        identityGatePassed: 0,
        exactMatchPassed: 0,
        discoveryLatency: Date.now() - started,
        fusionConfidence: 0,
        maxDiscoveryRows: controls.maxRows,
        maxDiscoveryMerchants: controls.maxMerchants,
        timeoutMs: controls.timeoutMs,
        discoveryHealthScore: 0,
        upstreamReliabilityScore: 0,
        successfulQueries: 0,
        failedQueries: 0,
        retriesAttempted: 0,
        fallbackQueriesAttempted: 0,
        partialRecovery: false,
        recoveredFromFallback: false,
        upstreamFailures: [],
        merchantReliability: discoveryReliabilitySnapshot([]),
        refreshLatencyMs: 0,
        primaryQueriesAttempted: 0,
        duplicateQueriesSuppressed: 0,
        fallbackConfidenceScore: 0,
        marketBreadthTarget: controls.maxRows,
        marketRowsPreserved: internalProducts.length,
        merchantDiversityScore: merchantDiversityScore(internalProducts, controls.maxMerchants),
        priceSpreadRatio: priceSpreadRatio(internalProducts),
        discoveryValidationTrace: {
          marketMode: canonicalQuery?.marketMode ?? "unknown",
          totalExternalRows: 0,
          identityRejected: 0,
          exactRejected: 0,
          confidenceRejected: 0,
          accepted: 0,
          rejectionReasons: {},
        },
      },
    };
  }
  const candidates = selectCandidateFanout(buildExternalMerchantCandidates(query, canonicalQuery), controls.maxMerchants);
  const refresh = await refreshLiveMarketProducts(query, candidates, canonicalQuery, {
    maxAttemptedQueries: controls.maxAttemptedQueries,
    timeoutMs: controls.timeoutMs,
  });
  const validated = validateExternalRows(refresh.products, query, canonicalQuery, mode, controls.maxRows);
  const merchantReliability = recordDiscoveryReliability({
    candidates,
    success: refresh.successfulQueries > 0,
    timedOut: refresh.timedOut,
  });
  const fused = mergeExternalAndInternalOffersWithoutEarlyCollapse({
    internal: internalProducts,
    external: validated.products,
    query,
    canonicalQuery,
  });
  const products = protectInternalTopResults(rankLiveDeals(fused, query), mode);
  const status = refresh.source === "disabled_missing_key" ? "disabled_missing_key" : refresh.source === "disabled" ? "disabled" : "enabled";
  const health = discoveryHealthScore({
    refreshSource: refresh.source,
    upstreamReliabilityScore: refresh.upstreamReliabilityScore,
    validatedRows: validated.products.length,
    rejectedRows: validated.rejected,
    timedOut: refresh.timedOut,
    recoveredFromFallback: refresh.recoveredFromFallback,
  });
  return {
    products,
    candidates,
    meta: {
      version: 1,
      status,
      discoveryEnabled: status === "enabled",
      discoveryMode: status === "enabled" ? mode : "disabled",
      discoveryStatus: status,
      discoveryCandidates: candidates.length,
      candidateCount: candidates.length,
      candidateMerchants: candidates.map((c) => c.label).slice(0, 80),
      attemptedQueries: refresh.attemptedQueries,
      externalRows: refresh.products.length,
      externalRowsAccepted: validated.products.length,
      validatedExternalRows: validated.products.length,
      validatedMerchantCount: new Set(validated.products.map((p) => p.store.trim().toLowerCase()).filter(Boolean)).size,
      rejectedDiscoveryRows: validated.rejected,
      fusedRows: products.length,
      timedOut: refresh.timedOut,
      timeoutTriggered: refresh.timedOut || Date.now() - started >= controls.timeoutMs + 750,
      source: refresh.source,
      unknownCategoryMode,
      identityGatePassed: validated.identityGatePassed,
      exactMatchPassed: validated.exactMatchPassed,
      discoveryLatency: Date.now() - started,
      fusionConfidence: validated.fusionConfidence,
      maxDiscoveryRows: controls.maxRows,
      maxDiscoveryMerchants: controls.maxMerchants,
      timeoutMs: controls.timeoutMs,
      discoveryHealthScore: health,
      upstreamReliabilityScore: refresh.upstreamReliabilityScore,
      successfulQueries: refresh.successfulQueries,
      failedQueries: refresh.failedQueries,
      retriesAttempted: refresh.retriesAttempted,
      fallbackQueriesAttempted: refresh.fallbackQueriesAttempted,
      partialRecovery: refresh.partialRecovery,
      recoveredFromFallback: refresh.recoveredFromFallback,
      upstreamFailures: refresh.upstreamFailures,
      merchantReliability,
      refreshLatencyMs: refresh.refreshLatencyMs,
      primaryQueriesAttempted: refresh.primaryQueriesAttempted,
      duplicateQueriesSuppressed: refresh.duplicateQueriesSuppressed,
      fallbackConfidenceScore: Math.round(
        Math.max(0, Math.min(100, refresh.upstreamReliabilityScore + (refresh.recoveredFromFallback ? 8 : 0) - (refresh.timedOut ? 16 : 0)))
      ),
      marketBreadthTarget: controls.maxRows,
      marketRowsPreserved: products.length,
      merchantDiversityScore: merchantDiversityScore(products, controls.maxMerchants),
      priceSpreadRatio: priceSpreadRatio(products),
      discoveryValidationTrace: validated.trace,
    },
  };
}
