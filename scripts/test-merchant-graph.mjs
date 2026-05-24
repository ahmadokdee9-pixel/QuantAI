#!/usr/bin/env node
import assert from "node:assert";

const { buildMerchantReputationGraph } = await import(
  "../lib/intelligence/trust/merchant/merchantReputationGraph.ts"
);
const { detectSuspiciousSellers } = await import(
  "../lib/intelligence/trust/merchant/suspiciousSellerDetector.ts"
);
const { trackMerchantConsistency } = await import(
  "../lib/intelligence/trust/merchant/merchantConsistencyTracker.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");

const tray = GOLDEN_CASES[0].tray;
const graph = buildMerchantReputationGraph(tray);

assert.ok(graph.nodes.length > 0);
assert.equal(graph.version, "phase5");

const consistency = trackMerchantConsistency(tray);
assert.equal(consistency.length, graph.nodes.length);

const suspicious = detectSuspiciousSellers(tray, consistency);
assert.equal(suspicious.length, consistency.length);

console.log("OK merchant reputation graph");
console.log("OK consistency + suspicious seller detection");
console.log("\nAll merchant graph tests passed.");
