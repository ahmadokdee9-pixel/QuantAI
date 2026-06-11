#!/usr/bin/env node
/**
 * Phase 1K — Autonomous commerce reasoning layer tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCommerceReasoningLayer,
  isHighPrimaryRisk,
  WEAK_COMMERCE_REASONING_CONFIDENCE_THRESHOLD,
} from "../lib/truth/commerceReasoningLayer.ts";
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

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("commerceReasoningLayer"), "no UI commerce reasoning import");
pass("no_ui_redesign");

const now = new Date();
function daysAgo(days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}
function hoursAgo(hours) {
  return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
}

const SKU = "bm:commercereasoning";
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
      observed_at: hoursAgo(6),
      availability: "in_stock",
      availability_text: "In stock",
      current_price: 228,
      shipping_price: null,
      source: "cron_refresh",
      freshness_score: 100,
      created_at: hoursAgo(6),
    },
    priceObservations: strongObservations,
    availabilityDataSource: "db",
    priceHistoryDataSource: "db",
  },
});

const reasoning = foundation.commerceReasoning;
assert.ok(reasoning);
assert.ok(reasoning.strongestPositiveSignal.length > 0);
assert.ok(reasoning.reasoningConfidence >= 40);
assert.ok(
  ["COMMERCE_REASONING_STRONG", "COMMERCE_REASONING_GOOD", "COMMERCE_REASONING_CAUTION"].includes(
    reasoning.reasoningState
  )
);
pass("commerce_reasoning_rollup");

assert.equal(foundation.commerceReasoning.primaryRisk, reasoning.primaryRisk);
assert.ok(foundation.commerceReasoning.secondaryRisk);
pass("snapshot_commerce_reasoning_block");

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
  merchantVolatilityScore: 70,
  merchantState: "UNRELIABLE",
};

const weakBase = {
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

const { productIntelligence: _p, commerceIntelligence: _c, commerceReasoning: _r, ...weakInput } = weakBase;
const weakProduct = buildProductIntelligenceFoundation(weakInput);
const weakCommerce = buildUniversalCommerceIntelligence({ ...weakInput, productIntelligence: weakProduct });
const weakReasoning = buildCommerceReasoningLayer({
  ...weakInput,
  productIntelligence: weakProduct,
  commerceIntelligence: weakCommerce,
});

assert.ok(weakReasoning.reasoningConfidence < WEAK_COMMERCE_REASONING_CONFIDENCE_THRESHOLD);
assert.ok(isHighPrimaryRisk(weakReasoning.primaryRisk) || weakReasoning.primaryRisk !== "none");
assert.ok(["COMMERCE_REASONING_WEAK", "COMMERCE_REASONING_UNKNOWN", "COMMERCE_REASONING_CAUTION"].includes(weakReasoning.reasoningState));
assert.ok(weakReasoning.strongestNegativeSignal.length > 0);
pass("weak_reasoning_detection");

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
    ...weakInput,
    productIntelligence: weakProduct,
    commerceIntelligence: weakCommerce,
    commerceReasoning: weakReasoning,
  },
};

const weakGate = applyTruthConfidenceGate({
  tier: "BUY READY",
  verdict: "BUY READY",
  confidence: 85,
  truthBundle: computeTruthConfidence(weakIntel),
});
assert.ok(["COMPARE", "WAIT"].includes(weakGate.tier));
assert.ok(weakGate.gatesApplied.includes("downgrade_weak_commerce_reasoning"));
assert.ok(
  weakGate.gatesApplied.some(
    (g) => g.includes("primary_commerce_risk") || g.includes("reasoning_uncertainty")
  )
);
pass("commerce_reasoning_downgrade");

const sources = buildExtendedTruthEvidenceSources(weakIntel);
assert.ok(sources.hasCommerceReasoning);
assert.ok(sources.reasoningConfidence < WEAK_COMMERCE_REASONING_CONFIDENCE_THRESHOLD);
assert.ok(sources.primaryRisk !== "none");
assert.ok(sources.strongestNegativeSignal.length > 0);
pass("gate_reads_commerce_reasoning");

console.log(`\nPhase 1K commerce reasoning: ${passed} checks passed.`);
