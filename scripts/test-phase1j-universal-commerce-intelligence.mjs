#!/usr/bin/env node
/**
 * Phase 1J — Universal commerce intelligence core tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildUniversalCommerceIntelligence,
  WEAK_COMMERCE_CONFIDENCE_THRESHOLD,
  WEAK_COMMERCE_MARKET_TRUTH_THRESHOLD,
  WEAK_COMMERCE_MERCHANT_TRUTH_THRESHOLD,
  WEAK_COMMERCE_PRODUCT_TRUTH_THRESHOLD,
} from "../lib/truth/universalCommerceIntelligence.ts";
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

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("universalCommerceIntelligence"), "no UI commerce intelligence import");
pass("no_ui_redesign");

const now = new Date("2026-06-10T12:00:00.000Z");
function daysAgo(days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

const SKU = "bm:commerceintel";
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
    availabilityObservation: null,
    priceObservations: strongObservations,
    availabilityDataSource: "inline",
    priceHistoryDataSource: "db",
  },
});

const commerce = foundation.commerceIntelligence;
assert.ok(commerce);
assert.ok(commerce.commerceConfidence >= WEAK_COMMERCE_CONFIDENCE_THRESHOLD);
assert.ok(commerce.marketConfidence >= WEAK_COMMERCE_MARKET_TRUTH_THRESHOLD);
assert.ok(["COMMERCE_STRONG", "COMMERCE_GOOD", "COMMERCE_CAUTION"].includes(commerce.commerceState));
pass("commerce_intelligence_rollup_scores");

assert.equal(foundation.commerceIntelligence.productConfidence, foundation.productIntelligence.overallProductConfidence);
assert.ok(foundation.commerceIntelligence.priceConfidence > 0);
pass("snapshot_commerce_intelligence_block");

const weakMarketRollup = buildMarketTruthRollup({
  merchantCount: 1,
  availabilityConsensus: "CONSENSUS_UNKNOWN",
  crossMerchantReferencePrice: null,
  marketPriceSpread: null,
  merchantAgreementScore: 18,
  listingPriceOutlier: false,
  priceTruthConfidence: 16,
  baselineSamples90d: 0,
  availabilityState: "UNKNOWN",
  availabilityFreshness: 35,
});

const weakMerchantReliability = {
  merchantReliabilityScore: 30,
  merchantAvailabilityReliability: 28,
  merchantPricingReliability: 26,
  merchantFreshnessReliability: 32,
  merchantVolatilityScore: 42,
  merchantState: "UNRELIABLE",
};

const weakFoundationInput = {
  ...foundation,
  skuIdentityConfidence: 36,
  priceTruthConfidence: 20,
  availabilityState: "UNKNOWN",
  availability: {
    ...foundation.availability,
    freshnessScore: 35,
  },
  merchantReliability: weakMerchantReliability,
  merchantObservationCount: 2,
  marketIntelligence: weakMarketRollup,
};

const { productIntelligence: _p, commerceIntelligence: _c, ...weakBase } = weakFoundationInput;
const weakProduct = buildProductIntelligenceFoundation(weakBase);
const weakCommerce = buildUniversalCommerceIntelligence({
  ...weakBase,
  productIntelligence: weakProduct,
});

assert.ok(weakCommerce.commerceConfidence < WEAK_COMMERCE_CONFIDENCE_THRESHOLD);
assert.ok(weakCommerce.marketConfidence < WEAK_COMMERCE_MARKET_TRUTH_THRESHOLD);
assert.ok(weakCommerce.merchantConfidence < WEAK_COMMERCE_MERCHANT_TRUTH_THRESHOLD);
assert.ok(weakCommerce.productConfidence < WEAK_COMMERCE_PRODUCT_TRUTH_THRESHOLD);
assert.ok(["COMMERCE_WEAK", "COMMERCE_UNKNOWN"].includes(weakCommerce.commerceState));
pass("weak_commerce_confidence_detection");

const weakIntel = {
  finalVerdict: "BUY READY",
  segment: null,
  segmentLabel: "",
  dimensions: [],
  productUnderstandingLine: "",
  globalPriceIntelligence: { lowestPriceFound: 228 },
  marketDepth: { marketCoverageScore: 18 },
  productIdentityV2: { identityConfidence: 36 },
  commercePriceHistory: { insight: { sampleCount: 0 } },
  truthFoundation: {
    ...weakBase,
    productIntelligence: weakProduct,
    commerceIntelligence: weakCommerce,
  },
};

const weakGate = applyTruthConfidenceGate({
  tier: "BUY READY",
  verdict: "BUY READY",
  confidence: 85,
  truthBundle: computeTruthConfidence(weakIntel),
});
assert.ok(["COMPARE", "WAIT"].includes(weakGate.tier));
assert.ok(weakGate.gatesApplied.includes("downgrade_weak_commerce_confidence"));
assert.ok(
  weakGate.gatesApplied.some(
    (g) =>
      g.includes("weak_market_truth") ||
      g.includes("weak_merchant_truth") ||
      g.includes("weak_product_truth")
  )
);
pass("commerce_intelligence_downgrade");

const sources = buildExtendedTruthEvidenceSources(weakIntel);
assert.ok(sources.hasCommerceIntelligence);
assert.ok(sources.commerceConfidence < WEAK_COMMERCE_CONFIDENCE_THRESHOLD);
assert.ok(sources.commerceProductConfidence < WEAK_COMMERCE_PRODUCT_TRUTH_THRESHOLD);
pass("gate_reads_commerce_intelligence");

console.log(`\nPhase 1J commerce intelligence: ${passed} checks passed.`);
