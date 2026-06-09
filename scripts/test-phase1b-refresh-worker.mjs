#!/usr/bin/env node
/**
 * Phase 1B.3 — Refresh worker layer tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  dedupeRefreshCandidates,
  dedupeRefreshJobTargets,
  attachObservationMeta,
} from "../lib/truth/refreshQueue.ts";
import {
  computeRefreshJobPriority,
  isListingRefreshEligible,
  scheduleRefreshJobs,
} from "../lib/truth/refreshScheduler.ts";
import { readRefreshWorkerConfig, buildRefreshSearchQuery } from "../lib/truth/refreshJobTypes.ts";
import {
  isDuplicateAvailabilityObservation,
  runRefreshWorker,
} from "../lib/truth/refreshWorker.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const now = new Date("2026-06-05T12:00:00.000Z");
const config = {
  enabled: true,
  batchSize: 3,
  staleHours: 24,
  minRefreshIntervalHours: 24,
  maxRetries: 1,
  retryDelayMs: 10,
  serpApiDelayMs: 0,
  sourcePriorities: { watchlist: 100, saved: 90 },
};

// ── No UI / verdict wiring ────────────────────────────────────────────────────
const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("runRefreshWorker"), "UI not wired to refresh worker");
const truthGate = readFileSync(join(process.cwd(), "lib/truth/truthConfidenceGate.ts"), "utf8");
assert.ok(!truthGate.includes("refreshWorker"), "truth gate unchanged");
pass("no_ui_verdict_wiring");

// ── Queue deduplication ─────────────────────────────────────────────────────
const dedupedCandidates = dedupeRefreshCandidates([
  {
    listingUrl: "https://shop.example/a/",
    title: "Product A",
    store: "Coolblue",
    skuId: null,
    searchQuery: null,
    referencePrice: 100,
    source: "saved",
    lastCheckedAt: null,
  },
  {
    listingUrl: "https://shop.example/a",
    title: "Product A",
    store: "Coolblue",
    skuId: null,
    searchQuery: null,
    referencePrice: 100,
    source: "watchlist",
    lastCheckedAt: null,
  },
]);
assert.equal(dedupedCandidates.length, 1);
assert.equal(dedupedCandidates[0].source, "watchlist");
pass("dedupe_candidates_watchlist_wins");

const jobs = dedupeRefreshJobTargets([
  {
    jobId: "a",
    listingUrl: "https://shop.example/a",
    title: "A",
    store: "S",
    skuId: null,
    searchQuery: null,
    referencePrice: 1,
    source: "watchlist",
    priority: 10,
    lastObservedAt: null,
    freshnessScore: null,
    ageHours: null,
  },
  {
    jobId: "b",
    listingUrl: "https://shop.example/a/",
    title: "A",
    store: "S",
    skuId: null,
    searchQuery: null,
    referencePrice: 1,
    source: "saved",
    priority: 9,
    lastObservedAt: null,
    freshnessScore: null,
    ageHours: null,
  },
]);
assert.equal(jobs.length, 1);
pass("dedupe_job_targets");

// ── Scheduler: stale first ────────────────────────────────────────────────────
const staleTarget = {
  jobId: "stale",
  listingUrl: "https://shop.example/stale",
  title: "Stale Item",
  store: "Store",
  skuId: null,
  searchQuery: null,
  referencePrice: 50,
  source: "watchlist",
  priority: 0,
  lastObservedAt: "2026-06-01T00:00:00.000Z",
  freshnessScore: 30,
  ageHours: 100,
};
const freshTarget = {
  ...staleTarget,
  jobId: "fresh",
  listingUrl: "https://shop.example/fresh",
  lastObservedAt: "2026-06-05T10:00:00.000Z",
  freshnessScore: 100,
  ageHours: 2,
};

assert.equal(isListingRefreshEligible(freshTarget, config, now), false);
assert.equal(isListingRefreshEligible(staleTarget, config, now), true);
assert.ok(computeRefreshJobPriority(staleTarget, config, now) > computeRefreshJobPriority(freshTarget, config, now));

const scheduled = scheduleRefreshJobs([freshTarget, staleTarget], config, now);
assert.equal(scheduled.length, 1);
assert.equal(scheduled[0].listingUrl, "https://shop.example/stale");
pass("scheduler_stale_first");

// ── Duplicate observation guard ───────────────────────────────────────────────
const prior = {
  id: "obs-1",
  listing_url: "https://shop.example/a",
  sku_id: null,
  observed_at: "2026-06-04T00:00:00.000Z",
  availability: "in_stock",
  availability_text: "In stock",
  current_price: 200,
  shipping_price: null,
  source: "cron_refresh",
  freshness_score: 80,
  created_at: "2026-06-04T00:00:00.000Z",
};
const duplicateNext = {
  listing_url: prior.listing_url,
  sku_id: null,
  observed_at: now.toISOString(),
  availability: "in_stock",
  availability_text: "In stock",
  current_price: 200,
  shipping_price: null,
  source: "cron_refresh",
  freshness_score: 100,
  classifiedLabel: "IN_STOCK",
  classification: { label: "IN_STOCK", availabilityText: "In stock", matchedSignals: [] },
  matchConfidence: 1,
  changeDetection: { changes: [], alerts: [], priceDeltaPct: null, priorLabel: "IN_STOCK", nextLabel: "IN_STOCK" },
};
assert.equal(isDuplicateAvailabilityObservation(prior, duplicateNext), true);
pass("duplicate_observation_skip");

// ── Worker run (mocked) ───────────────────────────────────────────────────────
const product = {
  id: 1,
  title: "Stale Item",
  store: "Store",
  price: 49,
  displayPrice: "€49",
  rating: 4.5,
  link: "https://shop.example/stale",
  image: "",
  reviewsCount: 10,
  shipping: "Free delivery",
  availability: "In stock",
  oldPrice: null,
  priceTrend: "stable",
  extensions: ["In stock"],
};

const report = await runRefreshWorker(config, {
  now: () => now,
  sleep: async () => {},
  loadTargets: async () => [staleTarget],
  fetchProducts: async () => [product],
  getLatestObservations: async () => new Map(),
  insertObservation: async (payload) => ({
    id: "new-obs",
    listing_url: payload.listing_url,
    sku_id: payload.sku_id ?? null,
    observed_at: payload.observed_at ?? now.toISOString(),
    availability: payload.availability,
    availability_text: payload.availability_text ?? null,
    current_price: payload.current_price ?? null,
    shipping_price: payload.shipping_price ?? null,
    source: payload.source,
    freshness_score: payload.freshness_score ?? 100,
    created_at: now.toISOString(),
  }),
});

assert.equal(report.scheduled, 1);
assert.equal(report.completed, 1);
assert.equal(report.failed, 0);
assert.equal(report.serpApiCalls, 1);
pass("worker_mock_completed");

const skipReport = await runRefreshWorker(config, {
  now: () => now,
  sleep: async () => {},
  loadTargets: async () => [staleTarget],
  fetchProducts: async () => [product],
  getLatestObservations: async () =>
    new Map([
      [
        staleTarget.listingUrl,
        {
          ...prior,
          listing_url: staleTarget.listingUrl,
          current_price: 49,
          availability_text: "In stock",
        },
      ],
    ]),
  insertObservation: async () => {
    throw new Error("should not insert duplicate");
  },
});
assert.equal(skipReport.skipped, 1);
assert.equal(skipReport.completed, 0);
pass("worker_mock_skips_duplicate");

const failReport = await runRefreshWorker(config, {
  now: () => now,
  sleep: async () => {},
  loadTargets: async () => [staleTarget],
  fetchProducts: async () => null,
  getLatestObservations: async () => new Map(),
  insertObservation: async () => null,
});
assert.equal(failReport.failed, 1);
pass("worker_fetch_failure_isolated");

assert.ok(buildRefreshSearchQuery({ title: "AirPods", store: "Coolblue", searchQuery: null }).includes("AirPods"));
assert.ok(readRefreshWorkerConfig({ REFRESH_BATCH_SIZE: "10" }).batchSize === 10);
pass("config_and_query_helpers");

console.log(`\nPhase 1B.3 refresh worker: ${passed} checks passed.`);
