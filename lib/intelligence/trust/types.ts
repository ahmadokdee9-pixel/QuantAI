/**
 * Phase 5 — Trust + price truth engine types (shadow-safe, deterministic).
 */

import type { CanonicalProductNode } from "@/lib/intelligence/identity/types";
import type { QuantProduct } from "@/lib/shoppingScore";

export const TRUST_ENGINE_VERSION = "phase5.0";

export type MerchantTrustProfile = {
  storeKey: string;
  reputationScore: number;
  consistencyScore: number;
  catalogQuality01: number;
  fakeInventoryRisk01: number;
  duplicateIdentityRisk01: number;
  suspiciousPricing01: number;
  shippingInconsistency01: number;
  warehouseConfidence01: number;
  alert: boolean;
  reasons: string[];
};

export type PriceTruthProfile = {
  commerceId: string;
  baselinePrice: number | null;
  currentPrice: number;
  priceTruthScore: number;
  fakeDiscountRisk01: number;
  msrpIntegrity01: number;
  anomalySpike01: number;
  unrealisticSale01: number;
  historicalConfidence01: number;
  reasons: string[];
};

export type TrustExplainability = {
  whyTrusted: string[];
  whySuspicious: string[];
  fakeDiscountReasons: string[];
  merchantConsistencyReasons: string[];
  pricingConfidenceReasons: string[];
};

export type TrustRankingPrepSignals = {
  trustScore: number;
  priceTruthScore: number;
  merchantReliabilityScore: number;
  fakeDiscountRisk: number;
  inventoryConfidence: number;
  /** Shadow-only — never applied to qiRank in Phase 5. */
  rankingMutation: false;
};

export type CanonicalOfferIntelligence = {
  canonicalProductId: string;
  commerceId: string;
  trustedOffers: string[];
  suspiciousOffers: string[];
  pricingConfidence01: number;
  merchantConfidence01: number;
  historicalPriceConfidence01: number;
  explain: TrustExplainability;
  rankingPrep: TrustRankingPrepSignals;
};

export type TrustEngineMeta = {
  version: string;
  enabled: boolean;
  shadowOnly: true;
  query: string;
  inputCount: number;
  offerIntelligenceCount: number;
  merchantNodeCount: number;
  trustCoverage: number;
  avgTrustScore: number;
  avgPriceTruthScore: number;
  fraudAlertCount: number;
  fakeDiscountAlertCount: number;
  latencyMs: number;
  graph: { merchants: number; products: number; anomalies: number };
};

export type TrustEngineResult = {
  products: QuantProduct[];
  meta: TrustEngineMeta;
  merchantProfiles: Record<string, MerchantTrustProfile>;
  priceTruthByCommerceId: Record<string, PriceTruthProfile>;
  offerIntelligence: CanonicalOfferIntelligence[];
  rankingPrepByLink: Record<string, TrustRankingPrepSignals>;
  replayFingerprint: string;
};

export type TrustEngineInput = {
  products: QuantProduct[];
  query: string;
  canonicalProducts?: CanonicalProductNode[];
};
