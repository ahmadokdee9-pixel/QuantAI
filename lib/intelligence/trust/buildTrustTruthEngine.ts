/**
 * Phase 5 — Authoritative trust + price truth engine (shadow-safe).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { CanonicalProductNode } from "@/lib/intelligence/identity/types";
import { buildCanonicalProductGraph } from "@/lib/intelligence/identity/canonicalProductGraph";
import { ingestTrayPrices } from "@/lib/intelligence/identity/pricing/merchantPriceTimeline";
import type { TrustEngineInput, TrustEngineResult, TrustEngineMeta } from "./types";
import { TRUST_ENGINE_VERSION } from "./types";
import { readTrustEngineFlags } from "./flags";
import { runMerchantTrustKernel } from "./merchant/merchantTrustKernel";
import { runPriceTruthEngine } from "./pricing/priceTruthEngine";
import { buildAllOfferIntelligence } from "./offer/canonicalOfferIntelligence";
import { buildTrustReplayFingerprint } from "./replay/deterministicTrustExecution";
import {
  snapshotTrustOrchestration,
  type TrustOrchestrationContext,
  type TrustOrchestrationSnapshot,
} from "./trustOrchestration";
import { buildTrustRankingPrepSignals } from "./ranking/trustRankingSignals";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export type BuildTrustTruthEngineOptions = {
  orchestration?: TrustOrchestrationContext;
};

/**
 * Build merchant truth + price truth layers. Does NOT mutate product ranking.
 */
export function buildTrustTruthEngine(
  input: TrustEngineInput,
  options: BuildTrustTruthEngineOptions = {}
): TrustEngineResult {
  const started = Date.now();
  const flags = readTrustEngineFlags();
  const { products, query } = input;

  const empty = (): TrustEngineResult => ({
    products,
    meta: {
      version: TRUST_ENGINE_VERSION,
      enabled: flags.enabled,
      shadowOnly: true,
      query,
      inputCount: products.length,
      offerIntelligenceCount: 0,
      merchantNodeCount: 0,
      trustCoverage: 0,
      avgTrustScore: 0,
      avgPriceTruthScore: 0,
      fraudAlertCount: 0,
      fakeDiscountAlertCount: 0,
      latencyMs: Date.now() - started,
      graph: { merchants: 0, products: 0, anomalies: 0 },
    },
    merchantProfiles: {},
    priceTruthByCommerceId: {},
    offerIntelligence: [],
    rankingPrepByLink: {},
    replayFingerprint: "trp_disabled",
  });

  if (!flags.enabled || products.length === 0) return empty();

  ingestTrayPrices(products);

  const canonicalProducts: CanonicalProductNode[] =
    input.canonicalProducts ??
    buildCanonicalProductGraph(
      products,
      options.orchestration?.normalizationMeta?.groups ?? []
    ).nodes;

  const merchant = runMerchantTrustKernel(products);
  const priceTruth = runPriceTruthEngine(products);
  const offerIntelligence = buildAllOfferIntelligence(
    canonicalProducts,
    products,
    merchant.profiles,
    priceTruth.byCommerceId
  );

  const rankingPrepByLink: TrustEngineResult["rankingPrepByLink"] = {};
  for (const node of canonicalProducts) {
    for (const offer of node.offers) {
      const p = products.find((x) => x.link === offer.link);
      const storeKey = offer.store.trim().toLowerCase();
      rankingPrepByLink[offer.link] = buildTrustRankingPrepSignals({
        offer,
        merchant: merchant.profiles[storeKey],
        priceTruth: priceTruth.byCommerceId[node.commerceId],
        product: p,
      });
    }
  }

  const prepScores = Object.values(rankingPrepByLink);
  const avgTrust =
    prepScores.length > 0
      ? round4(prepScores.reduce((s, p) => s + p.trustScore, 0) / prepScores.length)
      : 0;
  const avgPriceTruth =
    prepScores.length > 0
      ? round4(prepScores.reduce((s, p) => s + p.priceTruthScore, 0) / prepScores.length)
      : 0;

  const trustCoverage =
    products.length > 0 ? round4(prepScores.length / products.length) : 0;

  const meta: TrustEngineMeta = {
    version: TRUST_ENGINE_VERSION,
    enabled: true,
    shadowOnly: true,
    query,
    inputCount: products.length,
    offerIntelligenceCount: offerIntelligence.length,
    merchantNodeCount: merchant.graph.nodes.length,
    trustCoverage,
    avgTrustScore: avgTrust,
    avgPriceTruthScore: avgPriceTruth,
    fraudAlertCount: merchant.graph.alertCount,
    fakeDiscountAlertCount: priceTruth.alertCount,
    latencyMs: Date.now() - started,
    graph: {
      merchants: merchant.graph.nodes.length,
      products: canonicalProducts.length,
      anomalies: priceTruth.alertCount,
    },
  };

  const result: TrustEngineResult = {
    products,
    meta,
    merchantProfiles: merchant.profiles,
    priceTruthByCommerceId: priceTruth.byCommerceId,
    offerIntelligence,
    rankingPrepByLink,
    replayFingerprint: "",
  };
  result.replayFingerprint = buildTrustReplayFingerprint(result);
  return result;
}

export function trustEngineMetaForSearch(
  result: TrustEngineResult,
  orchestration?: TrustOrchestrationSnapshot
): Record<string, unknown> {
  if (!result.meta.enabled) return {};

  const trustDistribution = Object.values(result.rankingPrepByLink).map((p) => p.trustScore);
  const fakeRisks = Object.values(result.rankingPrepByLink).map((p) => p.fakeDiscountRisk);

  return {
    trustEngine: {
      ...result.meta,
      replayFingerprint: result.replayFingerprint,
      orchestration,
    },
    trustEngineShadow: {
      merchantAlerts: Object.values(result.merchantProfiles)
        .filter((m) => m.alert)
        .slice(0, 8)
        .map((m) => ({ store: m.storeKey, reasons: m.reasons.slice(0, 4) })),
      fakeDiscountAlerts: Object.entries(result.priceTruthByCommerceId)
        .filter(([, p]) => p.fakeDiscountRisk01 >= 0.5)
        .slice(0, 8)
        .map(([commerceId, p]) => ({
          commerceId,
          fakeDiscountRisk01: p.fakeDiscountRisk01,
          reasons: p.reasons.slice(0, 3),
        })),
      offerSample: result.offerIntelligence.slice(0, 5).map((o) => ({
        commerceId: o.commerceId,
        trustedCount: o.trustedOffers.length,
        suspiciousCount: o.suspiciousOffers.length,
        whyTrusted: o.explain.whyTrusted.slice(0, 3),
        whySuspicious: o.explain.whySuspicious.slice(0, 3),
      })),
      trustConfidence: {
        min: trustDistribution.length ? Math.min(...trustDistribution) : 0,
        max: trustDistribution.length ? Math.max(...trustDistribution) : 0,
        avg: result.meta.avgTrustScore,
      },
      fakeDiscountRisk: {
        max: fakeRisks.length ? Math.max(...fakeRisks) : 0,
        avg: fakeRisks.length
          ? round4(fakeRisks.reduce((a, b) => a + b, 0) / fakeRisks.length)
          : 0,
      },
      priceAnomalyTraces: Object.values(result.priceTruthByCommerceId)
        .filter((p) => p.anomalySpike01 >= 0.35)
        .slice(0, 5)
        .map((p) => ({
          commerceId: p.commerceId,
          anomalySpike01: p.anomalySpike01,
          reasons: p.reasons.slice(0, 3),
        })),
    },
  };
}

export { snapshotTrustOrchestration };
