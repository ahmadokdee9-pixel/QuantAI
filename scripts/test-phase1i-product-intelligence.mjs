#!/usr/bin/env node
/**
 * Phase 1I — Universal product intelligence foundation tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildProductIntelligenceFoundation,
  computeProductTruthConfidence,
  WEAK_OVERALL_PRODUCT_CONFIDENCE_THRESHOLD,
  WEAK_PRODUCT_MARKET_CONFIDENCE_THRESHOLD,
  WEAK_PRODUCT_MERCHANT_CONFIDENCE_THRESHOLD,
  WEAK_PRODUCT_TRUTH_CONFIDENCE_THRESHOLD,
} from "../lib/truth/productIntelligenceFoundation.ts";
import {
  buildTruthFoundationSnapshot,
  buildExtendedTruthEvidenceSources,
} from "../lib/truth/truthEvidenceBuilder.ts";
import {
  applyTruthConfidenceGate,
  computeTruthConfidence,
} from "../lib/truth/truthConfidenceGate.ts";
import { buildMarketTruthRollup } from "../lib/truth/marketTruthRollup.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("productIntelligenceFoundation"), "no UI product intelligence import");
pass("no_ui_redesign");

const now = new Date("2026-06-09T12:00:00.000Z");
function daysAgo(days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

const SKU = "bm:productintelligence";
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

const productIntelligence = foundation.productIntelligence;
assert.equal(productIntelligence.canonicalSkuId, SKU);
assert.ok(productIntelligence.overallProductConfidence >= WEAK_OVERALL_PRODUCT_CONFIDENCE_THRESHOLD);
assert.ok(productIntelligence.marketConfidence >= WEAK_PRODUCT_MARKET_CONFIDENCE_THRESHOLD);
assert.ok(["PRODUCT_CONFIDENT", "PRODUCT_CAUTION"].includes(productIntelligence.intelligenceState));
assert.ok(computeProductTruthConfidence(productIntelligence) >= WEAK_PRODUCT_TRUTH_CONFIDENCE_THRESHOLD);
pass("product_intelligence_rollup_scores");

assert.ok(foundation.productIntelligence);
assert.equal(foundation.productIntelligence.canonicalSkuId, SKU);
assert.ok(foundation.productIntelligence.skuIdentityConfidence > 0);
pass("snapshot_product_intelligence_block");

const weakMarketRollup = buildMarketTruthRollup({
  merchantCount: 1,
  availabilityConsensus: "CONSENSUS_UNKNOWN",
  crossMerchantReferencePrice: null,
  marketPriceSpread: null,
  merchantAgreementScore: 20,
  listingPriceOutlier: false,
  priceTruthConfidence: 18,
  baselineSamples90d: 0,
  availabilityState: "UNKNOWN",
  availabilityFreshness: 40,
});

const weakFoundation = buildTruthFoundationSnapshot({
  product: { ...product, price: 228 },
  listingUrl: product.link,
  prefetch: {
    listingUrl: product.link,
    canonicalSkuId: SKU,
    skuIdentityConfidence: 38,
    availabilityObservation: null,
    priceObservations: strongObservations.slice(0, 1),
    availabilityDataSource: "inline",
    priceHistoryDataSource: "db",
  },
});

const weakMerchantReliability = {
  merchantReliabilityScore: 32,
  merchantAvailabilityReliability: 30,
  merchantPricingReliability: 28,
  merchantFreshnessReliability: 35,
  merchantVolatilityScore: 40,
  merchantState: "UNRELIABLE",
};

const weakProduct = buildProductIntelligenceFoundation({
  ...weakFoundation,
  skuIdentityConfidence: 38,
  priceTruthConfidence: 22,
  merchantReliability: weakMerchantReliability,
  merchantObservationCount: 2,
  marketIntelligence: weakMarketRollup,
  availabilityState: "UNKNOWN",
  availability: {
    ...weakFoundation.availability,
    freshnessScore: 40,
  },
});

assert.ok(weakProduct.overallProductConfidence < WEAK_OVERALL_PRODUCT_CONFIDENCE_THRESHOLD);
assert.ok(weakProduct.marketConfidence < WEAK_PRODUCT_MARKET_CONFIDENCE_THRESHOLD);
assert.ok(weakProduct.merchantReliabilityConfidence < WEAK_PRODUCT_MERCHANT_CONFIDENCE_THRESHOLD);
assert.ok(computeProductTruthConfidence(weakProduct) < WEAK_PRODUCT_TRUTH_CONFIDENCE_THRESHOLD);
assert.ok(["PRODUCT_WEAK", "PRODUCT_UNKNOWN"].includes(weakProduct.intelligenceState));
pass("weak_product_confidence_detection");

const weakIntel = {
  finalVerdict: "BUY READY",
  segment: null,
  segmentLabel: "",
  dimensions: [],
  productUnderstandingLine: "",
  globalPriceIntelligence: { lowestPriceFound: 228 },
  marketDepth: { marketCoverageScore: 20 },
  productIdentityV2: { identityConfidence: 38 },
  commercePriceHistory: { insight: { sampleCount: 0 } },
  truthFoundation: {
    ...weakFoundation,
    skuIdentityConfidence: 38,
    priceTruthConfidence: 22,
    merchantReliability: weakMerchantReliability,
    merchantObservationCount: 2,
    marketIntelligence: weakMarketRollup,
    availabilityState: "UNKNOWN",
    availability: {
      ...weakFoundation.availability,
      freshnessScore: 40,
    },
    productIntelligence: weakProduct,
  },
};

const weakGate = applyTruthConfidenceGate({
  tier: "BUY READY",
  verdict: "BUY READY",
  confidence: 85,
  truthBundle: computeTruthConfidence(weakIntel),
});
assert.ok(["COMPARE", "WAIT"].includes(weakGate.tier));
assert.ok(weakGate.gatesApplied.includes("downgrade_weak_overall_product_confidence"));
assert.ok(
  weakGate.gatesApplied.some(
    (g) =>
      g.includes("weak_product_market_confidence") ||
      g.includes("weak_product_merchant_confidence") ||
      g.includes("weak_product_truth_confidence")
  )
);
pass("product_intelligence_downgrade");

const sources = buildExtendedTruthEvidenceSources({
  ...weakIntel,
  truthFoundation: weakIntel.truthFoundation,
});
assert.ok(sources.hasProductIntelligence);
assert.ok(sources.overallProductConfidence < WEAK_OVERALL_PRODUCT_CONFIDENCE_THRESHOLD);
assert.ok(sources.productTruthConfidence < WEAK_PRODUCT_TRUTH_CONFIDENCE_THRESHOLD);
pass("gate_reads_product_intelligence");

console.log(`\nPhase 1I product intelligence: ${passed} checks passed.`);
