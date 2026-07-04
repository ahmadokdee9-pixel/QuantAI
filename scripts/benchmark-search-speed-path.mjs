#!/usr/bin/env node
/**
 * Search speed path micro-benchmark — measures stabilization helpers (no live SerpAPI).
 */
import assert from "node:assert/strict";
import {
  racePipelineWithStalePrefer,
  searchStalePreferMs,
} from "../lib/search/productionStabilizationEnv.ts";

process.env.QUANTAI_BETA_STABILIZATION = "true";
process.env.QUANTAI_SEARCH_STALE_PREFER_MS = "120";

const staleTray = {
  products: [{ id: 1, title: "Cached", link: "https://c/1", store: "Store", price: 10 }],
  dealClusters: [],
  searchIntelligence: null,
  commerceMeta: { fieldComparisonSummary: "", source: "heuristic", cached: true, modelId: "none" },
  liveDiscovery: { version: 1, status: "disabled", discoveryEnabled: false },
  canonicalQuery: { normalizedQuery: "cached", upstreamQuery: "cached" },
};

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function bench(label, fn, iterations = 200) {
  const start = Date.now();
  for (let i = 0; i < iterations; i += 1) await fn();
  const total = Date.now() - start;
  return { label, iterations, totalMs: total, avgMs: Number((total / iterations).toFixed(3)) };
}

const fastLive = await racePipelineWithStalePrefer(async () => {
  await sleep(10);
  return staleTray;
}, staleTray);
assert.equal(fastLive.servedStale, false);

const slowLive = await racePipelineWithStalePrefer(async () => {
  await sleep(400);
  return staleTray;
}, staleTray);
assert.equal(slowLive.servedStale, true, "stale prefer should win on slow live loader");

const stalePreferMs = searchStalePreferMs();
assert.ok(stalePreferMs > 0);

const raceBench = await bench("racePipelineWithStalePrefer (fast live)", async () => {
  await racePipelineWithStalePrefer(async () => staleTray, null);
});

console.log("=== Search speed path benchmark ===");
console.log(`stalePreferMs (beta default): ${stalePreferMs}`);
console.log(`race fast live servedStale: ${fastLive.servedStale}`);
console.log(`race slow live servedStale: ${slowLive.servedStale}`);
console.log(`bench: ${raceBench.label} avg=${raceBench.avgMs}ms (${raceBench.iterations} iter)`);
