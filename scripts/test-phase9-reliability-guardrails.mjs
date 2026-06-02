#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  circuitSnapshot,
  getGuestStaleTray,
  isCircuitOpen,
  markCircuitFailure,
  markCircuitSuccess,
  markRateLimited429,
  markSearchRequest,
  reliabilityTelemetrySnapshot,
  saveGuestStaleTray,
  withTimeout,
} from "../lib/search/searchReliabilityGuardrails.ts";

function mockTray() {
  return {
    products: [
      {
        title: "Fallback Product",
        store: "Mock Store",
        price: 99,
        link: "https://example.com/fallback",
        image: "",
      },
    ],
    dealClusters: [],
    searchIntelligence: null,
    commerceMeta: { status: "mock" },
    liveDiscovery: { status: "disabled" },
    canonicalQuery: {
      normalizedQuery: "fallback product",
      upstreamQuery: "fallback product",
      category: "unknown",
      productType: "unknown",
      commerceIntents: { taste: [] },
      semantic: { semanticKeywords: [], envelope: "" },
    },
  };
}

markSearchRequest();
markSearchRequest();
markRateLimited429({ servedDegraded: true, emptyOn429: false });
markRateLimited429({ servedDegraded: false, emptyOn429: true });
const telemetry = reliabilityTelemetrySnapshot();
assert.equal(telemetry.counters.requests >= 2, true);
assert.equal(telemetry.counters.rateLimited429 >= 2, true);
assert.equal(telemetry.counters.degradedServed >= 1, true);
assert.equal(telemetry.counters.emptyOn429 >= 1, true);
assert.equal(typeof telemetry.rates.rate429, "number");
assert.equal(typeof telemetry.rates.degradedServedRate, "number");
assert.equal(typeof telemetry.rates.emptyOn429Rate, "number");

const tray = mockTray();
saveGuestStaleTray("guest:fallback", tray);
const staleTray = getGuestStaleTray("guest:fallback");
assert.ok(staleTray?.products?.length, "stale tray should be available");

markCircuitSuccess("search_pipeline");
assert.equal(isCircuitOpen("search_pipeline"), false);
markCircuitFailure("search_pipeline");
markCircuitFailure("search_pipeline");
markCircuitFailure("search_pipeline");
assert.equal(isCircuitOpen("search_pipeline"), true, "circuit should open after threshold");
const snapshot = circuitSnapshot("search_pipeline");
assert.equal(snapshot.open, true);
assert.equal(snapshot.failures >= 3, true);

await assert.rejects(
  withTimeout("phase9-timeout-test", 20, async () => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return "late";
  }),
  /timed out/i
);

const fast = await withTimeout("phase9-fast-test", 200, async () => "ok");
assert.equal(fast, "ok");

console.log("phase9-reliability-guardrails: ok");
