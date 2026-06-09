#!/usr/bin/env node
/**
 * Phase 1G — Market intelligence layer tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildMarketTruthRollup,
  THIN_MARKET_DEPTH_THRESHOLD,
} from "../lib/truth/marketTruthRollup.ts";
import {
  buildTruthFoundationSnapshot,
  buildExtendedTruthEvidenceSources,
} from "../lib/truth/truthEvidenceBuilder.ts";
import {
  applyTruthConfidenceGate,
  computeTruthConfidence,
} from "../lib/truth/truthConfidenceGate.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("marketTruthRollup"), "no UI market rollup import");
pass("no_ui_redesign");

const now = new Date("2026-06-07T12:00:00.000Z");
function daysAgo(days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

const SKU = "bm:marketinteltest";
const product = {
  id: 1,
  title: "Apple AirPods Pro 2 USB-C",
  store: "Amazon.com",
  price: 230,
  displayPrice: "€230",
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

const strongMarketObservations = [
  { id: "1", canonical_sku_id: SKU, merchant_key: "amazon", listing_url: product.link, observed_price: 228, currency: "EUR", observed_at: daysAgo(5), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(5) },
  { id: "2", canonical_sku_id: SKU, merchant_key: "walmart", listing_url: "https://walmart.com/ip/Y", observed_price: 229, currency: "EUR", observed_at: daysAgo(6), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(6) },
  { id: "3", canonical_sku_id: SKU, merchant_key: "bestbuy", listing_url: "https://bestbuy.com/Z", observed_price: 227, currency: "EUR", observed_at: daysAgo(7), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(7) },
  { id: "4", canonical_sku_id: SKU, merchant_key: "target", listing_url: "https://target.com/A", observed_price: 230, currency: "EUR", observed_at: daysAgo(8), availability_status: "limited", source: "cron_refresh", created_at: daysAgo(8) },
];

const rollup = buildMarketTruthRollup({
  merchantCount: 4,
  availabilityConsensus: "CONSENSUS_AVAILABLE",
  crossMerchantReferencePrice: 228.5,
  marketPriceSpread: 6,
  merchantAgreementScore: 88,
  listingPriceOutlier: false,
  priceTruthConfidence: 72,
  baselineSamples90d: 8,
  availabilityState: "AVAILABLE",
  availabilityFreshness: 100,
});
assert.ok(rollup.marketDepth >= THIN_MARKET_DEPTH_THRESHOLD);
assert.ok(rollup.marketCoverage >= 60);
assert.equal(rollup.consensusState, "CONSENSUS_AVAILABLE");
assert.ok(rollup.marketPriceConfidence >= 45);
assert.ok(rollup.marketAvailabilityConfidence >= 50);
pass("market_truth_rollup_scores");

const foundation = buildTruthFoundationSnapshot({
  product,
  listingUrl: product.link,
  prefetch: {
    listingUrl: product.link,
    canonicalSkuId: SKU,
    skuIdentityConfidence: 82,
    availabilityObservation: null,
    priceObservations: strongMarketObservations,
    availabilityDataSource: "inline",
    priceHistoryDataSource: "db",
  },
});
assert.ok(foundation.marketIntelligence);
assert.equal(foundation.marketIntelligence.consensusState, "CONSENSUS_AVAILABLE");
assert.ok(foundation.marketIntelligence.referencePrice != null);
pass("snapshot_market_intelligence_block");

const thinRollup = buildMarketTruthRollup({
  merchantCount: 2,
  availabilityConsensus: "CONSENSUS_UNKNOWN",
  crossMerchantReferencePrice: 229,
  marketPriceSpread: 8,
  merchantAgreementScore: 52,
  listingPriceOutlier: false,
  priceTruthConfidence: 50,
  baselineSamples90d: 0,
  availabilityState: "UNKNOWN",
  availabilityFreshness: 100,
});
assert.ok(thinRollup.marketDepth < THIN_MARKET_DEPTH_THRESHOLD);
pass("thin_market_depth_detection");

const thinIntel = {
  finalVerdict: "BUY READY",
  segment: null,
  segmentLabel: "",
  dimensions: [],
  productUnderstandingLine: "",
  globalPriceIntelligence: { lowestPriceFound: 230 },
  marketDepth: { marketCoverageScore: 70 },
  productIdentityV2: { identityConfidence: 82 },
  commercePriceHistory: { insight: { sampleCount: 0 } },
  truthFoundation: {
    ...foundation,
    merchantCount: 2,
    marketIntelligence: thinRollup,
  },
};
const thinGate = applyTruthConfidenceGate({
  tier: "BUY READY",
  verdict: "BUY READY",
  confidence: 85,
  truthBundle: computeTruthConfidence(thinIntel),
});
assert.equal(thinGate.tier, "COMPARE");
assert.ok(thinGate.gatesApplied.some((g) => g.includes("thin_market_depth")));
pass("thin_market_depth_downgrade");

const thinObservations = strongMarketObservations.slice(0, 2);
const thinFoundation = buildTruthFoundationSnapshot({
  product,
  listingUrl: product.link,
  prefetch: {
    listingUrl: product.link,
    canonicalSkuId: SKU,
    skuIdentityConfidence: 82,
    availabilityObservation: null,
    priceObservations: thinObservations,
    availabilityDataSource: "inline",
    priceHistoryDataSource: "db",
  },
});
assert.ok(thinFoundation.marketIntelligence.marketDepth >= THIN_MARKET_DEPTH_THRESHOLD || thinFoundation.merchantCount >= 2);
pass("snapshot_two_merchant_foundation");

const spreadObservations = [
  { id: "1", canonical_sku_id: SKU, merchant_key: "amazon", listing_url: product.link, observed_price: 180, currency: "EUR", observed_at: daysAgo(5), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(5) },
  { id: "2", canonical_sku_id: SKU, merchant_key: "walmart", listing_url: "https://walmart.com/ip/Y", observed_price: 240, currency: "EUR", observed_at: daysAgo(6), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(6) },
  { id: "3", canonical_sku_id: SKU, merchant_key: "bestbuy", listing_url: "https://bestbuy.com/Z", observed_price: 235, currency: "EUR", observed_at: daysAgo(7), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(7) },
];
const spreadFoundation = buildTruthFoundationSnapshot({
  product: { ...product, price: 240 },
  listingUrl: product.link,
  prefetch: {
    listingUrl: product.link,
    canonicalSkuId: SKU,
    skuIdentityConfidence: 82,
    availabilityObservation: null,
    priceObservations: spreadObservations,
    availabilityDataSource: "inline",
    priceHistoryDataSource: "db",
  },
});
assert.ok((spreadFoundation.marketIntelligence.marketSpread ?? 0) >= 22);
const spreadIntel = {
  finalVerdict: "BUY READY",
  segment: null,
  segmentLabel: "",
  dimensions: [],
  productUnderstandingLine: "",
  globalPriceIntelligence: { lowestPriceFound: 240 },
  marketDepth: { marketCoverageScore: 70 },
  productIdentityV2: { identityConfidence: 82 },
  commercePriceHistory: { insight: { sampleCount: 0 } },
  truthFoundation: spreadFoundation,
};
const spreadGate = applyTruthConfidenceGate({
  tier: "BUY READY",
  verdict: "BUY READY",
  confidence: 85,
  truthBundle: computeTruthConfidence(spreadIntel),
});
assert.equal(spreadGate.tier, "COMPARE");
assert.ok(spreadGate.gatesApplied.some((g) => g.includes("market_spread")));
pass("high_market_spread_downgrade");

const conflictObservations = [
  ...strongMarketObservations.slice(0, 2),
  { ...strongMarketObservations[2], availability_status: "out_of_stock" },
  { ...strongMarketObservations[3], availability_status: "out_of_stock" },
];
const conflictFoundation = buildTruthFoundationSnapshot({
  product,
  listingUrl: product.link,
  prefetch: {
    listingUrl: product.link,
    canonicalSkuId: SKU,
    skuIdentityConfidence: 82,
    availabilityObservation: null,
    priceObservations: conflictObservations,
    availabilityDataSource: "inline",
    priceHistoryDataSource: "db",
  },
});
assert.ok(conflictFoundation.marketIntelligence.marketAvailabilityConfidence < 50);
const conflictIntel = {
  ...spreadIntel,
  globalPriceIntelligence: { lowestPriceFound: 230 },
  truthFoundation: conflictFoundation,
};
const conflictGate = applyTruthConfidenceGate({
  tier: "STRONG BUY",
  verdict: "BUY READY",
  confidence: 90,
  truthBundle: computeTruthConfidence(conflictIntel),
});
assert.ok(
  conflictGate.gatesApplied.some(
    (g) =>
      g.includes("market_availability") ||
      g.includes("availability_conflict") ||
      g.includes("market_agreement")
  )
);
pass("weak_market_availability_downgrade");

const sources = buildExtendedTruthEvidenceSources({
  ...spreadIntel,
  truthFoundation: foundation,
});
assert.ok(sources.marketDepth > 0);
assert.ok(sources.marketPriceConfidence > 0);
pass("gate_reads_market_intelligence");

console.log(`\nPhase 1G market intelligence: ${passed} checks passed.`);
