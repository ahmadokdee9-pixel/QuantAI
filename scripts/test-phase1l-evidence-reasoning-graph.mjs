#!/usr/bin/env node
/**
 * Phase 1L — Evidence reasoning graph tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildEvidenceReasoningGraph,
  CONFLICTING_EVIDENCE_GATE_THRESHOLD,
  WEAK_EVIDENCE_COMPLETENESS_THRESHOLD,
  WEAK_EVIDENCE_STRENGTH_THRESHOLD,
} from "../lib/truth/evidenceReasoningGraph.ts";
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

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("evidenceReasoningGraph"), "no UI evidence graph import");
pass("no_ui_redesign");

const now = new Date("2026-06-12T12:00:00.000Z");
function daysAgo(days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

const SKU = "bm:evidencereasoning";
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

const graph = foundation.evidenceReasoningGraph;
assert.ok(graph);
assert.equal(graph.evidenceChain.length, 9);
assert.ok(graph.evidenceChain.includes("sku_identity"));
assert.ok(graph.evidenceChain.includes("commerce_reasoning"));
assert.ok(graph.supportingEvidence.length > 0);
assert.ok(graph.evidenceCompleteness >= WEAK_EVIDENCE_COMPLETENESS_THRESHOLD);
assert.ok(["EVIDENCE_STRONG", "EVIDENCE_GOOD", "EVIDENCE_PARTIAL"].includes(graph.evidenceState));
pass("evidence_graph_rollup");

assert.ok(foundation.evidenceReasoningGraph.evidenceChain.length === 9);
assert.ok(foundation.evidenceReasoningGraph.evidenceStrength > 0);
pass("snapshot_evidence_graph_block");

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
  merchantReliabilityScore: 30,
  merchantAvailabilityReliability: 28,
  merchantPricingReliability: 26,
  merchantFreshnessReliability: 32,
  merchantVolatilityScore: 72,
  merchantState: "UNRELIABLE",
};

const weakBase = {
  ...foundation,
  skuIdentityConfidence: 36,
  priceTruthConfidence: 20,
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

assert.ok(weakGraph.evidenceStrength < WEAK_EVIDENCE_STRENGTH_THRESHOLD);
assert.ok(weakGraph.evidenceCompleteness < WEAK_EVIDENCE_COMPLETENESS_THRESHOLD || weakGraph.conflictingEvidence.length >= CONFLICTING_EVIDENCE_GATE_THRESHOLD);
assert.ok(weakGraph.conflictingEvidence.length >= CONFLICTING_EVIDENCE_GATE_THRESHOLD);
assert.ok(["EVIDENCE_WEAK", "EVIDENCE_UNKNOWN", "EVIDENCE_PARTIAL"].includes(weakGraph.evidenceState));
pass("weak_evidence_detection");

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
    evidenceReasoningGraph: weakGraph,
  },
};

const weakGate = applyTruthConfidenceGate({
  tier: "BUY READY",
  verdict: "BUY READY",
  confidence: 85,
  truthBundle: computeTruthConfidence(weakIntel),
});
assert.ok(["COMPARE", "WAIT"].includes(weakGate.tier));
assert.ok(weakGate.gatesApplied.includes("downgrade_weak_evidence_strength"));
assert.ok(
  weakGate.gatesApplied.some(
    (g) => g.includes("incomplete_evidence") || g.includes("conflicting_evidence")
  )
);
pass("evidence_quality_downgrade");

const sources = buildExtendedTruthEvidenceSources(weakIntel);
assert.ok(sources.hasEvidenceReasoningGraph);
assert.ok(sources.evidenceStrength < WEAK_EVIDENCE_STRENGTH_THRESHOLD);
assert.ok(sources.conflictingEvidenceCount >= CONFLICTING_EVIDENCE_GATE_THRESHOLD);
pass("gate_reads_evidence_graph");

console.log(`\nPhase 1L evidence reasoning graph: ${passed} checks passed.`);
