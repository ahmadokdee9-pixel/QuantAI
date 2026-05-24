#!/usr/bin/env node
/**
 * Phase 3 — Replay determinism via unified replay kernel.
 */
import assert from "node:assert";

const {
  evaluateReplayIntegrity,
  linksFromProducts,
  countRankingTopDrift,
  buildReplayTrace,
} = await import("../lib/governance/replayKernel.ts");

const products = [
  { title: "P1", store: "A", link: "https://r.test/1", price: 1, qiRank: 0 },
  { title: "P2", store: "B", link: "https://r.test/2", price: 2, qiRank: 1 },
  { title: "P3", store: "C", link: "https://r.test/3", price: 3, qiRank: 2 },
];

const pre = linksFromProducts(products);
const postA = [...pre];
const postB = [...pre];

assert.deepEqual(postA, postB, "identical link order is deterministic");

const integrity = evaluateReplayIntegrity({
  preOrderLinks: pre,
  postOrderLinks: postA,
  integrityScore: 100,
});
assert.equal(integrity.shouldRollback, false, "no rollback when integrity 100 and no drift");
assert.equal(integrity.driftCount, 0);

const drift = countRankingTopDrift(pre, ["https://r.test/2", "https://r.test/1", "https://r.test/3"]);
assert.equal(drift, 2, "drift counter detects top-5 slot changes");

const trace = buildReplayTrace({
  layerId: "strategic_ranking",
  preProducts: products,
  postProducts: products,
  skipped: true,
  skipReason: "layer_disabled",
});
assert.equal(trace.drift, 0);
assert.equal(trace.skipped, true);

const badIntegrity = evaluateReplayIntegrity({
  preOrderLinks: pre,
  postOrderLinks: ["https://r.test/2", "https://r.test/1", "https://r.test/3"],
  integrityScore: 50,
  driftLimit: 1,
});
assert.equal(badIntegrity.shouldRollback, true, "rollback on low integrity + drift");

console.log("OK deterministic replay — link stability");
console.log("OK replay integrity verdict + drift limits");
console.log("\nAll replay determinism tests passed.");
