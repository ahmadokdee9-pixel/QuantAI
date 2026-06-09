#!/usr/bin/env node
/**
 * Phase 1E — Truth foundation stabilization tests (offline + regression hooks).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  deriveAvailabilityState,
  isStaleAvailabilityState,
  isUnavailableAvailabilityState,
} from "../lib/truth/availabilityStateModel.ts";
import {
  buildTruthFoundationSnapshot,
  buildExtendedTruthEvidenceSources,
} from "../lib/truth/truthEvidenceBuilder.ts";
import {
  applyTruthConfidenceGate,
  computeTruthConfidence,
} from "../lib/truth/truthConfidenceGate.ts";
import {
  parseTruthFoundationPrefetch,
  serializeTruthFoundationPrefetch,
} from "../lib/truth/truthFoundationLoader.ts";
import { isTruthDebugEnabled, buildTruthDebugTrace } from "../lib/truth/truthDebug.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("availabilityStateModel"), "no direct UI model import");
assert.ok(surface.includes("parseTruthFoundationPrefetch"), "prefetch wired via searchMeta");
pass("ui_data_wiring_only");

const searchRoute = readFileSync(join(process.cwd(), "app/api/search/route.ts"), "utf8");
assert.ok(searchRoute.includes("prefetchTruthFoundationBatch"), "search route prefetches truth foundation");
assert.ok(searchRoute.includes("truthFoundationPrefetch"), "search meta includes prefetch");
pass("search_prefetch_wired");

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

const observedAt = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
const prefetchEntry = {
  listingUrl: product.link,
  canonicalSkuId: "bm:testsku123",
  skuIdentityConfidence: 82,
  availabilityObservation: {
    id: "obs-1",
    listing_url: product.link,
    sku_id: "bm:testsku123",
    observed_at: observedAt,
    availability: "in_stock",
    availability_text: "In stock",
    current_price: 200,
    shipping_price: null,
    source: "cron_refresh",
    freshness_score: 80,
    created_at: observedAt,
  },
  priceObservations: [
    {
      id: "hp-1",
      canonical_sku_id: "bm:testsku123",
      merchant_key: "amazon",
      listing_url: product.link,
      observed_price: 245,
      currency: "EUR",
      observed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      availability_status: "in_stock",
      source: "cron_refresh",
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "hp-2",
      canonical_sku_id: "bm:testsku123",
      merchant_key: "amazon",
      listing_url: product.link,
      observed_price: 238,
      currency: "EUR",
      observed_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      availability_status: "in_stock",
      source: "cron_refresh",
      created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "hp-3",
      canonical_sku_id: "bm:testsku123",
      merchant_key: "walmart",
      listing_url: "https://walmart.com/ip/Y",
      observed_price: 232,
      currency: "EUR",
      observed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      availability_status: "in_stock",
      source: "cron_refresh",
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  availabilityDataSource: "db",
  priceHistoryDataSource: "db",
};

const foundation = buildTruthFoundationSnapshot({
  product,
  listingUrl: product.link,
  prefetch: prefetchEntry,
});

assert.equal(foundation.canonicalSkuId, "bm:testsku123");
assert.equal(foundation.availabilityState, "STALE");
assert.ok(foundation.availability.listingAgeHours >= 29);
assert.ok(foundation.priceTruthConfidence > 0);
assert.ok(foundation.baselineCoverage);
assert.ok(foundation.discountEvidence);
pass("snapshot_from_db_prefetch");

const unavailableFoundation = buildTruthFoundationSnapshot({
  product: { ...product, availability: "Out of stock" },
  listingUrl: product.link,
  prefetch: {
    ...prefetchEntry,
    availabilityObservation: {
      ...prefetchEntry.availabilityObservation,
      availability: "out_of_stock",
      availability_text: "Out of stock",
    },
  },
});
assert.equal(unavailableFoundation.availabilityState, "UNAVAILABLE");
pass("unavailable_state_model");

const unknownFoundation = buildTruthFoundationSnapshot({
  product,
  listingUrl: product.link,
});
assert.equal(unknownFoundation.availabilityState, "UNKNOWN");
assert.equal(unknownFoundation.availability.observedAt, null);
pass("inline_unknown_without_db");

assert.equal(deriveAvailabilityState({
  availabilityStatus: "in_stock",
  listingAgeHours: 2,
  freshnessScore: 100,
  hasObservation: true,
}), "AVAILABLE");
assert.ok(isStaleAvailabilityState("STALE"));
assert.ok(isUnavailableAvailabilityState("UNAVAILABLE"));
pass("availability_state_derivation");

const intel = {
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

const sources = buildExtendedTruthEvidenceSources(intel);
assert.equal(sources.availabilityState, "STALE");
assert.equal(sources.canonicalSkuId, "bm:testsku123");
assert.equal(sources.priceHistorySamples, foundation.baselineCoverage?.samples90d ?? 0);
pass("gate_consumes_snapshot");

const staleGate = applyTruthConfidenceGate({
  tier: "BUY READY",
  verdict: "BUY READY",
  confidence: 88,
  truthBundle: computeTruthConfidence(intel),
});
assert.equal(staleGate.tier, "WAIT");
assert.ok(staleGate.gatesApplied.some((g) => g.includes("stale")));
pass("stale_observation_downgrade");

const serialized = serializeTruthFoundationPrefetch(new Map([[product.link, prefetchEntry]]));
const parsed = parseTruthFoundationPrefetch(serialized);
assert.ok(parsed.get(product.link)?.priceObservations.length === 3);
pass("prefetch_serialize_parse");

const prevDebug = process.env.TRUTH_DEBUG;
process.env.TRUTH_DEBUG = "true";
assert.equal(isTruthDebugEnabled(), true);
assert.ok(buildTruthDebugTrace({
  listingUrl: product.link,
  canonicalSkuId: "bm:testsku123",
  availabilityState: "STALE",
  dataSources: { availability: "db", priceHistory: "db" },
  listingAgeHours: 30,
  freshnessScore: 80,
  priceObservationCount: 3,
  skuIdentityConfidence: 82,
  priceTruthConfidence: 50,
  discountState: "NO_DISCOUNT",
}));
process.env.TRUTH_DEBUG = prevDebug;
pass("truth_debug_trace");

console.log(`\nPhase 1E truth foundation stabilization: ${passed} checks passed.`);
