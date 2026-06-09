#!/usr/bin/env node
/**
 * Phase 1F — Cross-merchant truth aggregation tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deriveAvailabilityConsensus } from "../lib/truth/availabilityConsensusModel.ts";
import {
  aggregateCrossMerchantTruth,
  PRICE_OUTLIER_HIGH_RATIO,
} from "../lib/truth/crossMerchantTruthAggregator.ts";
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
assert.ok(!surface.includes("crossMerchantTruthAggregator"), "no UI aggregator import");
pass("no_ui_redesign");

const now = new Date("2026-06-06T12:00:00.000Z");
function daysAgo(days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

const SKU = "bm:crossmerchanttest";
const product = {
  id: 1,
  title: "Apple AirPods Pro 2 USB-C",
  store: "Amazon.com",
  price: 285,
  displayPrice: "€285",
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

const multiMerchantObservations = [
  { id: "1", canonical_sku_id: SKU, merchant_key: "amazon", listing_url: product.link, observed_price: 230, currency: "EUR", observed_at: daysAgo(5), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(5) },
  { id: "2", canonical_sku_id: SKU, merchant_key: "walmart", listing_url: "https://walmart.com/ip/Y", observed_price: 228, currency: "EUR", observed_at: daysAgo(6), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(6) },
  { id: "3", canonical_sku_id: SKU, merchant_key: "bestbuy", listing_url: "https://bestbuy.com/Z", observed_price: 232, currency: "EUR", observed_at: daysAgo(7), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(7) },
  { id: "4", canonical_sku_id: SKU, merchant_key: "target", listing_url: "https://target.com/A", observed_price: 231, currency: "EUR", observed_at: daysAgo(8), availability_status: "limited", source: "cron_refresh", created_at: daysAgo(8) },
];

const consensus = aggregateCrossMerchantTruth({
  observations: multiMerchantObservations,
  currentPrice: product.price,
  now,
});
assert.equal(consensus.merchantCount, 4);
assert.equal(consensus.availabilityConsensus, "CONSENSUS_AVAILABLE");
assert.ok(consensus.crossMerchantReferencePrice != null);
assert.ok(consensus.crossMerchantReferencePrice < product.price);
assert.ok(consensus.listingPriceOutlier);
assert.ok(consensus.merchantAgreementScore >= 55);
pass("cross_merchant_reference_and_outlier");

assert.equal(
  deriveAvailabilityConsensus(["in_stock", "in_stock", "out_of_stock", "out_of_stock"]),
  "CONSENSUS_CONFLICT"
);
assert.equal(deriveAvailabilityConsensus(["in_stock", "in_stock", "in_stock"]), "CONSENSUS_AVAILABLE");
assert.equal(deriveAvailabilityConsensus([]), "CONSENSUS_UNKNOWN");
pass("availability_consensus_states");

const conflictObservations = [
  ...multiMerchantObservations.slice(0, 2),
  { ...multiMerchantObservations[2], availability_status: "out_of_stock", observed_price: 232 },
  { ...multiMerchantObservations[3], availability_status: "out_of_stock", observed_price: 231 },
];
const conflictAgg = aggregateCrossMerchantTruth({
  observations: conflictObservations,
  currentPrice: 230,
  now,
});
assert.equal(conflictAgg.availabilityConsensus, "CONSENSUS_CONFLICT");
assert.ok(conflictAgg.merchantAgreementScore < 55);
pass("consensus_conflict_low_agreement");

const foundation = buildTruthFoundationSnapshot({
  product,
  listingUrl: product.link,
  prefetch: {
    listingUrl: product.link,
    canonicalSkuId: SKU,
    skuIdentityConfidence: 82,
    availabilityObservation: null,
    priceObservations: multiMerchantObservations,
    availabilityDataSource: "db",
    priceHistoryDataSource: "db",
  },
});
assert.equal(foundation.merchantCount, 4);
assert.ok(foundation.crossMerchantReferencePrice != null);
assert.equal(foundation.listingPriceOutlier, true);
pass("snapshot_cross_merchant_fields");

const intel = {
  finalVerdict: "BUY READY",
  segment: null,
  segmentLabel: "",
  dimensions: [],
  productUnderstandingLine: "",
  globalPriceIntelligence: { lowestPriceFound: product.price },
  marketDepth: { marketCoverageScore: 70 },
  productIdentityV2: { identityConfidence: 82 },
  commercePriceHistory: { insight: { sampleCount: 0 } },
  truthFoundation: foundation,
};

const outlierGate = applyTruthConfidenceGate({
  tier: "BUY READY",
  verdict: "BUY READY",
  confidence: 85,
  truthBundle: computeTruthConfidence(intel),
});
assert.equal(outlierGate.tier, "COMPARE");
assert.ok(outlierGate.gatesApplied.some((g) => g.includes("price_outlier")));
pass("price_outlier_downgrade");

const conflictFoundation = buildTruthFoundationSnapshot({
  product: { ...product, price: 230 },
  listingUrl: product.link,
  prefetch: {
    listingUrl: product.link,
    canonicalSkuId: SKU,
    skuIdentityConfidence: 82,
    availabilityObservation: null,
    priceObservations: conflictObservations,
    availabilityDataSource: "db",
    priceHistoryDataSource: "db",
  },
});
const conflictIntel = { ...intel, globalPriceIntelligence: { lowestPriceFound: 230 }, truthFoundation: conflictFoundation };
const conflictGate = applyTruthConfidenceGate({
  tier: "STRONG BUY",
  verdict: "BUY READY",
  confidence: 90,
  truthBundle: computeTruthConfidence(conflictIntel),
});
assert.equal(conflictGate.tier, "WAIT");
assert.ok(
  conflictGate.gatesApplied.some(
    (g) => g.includes("availability_conflict") || g.includes("cross_merchant_agreement")
  )
);
pass("conflict_or_weak_agreement_downgrade");

const sources = buildExtendedTruthEvidenceSources(intel);
assert.equal(sources.merchantCount, 4);
assert.equal(sources.listingPriceOutlier, true);
pass("gate_reads_snapshot_fields");

assert.ok(PRICE_OUTLIER_HIGH_RATIO >= 1.2);
console.log(`\nPhase 1F cross-merchant truth: ${passed} checks passed.`);
