#!/usr/bin/env node
/**
 * Phase 1M — Unified trust engine tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildUnifiedTrustEngine,
  ELEVATED_TRUST_RISK_THRESHOLD,
  WEAK_TRUST_CONFIDENCE_THRESHOLD,
  WEAK_TRUST_SCORE_THRESHOLD,
  WEAK_TRUST_STRENGTH_THRESHOLD,
} from "../lib/truth/unifiedTrustEngine.ts";
import {
  buildTruthFoundationSnapshot,
  buildExtendedTruthEvidenceSources,
} from "../lib/truth/truthEvidenceBuilder.ts";
import {
  applyTruthConfidenceGate,
  computeTruthConfidence,
} from "../lib/truth/truthConfidenceGate.ts";
import { buildMarketTruthRollup } from "../lib/truth/marketTruthRollup.ts";
import { buildProductIntelligenceFoundation } from "../lib/truth/productIntelligenceFoundation.ts";
import { buildUniversalCommerceIntelligence } from "../lib/truth/universalCommerceIntelligence.ts";
import { buildCommerceReasoningLayer } from "../lib/truth/commerceReasoningLayer.ts";
import { buildEvidenceReasoningGraph } from "../lib/truth/evidenceReasoningGraph.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("unifiedTrustEngine"), "no UI trust engine import");
pass("no_ui_redesign");

const now = new Date("2026-06-13T12:00:00.000Z");
function daysAgo(days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

const SKU = "bm:trustengine";
const product = {
  id: 1,
  title: "Apple AirPods Pro 2 USB-C",
  store: "Amazon.com",
  price: 228,
  displayPrice: "€228",
  rating: 4.8,
  link: "https://amazon.com/dp/B0CHWRXH8B",
  image: "",
  reviewsCount: 100,
  shipping: "Free delivery",
  availability: "In stock",
  oldPrice: null,
  priceTrend: "stable",
  extensions: ["In stock"],
};

const strongObservations = [
  { id: "1", canonical_sku_id: SKU, merchant_key: "amazon", listing_url: product.link, observed_price: 228, currency: "EUR", observed_at: daysAgo(5), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(5) },
  { id: "2", canonical_sku_id: SKU, merchant_key: "walmart", listing_url: "https://walmart.com/ip/Y", observed_price: 229, currency: "EUR", observed_at: daysAgo(6), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(6) },
  { id: "3", canonical_sku_id: SKU, merchant_key: "bestbuy", listing_url: "https://bestbuy.com/Z", observed_price: 227, currency: "EUR", observed_at: daysAgo(7), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(7) },
  { id: "4", canonical_sku_id: SKU, merchant_key: "target", listing_url: "https://target.com/A", observed_price: 230, currency: "EUR", observed_at: daysAgo(8), availability_status: "limited", source: "cron_refresh", created_at: daysAgo(8) },
];

const foundation = buildTruthFoundationSnapshot({
  product,
  listingUrl: product.link,
  prefetch: {
    listingUrl: product.link,
    canonicalSkuId: SKU,
    skuIdentityConfidence: 84,
    availabilityObservation: {
      id: "obs-strong",
      listing_url: product.link,
      sku_id: SKU,
      observed_at: daysAgo(1),
      availability: "in_stock",
      availability_text: "In stock",
      current_price: 228,
      shipping_price: null,
      source: "cron_refresh",
      freshness_score: 100,
      created_at: daysAgo(1),
    },
    priceObservations: strongObservations,
    availabilityDataSource: "db",
    priceHistoryDataSource: "db",
  },
});

const trust = foundation.trustEngine;
assert.ok(trust);
assert.ok(trust.trustScore >= WEAK_TRUST_SCORE_THRESHOLD);
assert.ok(trust.trustSignals.length > 0);
assert.ok(trust.trustRisks.length >= 0);
assert.ok(["TRUST_STRONG", "TRUST_GOOD", "TRUST_CAUTION"].includes(trust.trustState));
pass("trust_engine_rollup");

assert.ok(foundation.trustEngine.trustStrength > 0);
assert.ok(foundation.trustEngine.trustConfidence > 0);
pass("snapshot_trust_engine_block");

const weakMarketRollup = buildMarketTruthRollup({
  merchantCount: 1,
  availabilityConsensus: "CONSENSUS_UNKNOWN",
  crossMerchantReferencePrice: null,
  marketPriceSpread: null,
  merchantAgreementScore: 18,
  listingPriceOutlier: true,
  priceTruthConfidence: 16,
  baselineSamples90d: 0,
  availabilityState: "UNKNOWN",
  availabilityFreshness: 35,
});

const weakMerchantReliability = {
  merchantReliabilityScore: 28,
  merchantAvailabilityReliability: 26,
  merchantPricingReliability: 24,
  merchantFreshnessReliability: 30,
  merchantVolatilityScore: 74,
  merchantState: "UNRELIABLE",
};

const weakBase = {
  ...foundation,
  skuIdentityConfidence: 34,
  priceTruthConfidence: 18,
  listingPriceOutlier: true,
  availabilityState: "UNKNOWN",
  availability: {
    ...foundation.availability,
    observedAt: null,
    freshnessScore: 35,
  },
  merchantReliability: weakMerchantReliability,
  merchantObservationCount: 2,
  marketIntelligence: weakMarketRollup,
  priceTruth: foundation.priceTruth
    ? { ...foundation.priceTruth, fakeDiscount: { isFake: true, reason: "test" } }
    : null,
};

const {
  productIntelligence: _p,
  commerceIntelligence: _c,
  commerceReasoning: _r,
  evidenceReasoningGraph: _g,
  trustEngine: _t,
  ...weakInput
} = weakBase;
const weakProduct = buildProductIntelligenceFoundation(weakInput);
const weakCommerce = buildUniversalCommerceIntelligence({ ...weakInput, productIntelligence: weakProduct });
const weakReasoning = buildCommerceReasoningLayer({
  ...weakInput,
  productIntelligence: weakProduct,
  commerceIntelligence: weakCommerce,
});
const weakGraph = buildEvidenceReasoningGraph({
  ...weakInput,
  productIntelligence: weakProduct,
  commerceIntelligence: weakCommerce,
  commerceReasoning: weakReasoning,
});
const weakTrust = buildUnifiedTrustEngine({
  ...weakInput,
  productIntelligence: weakProduct,
  commerceIntelligence: weakCommerce,
  commerceReasoning: weakReasoning,
  evidenceReasoningGraph: weakGraph,
});

assert.ok(weakTrust.trustScore < WEAK_TRUST_SCORE_THRESHOLD);
assert.ok(weakTrust.trustConfidence < WEAK_TRUST_CONFIDENCE_THRESHOLD);
assert.ok(weakTrust.trustStrength < WEAK_TRUST_STRENGTH_THRESHOLD);
assert.ok(weakTrust.trustRisks.length >= ELEVATED_TRUST_RISK_THRESHOLD);
assert.ok(["TRUST_WEAK", "TRUST_UNKNOWN", "TRUST_CAUTION"].includes(weakTrust.trustState));
pass("weak_trust_detection");

const weakIntel = {
  finalVerdict: "BUY READY",
  segment: null,
  segmentLabel: "",
  dimensions: [],
  productUnderstandingLine: "",
  globalPriceIntelligence: { lowestPriceFound: 228 },
  marketDepth: { marketCoverageScore: 18 },
  productIdentityV2: { identityConfidence: 34 },
  commercePriceHistory: { insight: { sampleCount: 0 } },
  truthFoundation: {
    ...weakInput,
    productIntelligence: weakProduct,
    commerceIntelligence: weakCommerce,
    commerceReasoning: weakReasoning,
    evidenceReasoningGraph: weakGraph,
    trustEngine: weakTrust,
  },
};

const weakGate = applyTruthConfidenceGate({
  tier: "BUY READY",
  verdict: "BUY READY",
  confidence: 85,
  truthBundle: computeTruthConfidence(weakIntel),
});
assert.ok(["COMPARE", "WAIT"].includes(weakGate.tier));
assert.ok(weakGate.gatesApplied.includes("downgrade_weak_trust_score"));
assert.ok(
  weakGate.gatesApplied.some(
    (g) =>
      g.includes("weak_trust_confidence") ||
      g.includes("weak_trust_strength") ||
      g.includes("elevated_trust_risks")
  )
);
pass("trust_engine_downgrade");

const sources = buildExtendedTruthEvidenceSources(weakIntel);
assert.ok(sources.hasTrustEngine);
assert.ok(sources.trustScore < WEAK_TRUST_SCORE_THRESHOLD);
assert.ok(sources.trustRiskCount >= ELEVATED_TRUST_RISK_THRESHOLD);
pass("gate_reads_trust_engine");

console.log(`\nPhase 1M unified trust engine: ${passed} checks passed.`);
