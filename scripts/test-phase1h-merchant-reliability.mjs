#!/usr/bin/env node
/**
 * Phase 1H — Merchant reliability intelligence tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildMerchantReliabilityTruth,
  HIGH_VOLATILITY_THRESHOLD,
  UNRELIABLE_MERCHANT_THRESHOLD,
} from "../lib/truth/merchantReliabilityTruth.ts";
import { buildTruthFoundationSnapshot } from "../lib/truth/truthEvidenceBuilder.ts";
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
assert.ok(!surface.includes("merchantReliabilityTruth"), "no UI merchant reliability import");
pass("no_ui_redesign");

const now = new Date("2026-06-08T12:00:00.000Z");
function daysAgo(days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}
function hoursAgo(hours) {
  return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
}

const SKU = "bm:merchantreliabilitytest";
const product = {
  id: 1,
  title: "Apple AirPods Pro 2 USB-C",
  store: "Amazon.com",
  price: 295,
  displayPrice: "€295",
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

const stableAmazonObservations = [
  { id: "1", canonical_sku_id: SKU, merchant_key: "amazon", listing_url: product.link, observed_price: 228, currency: "EUR", observed_at: hoursAgo(6), availability_status: "in_stock", source: "cron_refresh", created_at: hoursAgo(6) },
  { id: "2", canonical_sku_id: SKU, merchant_key: "amazon", listing_url: product.link, observed_price: 229, currency: "EUR", observed_at: hoursAgo(12), availability_status: "in_stock", source: "cron_refresh", created_at: hoursAgo(12) },
  { id: "3", canonical_sku_id: SKU, merchant_key: "walmart", listing_url: "https://walmart.com/ip/Y", observed_price: 227, currency: "EUR", observed_at: hoursAgo(8), availability_status: "in_stock", source: "cron_refresh", created_at: hoursAgo(8) },
];

const stableReliability = buildMerchantReliabilityTruth({
  store: product.store,
  listingUrl: product.link,
  observations: stableAmazonObservations,
  availabilityObservation: null,
  currentPrice: 229,
  referencePrice: 228,
  now,
});
assert.equal(stableReliability.merchantState, "RELIABLE");
assert.ok(stableReliability.merchantReliabilityScore >= UNRELIABLE_MERCHANT_THRESHOLD);
pass("reliable_merchant_scores");

const volatileObservations = [
  { id: "1", canonical_sku_id: SKU, merchant_key: "amazon", listing_url: product.link, observed_price: 180, currency: "EUR", observed_at: hoursAgo(8), availability_status: "in_stock", source: "cron_refresh", created_at: hoursAgo(8) },
  { id: "2", canonical_sku_id: SKU, merchant_key: "amazon", listing_url: product.link, observed_price: 360, currency: "EUR", observed_at: hoursAgo(16), availability_status: "in_stock", source: "cron_refresh", created_at: hoursAgo(16) },
  { id: "3", canonical_sku_id: SKU, merchant_key: "amazon", listing_url: product.link, observed_price: 190, currency: "EUR", observed_at: hoursAgo(20), availability_status: "in_stock", source: "cron_refresh", created_at: hoursAgo(20) },
];
const volatileReliability = buildMerchantReliabilityTruth({
  store: product.store,
  listingUrl: product.link,
  observations: volatileObservations,
  availabilityObservation: null,
  currentPrice: 340,
  referencePrice: 230,
  now,
});
assert.ok(volatileReliability.merchantVolatilityScore >= HIGH_VOLATILITY_THRESHOLD);
assert.ok(["VOLATILE", "UNRELIABLE"].includes(volatileReliability.merchantState));
pass("volatile_merchant_detection");

const poorAvailabilityObservations = [
  { id: "1", canonical_sku_id: SKU, merchant_key: "amazon", listing_url: product.link, observed_price: 230, currency: "EUR", observed_at: hoursAgo(10), availability_status: "out_of_stock", source: "cron_refresh", created_at: hoursAgo(10) },
  { id: "2", canonical_sku_id: SKU, merchant_key: "amazon", listing_url: product.link, observed_price: 232, currency: "EUR", observed_at: hoursAgo(18), availability_status: "out_of_stock", source: "cron_refresh", created_at: hoursAgo(18) },
];
const poorAvailability = buildMerchantReliabilityTruth({
  store: product.store,
  listingUrl: product.link,
  observations: poorAvailabilityObservations,
  availabilityObservation: {
    id: "obs-1",
    listing_url: product.link,
    sku_id: SKU,
    observed_at: hoursAgo(10),
    availability: "out_of_stock",
    availability_text: "Out of stock",
    current_price: 230,
    shipping_price: null,
    source: "cron_refresh",
    freshness_score: 100,
    created_at: hoursAgo(10),
  },
  currentPrice: 230,
  now,
});
assert.ok(poorAvailability.merchantAvailabilityReliability < 50);
pass("poor_availability_reliability");

const staleObservations = [
  { id: "1", canonical_sku_id: SKU, merchant_key: "amazon", listing_url: product.link, observed_price: 230, currency: "EUR", observed_at: daysAgo(30), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(30) },
  { id: "2", canonical_sku_id: SKU, merchant_key: "amazon", listing_url: product.link, observed_price: 231, currency: "EUR", observed_at: daysAgo(32), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(32) },
];
const staleReliability = buildMerchantReliabilityTruth({
  store: product.store,
  listingUrl: product.link,
  observations: staleObservations,
  availabilityObservation: {
    id: "obs-2",
    listing_url: product.link,
    sku_id: SKU,
    observed_at: daysAgo(30),
    availability: "in_stock",
    availability_text: "In stock",
    current_price: 230,
    shipping_price: null,
    source: "cron_refresh",
    freshness_score: 30,
    created_at: daysAgo(30),
  },
  currentPrice: 230,
  listingAgeHours: 30,
  now,
});
assert.equal(staleReliability.merchantState, "STALE");
pass("stale_merchant_state");

const foundation = buildTruthFoundationSnapshot({
  product: { ...product, price: 340 },
  listingUrl: product.link,
  prefetch: {
    listingUrl: product.link,
    canonicalSkuId: SKU,
    skuIdentityConfidence: 82,
    availabilityObservation: null,
    priceObservations: volatileObservations,
    availabilityDataSource: "inline",
    priceHistoryDataSource: "db",
  },
});
assert.ok(foundation.merchantReliability);
assert.ok(foundation.merchantObservationCount >= 2);
pass("snapshot_merchant_reliability_block");

const intel = {
  finalVerdict: "BUY READY",
  segment: null,
  segmentLabel: "",
  dimensions: [],
  productUnderstandingLine: "",
  globalPriceIntelligence: { lowestPriceFound: 340 },
  marketDepth: { marketCoverageScore: 70 },
  productIdentityV2: { identityConfidence: 82 },
  commercePriceHistory: { insight: { sampleCount: 0 } },
  truthFoundation: foundation,
};

const volatileGate = applyTruthConfidenceGate({
  tier: "BUY READY",
  verdict: "BUY READY",
  confidence: 85,
  truthBundle: computeTruthConfidence(intel),
});
assert.equal(volatileGate.tier, "COMPARE");
assert.ok(
  volatileGate.gatesApplied.some(
    (g) =>
      g.includes("volatile_merchant") ||
      g.includes("abnormal_merchant_pricing") ||
      g.includes("unreliable_merchant")
  )
);
pass("merchant_reliability_downgrade");

console.log(`\nPhase 1H merchant reliability: ${passed} checks passed.`);
