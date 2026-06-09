#!/usr/bin/env node
/**
 * Phase 1B.2 — Availability intelligence layer tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  classifyAvailability,
  classifySerpApiShoppingRow,
  classifiedLabelToDbStatus,
  parseSerpApiAvailabilitySignals,
} from "../lib/truth/availabilityClassifier.ts";
import {
  computeFreshnessScoreFromAgeHours,
  computeFreshnessScoreFromObservedAt,
} from "../lib/truth/freshnessScore.ts";
import {
  detectAvailabilityChanges,
  DEFAULT_MAJOR_PRICE_DROP_PCT,
} from "../lib/truth/availabilityChangeDetector.ts";
import {
  buildNormalizedAvailabilityObservation,
  matchListingInSearchResults,
  normalizeListingUrlForMatch,
} from "../lib/truth/listingRefreshAdapter.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

// ── Wiring guards: no UI / verdict / cron ─────────────────────────────────────
const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("availabilityIntelligence"), "ProductResultsSurface not wired to 1B.2");
assert.ok(!surface.includes("listingRefreshAdapter"), "no refresh adapter in UI");

const truthGate = readFileSync(join(process.cwd(), "lib/truth/truthConfidenceGate.ts"), "utf8");
assert.ok(!truthGate.includes("freshnessScore"), "Phase 1A truth gate unchanged");

const cronFiles = ["vercel.json"];
for (const rel of cronFiles) {
  try {
    readFileSync(join(process.cwd(), rel), "utf8");
    pass("cron_schedule_present");
  } catch {
    console.warn(`[WARN] ${rel} missing — cron scheduling not configured`);
  }
}
assert.ok(
  readFileSync(join(process.cwd(), "app/api/cron/refresh-listings/route.ts"), "utf8").includes("runRefreshWorker"),
  "cron route invokes refresh worker"
);
pass("cron_route_wired");

// ── Classifier: SerpApi signals ───────────────────────────────────────────────
const inStockRow = {
  title: "AirPods Pro 2",
  extensions: ["In stock"],
  delivery: "Free delivery",
};
const inStockSignals = parseSerpApiAvailabilitySignals(inStockRow);
assert.equal(inStockSignals.availabilityText, "In stock");
assert.equal(classifySerpApiShoppingRow(inStockRow).label, "IN_STOCK");
pass("serpapi_in_stock");

const oosRow = { extensions: ["Out of stock"], source: "Example Store" };
assert.equal(classifySerpApiShoppingRow(oosRow).label, "OUT_OF_STOCK");
pass("serpapi_out_of_stock");

const limitedRow = { extensions: ["Only 2 left in stock"] };
assert.equal(classifySerpApiShoppingRow(limitedRow).label, "LIMITED");
pass("serpapi_limited");

const preorderRow = { extensions: ["Preorder"] };
assert.equal(classifySerpApiShoppingRow(preorderRow).label, "LIMITED");
pass("serpapi_preorder_limited");

assert.equal(
  classifyAvailability({ structuralLabel: "REMOVED" }).label,
  "REMOVED"
);
assert.equal(classifiedLabelToDbStatus("IN_STOCK"), "in_stock");
assert.equal(classifiedLabelToDbStatus("SELLER_UNAVAILABLE"), "seller_unavailable");
pass("classifier_structural_and_db_map");

// ── Freshness scoring ─────────────────────────────────────────────────────────
assert.equal(computeFreshnessScoreFromAgeHours(0), 100);
assert.equal(computeFreshnessScoreFromAgeHours(23.9), 100);
assert.equal(computeFreshnessScoreFromAgeHours(24), 80);
assert.equal(computeFreshnessScoreFromAgeHours(47.9), 80);
assert.equal(computeFreshnessScoreFromAgeHours(48), 60);
assert.equal(computeFreshnessScoreFromAgeHours(71.9), 60);
assert.equal(computeFreshnessScoreFromAgeHours(72), 30);
assert.equal(computeFreshnessScoreFromAgeHours(200), 30);
pass("freshness_age_bands");

const now = new Date("2026-06-03T12:00:00.000Z");
const fresh = computeFreshnessScoreFromObservedAt("2026-06-03T06:00:00.000Z", now);
assert.equal(fresh.freshnessScore, 100);
assert.equal(fresh.band, "fresh");
pass("freshness_from_timestamp");

// ── Change detector ───────────────────────────────────────────────────────────
const priorInStock = {
  availability: "in_stock",
  current_price: 200,
  observed_at: "2026-06-01T00:00:00.000Z",
};
const nextOos = {
  availability: "out_of_stock",
  current_price: 200,
  observed_at: "2026-06-03T00:00:00.000Z",
};
const stockOut = detectAvailabilityChanges({ prior: priorInStock, next: nextOos });
assert.ok(stockOut.changes.includes("stock_in_to_out"));
assert.ok(stockOut.alerts.some((a) => a.type === "out_of_stock"));
pass("change_stock_in_to_out");

const nextBack = {
  availability: "in_stock",
  current_price: 200,
  observed_at: "2026-06-04T00:00:00.000Z",
};
const restock = detectAvailabilityChanges({ prior: nextOos, next: nextBack });
assert.ok(restock.changes.includes("stock_out_to_in"));
assert.ok(restock.alerts.some((a) => a.type === "back_in_stock"));
pass("change_back_in_stock");

const removed = detectAvailabilityChanges({
  prior: priorInStock,
  next: { availability: "removed", current_price: null, observed_at: nextOos.observed_at },
});
assert.ok(removed.changes.includes("listing_removed"));
pass("change_listing_removed");

const sellerGone = detectAvailabilityChanges({
  prior: priorInStock,
  next: {
    availability: "seller_unavailable",
    current_price: 200,
    observed_at: nextOos.observed_at,
  },
});
assert.ok(sellerGone.changes.includes("seller_disappeared"));
pass("change_seller_disappeared");

const priceDrop = detectAvailabilityChanges({
  prior: priorInStock,
  next: {
    availability: "in_stock",
    current_price: 180,
    observed_at: nextOos.observed_at,
  },
  majorPriceDropPct: DEFAULT_MAJOR_PRICE_DROP_PCT,
});
assert.ok(priceDrop.changes.includes("price_drop_major"));
assert.ok(priceDrop.alerts.some((a) => a.type === "price_dropped"));
pass("change_major_price_drop");

// ── Refresh adapter ───────────────────────────────────────────────────────────
const target = {
  listingUrl: "https://shop.example/item/abc/",
  title: "Apple AirPods Pro 2 USB-C",
  store: "Coolblue",
  referencePrice: 219,
};

const product = {
  id: 1,
  title: "Apple AirPods Pro 2 USB-C",
  store: "Coolblue",
  price: 219,
  displayPrice: "€219",
  rating: 4.7,
  link: "https://shop.example/item/abc",
  image: "",
  reviewsCount: 100,
  shipping: "Free delivery",
  availability: "In stock",
  oldPrice: null,
  priceTrend: "stable",
  extensions: ["In stock"],
};

assert.equal(
  normalizeListingUrlForMatch("https://Shop.EXAMPLE/item/abc/"),
  normalizeListingUrlForMatch("https://shop.example/item/abc")
);
const exactMatch = matchListingInSearchResults(target, [product]);
assert.equal(exactMatch.matched, true);
assert.equal(exactMatch.matchReason, "exact_link");
pass("adapter_exact_link_match");

const observedNow = new Date().toISOString();
const normalized = buildNormalizedAvailabilityObservation({
  target,
  products: [product],
  source: "manual",
  observedAt: observedNow,
  prior: priorInStock,
});
assert.equal(normalized.availability, "in_stock");
assert.equal(normalized.classifiedLabel, "IN_STOCK");
assert.equal(normalized.freshness_score, 100);
assert.equal(normalized.source, "manual");
assert.equal(normalized.listing_url, target.listingUrl);
pass("adapter_normalized_observation");

const miss = buildNormalizedAvailabilityObservation({
  target,
  products: [
    {
      ...product,
      link: "https://shop.example/other",
      store: "Bol.com",
    },
  ],
  source: "manual",
});
assert.equal(miss.classifiedLabel, "REMOVED");
assert.equal(miss.availability, "removed");
pass("adapter_listing_removed_miss");

const sellerMiss = buildNormalizedAvailabilityObservation({
  target,
  products: [{ ...product, link: "https://shop.example/other-item", title: "Different SKU" }],
  source: "manual",
});
assert.equal(sellerMiss.classifiedLabel, "SELLER_UNAVAILABLE");
pass("adapter_seller_unavailable");

console.log(`\nPhase 1B.2 availability intelligence: ${passed} checks passed.`);
