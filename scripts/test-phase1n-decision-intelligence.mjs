#!/usr/bin/env node
/**
 * Phase 1N — Decision intelligence layer tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildDecisionIntelligenceLayer,
  ELEVATED_DECISION_RISK_THRESHOLD,
  WEAK_DECISION_CONFIDENCE_THRESHOLD,
  WEAK_DECISION_SCORE_THRESHOLD,
} from "../lib/truth/decisionIntelligenceLayer.ts";
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
import { buildUnifiedTrustEngine } from "../lib/truth/unifiedTrustEngine.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("decisionIntelligenceLayer"), "no UI decision engine import");
pass("no_ui_redesign");

const now = new Date("2026-06-13T12:00:00.000Z");
function daysAgo(days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

const SKU = "bm:decisionengine";
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

const decision = foundation.decisionEngine;
assert.ok(decision);
assert.ok(decision.decisionScore >= WEAK_DECISION_SCORE_THRESHOLD);
assert.ok(decision.decisionSignals.length > 0);
assert.ok(decision.decisionReasons.length >= 4);
assert.ok(decision.decisionReasons.some((r) => r.startsWith("Strongest positive factor:")));
assert.ok(decision.decisionReasons.some((r) => r.startsWith("Strongest negative factor:")));
assert.ok(["BUY", "CONSIDER"].includes(decision.decisionState));
pass("decision_engine_rollup");

assert.ok(foundation.decisionEngine.decisionConfidence > 0);
pass("snapshot_decision_engine_block");

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
  decisionEngine: _d,
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
const weakDecision = buildDecisionIntelligenceLayer({
  ...weakInput,
  productIntelligence: weakProduct,
  commerceIntelligence: weakCommerce,
  commerceReasoning: weakReasoning,
  evidenceReasoningGraph: weakGraph,
  trustEngine: weakTrust,
});

assert.ok(weakDecision.decisionScore < WEAK_DECISION_SCORE_THRESHOLD);
assert.ok(weakDecision.decisionConfidence < WEAK_DECISION_CONFIDENCE_THRESHOLD);
assert.ok(weakDecision.decisionRisks.length >= ELEVATED_DECISION_RISK_THRESHOLD);
assert.ok(["AVOID", "WAIT", "UNKNOWN"].includes(weakDecision.decisionState));
pass("weak_decision_detection");

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
    decisionEngine: weakDecision,
  },
};

const weakGate = applyTruthConfidenceGate({
  tier: "BUY READY",
  verdict: "BUY READY",
  confidence: 85,
  truthBundle: computeTruthConfidence(weakIntel),
});
assert.ok(["COMPARE", "WAIT"].includes(weakGate.tier));
assert.ok(weakGate.gatesApplied.includes("downgrade_weak_decision_score"));
assert.ok(
  weakGate.gatesApplied.some(
    (g) =>
      g.includes("weak_decision_confidence") ||
      g.includes("elevated_decision_risks") ||
      g.includes("avoid_decision_state")
  )
);
pass("decision_engine_downgrade");

const sources = buildExtendedTruthEvidenceSources(weakIntel);
assert.ok(sources.hasDecisionEngine);
assert.ok(sources.decisionScore < WEAK_DECISION_SCORE_THRESHOLD);
assert.ok(sources.decisionRiskCount >= ELEVATED_DECISION_RISK_THRESHOLD);
assert.ok(sources.strongestNegativeFactor.length > 0);
pass("gate_reads_decision_engine");

console.log(`\nPhase 1N decision intelligence layer: ${passed} checks passed.`);
