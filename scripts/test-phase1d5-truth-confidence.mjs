#!/usr/bin/env node
/**
 * Phase 1D.5 — Truth confidence integration tests + Phase 1 regressions.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  computeTruthConfidence,
  applyTruthConfidenceGate,
} from "../lib/truth/truthConfidenceGate.ts";
import {
  attachTruthFoundationToDecision,
  buildTruthFoundationSnapshot,
} from "../lib/truth/truthEvidenceBuilder.ts";
import {
  mapDiscountVerificationStateToLabel,
  discountEvidenceLine,
} from "../lib/truth/truthDiscountLanguage.ts";
import { buildPriceTruthBundle } from "../lib/truth/priceTruth.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const searchRoute = readFileSync(join(process.cwd(), "app/api/search/route.ts"), "utf8");
assert.ok(!searchRoute.includes("buildPriceTruthBundle"), "search route unchanged");
pass("search_route_unchanged");

const product = {
  id: 1,
  title: "Apple AirPods Pro 2 USB-C",
  store: "Amazon.com",
  price: 200,
  displayPrice: "€200",
  rating: 4.8,
  link: "https://amazon.com/dp/B0CHWRXH8B",
  image: "",
  reviewsCount: 100,
  shipping: "Free delivery",
  availability: "In stock",
  oldPrice: 250,
  priceTrend: "stable",
  extensions: ["In stock"],
};

const foundation = buildTruthFoundationSnapshot({
  product,
  listingUrl: product.link,
  searchQuery: "airpods pro 2",
});

const baseIntel = {
  finalVerdict: "BUY READY",
  segment: null,
  segmentLabel: "",
  dimensions: [],
  productUnderstandingLine: "",
  globalPriceIntelligence: { lowestPriceFound: 200 },
  marketDepth: { marketCoverageScore: 70 },
  productIdentityV2: { identityConfidence: 82 },
  commercePriceHistory: { insight: { sampleCount: 0 } },
  truthFoundation: foundation,
};

const strongBundle = computeTruthConfidence(baseIntel);
assert.ok(strongBundle.truthConfidence > 0.4);
assert.ok(strongBundle.sources.canonicalSkuId);
pass("compute_truth_confidence_with_foundation");

const staleIntel = {
  ...baseIntel,
  truthFoundation: {
    ...foundation,
    availability: {
      ...foundation.availability,
      listingAgeHours: 30,
      freshnessScore: 80,
    },
  },
};

const staleGate = applyTruthConfidenceGate({
  tier: "BUY READY",
  verdict: "BUY READY",
  confidence: 88,
  truthBundle: computeTruthConfidence(staleIntel),
});
assert.equal(staleGate.tier, "WAIT");
assert.ok(staleGate.gatesApplied.includes("downgrade_stale_listing_24h"));
pass("stale_availability_downgrade");

const unavailableIntel = {
  ...baseIntel,
  truthFoundation: {
    ...foundation,
    availability: {
      ...foundation.availability,
      availabilityStatus: "out_of_stock",
    },
  },
};
const unavailableGate = applyTruthConfidenceGate({
  tier: "STRONG BUY",
  verdict: "BUY READY",
  confidence: 90,
  truthBundle: computeTruthConfidence(unavailableIntel),
});
assert.equal(unavailableGate.verdict, "INSUFFICIENT DATA");
pass("unavailable_downgrade");

const now = new Date("2026-06-05T12:00:00.000Z");
const SKU = foundation.canonicalSkuId ?? "fp:test";
function daysAgo(days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}
const priceObservations = [
  { id: "1", canonical_sku_id: SKU, merchant_key: "amazon", listing_url: product.link, observed_price: 250, currency: "EUR", observed_at: daysAgo(120), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(120) },
  { id: "2", canonical_sku_id: SKU, merchant_key: "amazon", listing_url: product.link, observed_price: 245, currency: "EUR", observed_at: daysAgo(80), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(80) },
  { id: "3", canonical_sku_id: SKU, merchant_key: "amazon", listing_url: product.link, observed_price: 240, currency: "EUR", observed_at: daysAgo(60), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(60) },
  { id: "4", canonical_sku_id: SKU, merchant_key: "walmart", listing_url: "https://walmart.com/ip/Y", observed_price: 238, currency: "EUR", observed_at: daysAgo(45), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(45) },
  { id: "5", canonical_sku_id: SKU, merchant_key: "walmart", listing_url: "https://walmart.com/ip/Y", observed_price: 235, currency: "EUR", observed_at: daysAgo(30), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(30) },
  { id: "6", canonical_sku_id: SKU, merchant_key: "bestbuy", listing_url: "https://bestbuy.com/Z", observed_price: 232, currency: "EUR", observed_at: daysAgo(20), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(20) },
  { id: "7", canonical_sku_id: SKU, merchant_key: "target", listing_url: "https://target.com/A", observed_price: 230, currency: "EUR", observed_at: daysAgo(10), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(10) },
  { id: "8", canonical_sku_id: SKU, merchant_key: "ebay", listing_url: "https://ebay.com/B", observed_price: 228, currency: "EUR", observed_at: daysAgo(5), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(5) },
];

const fakePriceTruth = buildPriceTruthBundle({
  canonicalSkuId: SKU,
  currentPrice: 220,
  marketedOldPrice: 399,
  observations: priceObservations,
  now,
});
assert.ok(fakePriceTruth.fakeDiscount.isFake);
const fakeIntel = {
  ...baseIntel,
  truthFoundation: {
    ...foundation,
    priceTruth: fakePriceTruth,
    discountEvidence: fakePriceTruth.discountEvidence,
    baselineCoverage: fakePriceTruth.baselineCoverage,
    priceTruthConfidence: fakePriceTruth.priceTruthConfidence,
  },
};
const fakeGate = applyTruthConfidenceGate({
  tier: "BUY READY",
  verdict: "BUY READY",
  confidence: 85,
  truthBundle: computeTruthConfidence({
    ...fakeIntel,
    truthFoundation: fakeIntel.truthFoundation,
  }),
});
assert.equal(fakeGate.tier, "COMPARE");
assert.ok(fakeGate.gatesApplied.some((g) => g.includes("fake_discount")));
pass("fake_discount_downgrade");

const thinPriceTruth = buildPriceTruthBundle({
  canonicalSkuId: SKU,
  currentPrice: 210,
  observations: priceObservations.slice(0, 1),
  now,
});
const thinIntel = {
  ...baseIntel,
  truthFoundation: {
    ...foundation,
    priceTruth: thinPriceTruth,
    discountEvidence: thinPriceTruth.discountEvidence,
    baselineCoverage: thinPriceTruth.baselineCoverage,
    priceTruthConfidence: thinPriceTruth.priceTruthConfidence,
  },
};
const thinGate = applyTruthConfidenceGate({
  tier: "BUY READY",
  verdict: "BUY READY",
  confidence: 85,
  truthBundle: computeTruthConfidence(thinIntel),
});
assert.equal(thinGate.tier, "COMPARE");
assert.ok(thinGate.gatesApplied.some((g) => g.includes("insufficient_price_history")));
pass("insufficient_price_history_downgrade");

const weakSkuIntel = {
  ...baseIntel,
  truthFoundation: {
    ...foundation,
    skuIdentityConfidence: 40,
  },
};
const weakSkuGate = applyTruthConfidenceGate({
  tier: "BUY READY",
  verdict: "BUY READY",
  confidence: 80,
  truthBundle: computeTruthConfidence(weakSkuIntel),
});
assert.equal(weakSkuGate.tier, "COMPARE");
pass("weak_sku_downgrade");

const compareGate = applyTruthConfidenceGate({
  tier: "COMPARE",
  verdict: "COMPARE",
  confidence: 60,
  truthBundle: computeTruthConfidence(baseIntel),
});
assert.equal(compareGate.tier, "COMPARE");
pass("no_promotion_from_compare");

assert.equal(
  mapDiscountVerificationStateToLabel("VERIFIED_DISCOUNT"),
  "Evidence-backed discount signal"
);
assert.ok(!mapDiscountVerificationStateToLabel("VERIFIED_DISCOUNT").toLowerCase().includes("verified discount"));
assert.ok(discountEvidenceLine("NO_DISCOUNT").length > 10);
pass("qualified_discount_language");

const decision = attachTruthFoundationToDecision(
  {
    link: product.link,
    verdict: "BUY READY",
    confidence: 80,
    confidenceReason: "",
    reasonLine: "",
    primaryReason: "",
    reasonAuthority: {},
    displayChips: [],
    summaryLines: ["", ""],
    productIntelligence: baseIntel,
  },
  { product, searchQuery: "airpods" }
);
assert.ok(decision.productIntelligence?.truthFoundation?.canonicalSkuId);
pass("attach_truth_foundation");

console.log("\n--- Phase regressions ---");
const regressions = [
  ["1B availability", "npm run test:phase1b-availability-intelligence"],
  ["1B refresh worker", "npm run test:phase1b-refresh-worker"],
  ["1C SKU identity", "npm run test:phase1c-sku-identity"],
  ["1D price truth", "npm run test:phase1d-price-truth"],
];

console.log(`Phase 1D.5 truth confidence: ${passed} checks passed.`);
console.log("Run regressions:");
for (const [, cmd] of regressions) console.log(`  ${cmd}`);
