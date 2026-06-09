#!/usr/bin/env node
/**
 * Phase 1D — Price history + discount verification tests (offline).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildPriceHistoryBaselines, computeBaselineCoverage } from "../lib/truth/priceHistoryEngine.ts";
import { buildReferencePriceSnapshot } from "../lib/truth/referencePriceEngine.ts";
import { detectFakeDiscount } from "../lib/truth/fakeDiscountDetector.ts";
import { verifyDiscount, computePriceTruthConfidence } from "../lib/truth/discountVerificationEngine.ts";
import { buildPriceTruthBundle } from "../lib/truth/priceTruth.ts";
import { isDuplicateHistoricalPriceObservation } from "../lib/truth/historicalPriceObservation.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("buildPriceTruthBundle"), "UI not wired");
const searchRoute = readFileSync(join(process.cwd(), "app/api/search/route.ts"), "utf8");
assert.ok(!searchRoute.includes("priceTruth"), "search route unchanged");
const truthGate = readFileSync(join(process.cwd(), "lib/truth/truthConfidenceGate.ts"), "utf8");
assert.ok(!truthGate.includes("buildPriceTruthBundle"), "truth gate unchanged (1D.5 next)");
pass("no_ui_search_verdict_wiring");

const SKU = "bm:abc123canonical";
const now = new Date("2026-06-05T12:00:00.000Z");

function daysAgo(days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

const observations = [
  { id: "1", canonical_sku_id: SKU, merchant_key: "amazon", listing_url: "https://amazon.com/dp/X", observed_price: 250, currency: "EUR", observed_at: daysAgo(120), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(120) },
  { id: "2", canonical_sku_id: SKU, merchant_key: "amazon", listing_url: "https://amazon.com/dp/X", observed_price: 245, currency: "EUR", observed_at: daysAgo(80), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(80) },
  { id: "3", canonical_sku_id: SKU, merchant_key: "amazon", listing_url: "https://amazon.com/dp/X", observed_price: 240, currency: "EUR", observed_at: daysAgo(60), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(60) },
  { id: "4", canonical_sku_id: SKU, merchant_key: "walmart", listing_url: "https://walmart.com/ip/Y", observed_price: 238, currency: "EUR", observed_at: daysAgo(45), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(45) },
  { id: "5", canonical_sku_id: SKU, merchant_key: "walmart", listing_url: "https://walmart.com/ip/Y", observed_price: 235, currency: "EUR", observed_at: daysAgo(30), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(30) },
  { id: "6", canonical_sku_id: SKU, merchant_key: "bestbuy", listing_url: "https://bestbuy.com/Z", observed_price: 232, currency: "EUR", observed_at: daysAgo(20), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(20) },
  { id: "7", canonical_sku_id: SKU, merchant_key: "target", listing_url: "https://target.com/A", observed_price: 230, currency: "EUR", observed_at: daysAgo(10), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(10) },
  { id: "8", canonical_sku_id: SKU, merchant_key: "ebay", listing_url: "https://ebay.com/B", observed_price: 228, currency: "EUR", observed_at: daysAgo(5), availability_status: "in_stock", source: "cron_refresh", created_at: daysAgo(5) },
];

const currentPrice = 200;
const baselines = buildPriceHistoryBaselines({
  canonicalSkuId: SKU,
  currentPrice,
  observations,
  now,
});
assert.equal(baselines.window90d.sampleCount, 7);
assert.ok(baselines.window90d.medianPrice != null);
assert.ok(baselines.window90d.currentPriceDeltaPct != null && baselines.window90d.currentPriceDeltaPct < 0);
pass("price_history_baselines");

const coverage = computeBaselineCoverage(baselines);
assert.equal(coverage.sufficientForVerification, true);
assert.ok(coverage.coverageScore > 0);
pass("baseline_coverage");

const refs = buildReferencePriceSnapshot(baselines);
assert.ok(refs.referencePrice90d != null);
assert.ok(refs.primaryReference != null);
assert.equal(refs.primaryWindowDays, 90);
pass("reference_prices");

const bundle = buildPriceTruthBundle({
  canonicalSkuId: SKU,
  currentPrice,
  observations,
  now,
});
assert.equal(bundle.verification.state, "VERIFIED_DISCOUNT");
assert.ok(bundle.verification.discountPctVsReference >= 8);
assert.equal(bundle.verification.qualifiedBand, "Exceptional Discount Signal");
assert.ok(!bundle.verification.qualifiedBand.toLowerCase().includes("verified discount"));
pass("verified_discount_qualified_label");

const fakeBundle = buildPriceTruthBundle({
  canonicalSkuId: SKU,
  currentPrice: 220,
  marketedOldPrice: 399,
  observations,
  now,
});
assert.ok(fakeBundle.fakeDiscount.isFake);
assert.ok(fakeBundle.fakeDiscount.flags.includes("inflated_reference_price"));
assert.equal(fakeBundle.verification.qualifiedBand, "Fake Discount Signal");
pass("fake_discount_detection");

const thinBundle = buildPriceTruthBundle({
  canonicalSkuId: SKU,
  currentPrice: 210,
  observations: observations.slice(0, 1),
  now,
});
assert.ok(thinBundle.fakeDiscount.flags.includes("insufficient_history"));
assert.equal(thinBundle.verification.state, "NO_DISCOUNT");
pass("insufficient_history");

const dupPrior = observations[0];
const dupNext = {
  canonical_sku_id: SKU,
  merchant_key: "amazon",
  observed_price: 250,
  observed_at: new Date(Date.parse(dupPrior.observed_at) + 2 * 60 * 60 * 1000).toISOString(),
};
assert.equal(isDuplicateHistoricalPriceObservation(dupPrior, dupNext), true);
pass("historical_price_dedupe");

const confidence = computePriceTruthConfidence({
  baselineCoverage: coverage,
  verification: verifyDiscount({
    currentPrice,
    baselines,
    referencePrices: refs,
    baselineCoverage: coverage,
    fakeDiscount: bundle.fakeDiscount,
  }),
  fakeDiscount: bundle.fakeDiscount,
});
assert.ok(confidence >= 50);
pass("price_truth_confidence");

console.log(`\nPhase 1D price truth: ${passed} checks passed.`);
