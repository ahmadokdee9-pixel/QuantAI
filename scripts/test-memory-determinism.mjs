#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_COMMERCE_MEMORY_ENABLED = "true";

const { buildCommerceMemoryFoundation } = await import(
  "../lib/intelligence/memory/buildCommerceMemoryFoundation.ts"
);
const { buildMemoryReplayFingerprint } = await import(
  "../lib/intelligence/memory/replay/deterministicMemoryExecution.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const tray = GOLDEN_CASES[1]?.tray ?? GOLDEN_CASES[0].tray;
const query = GOLDEN_CASES[1]?.query ?? GOLDEN_CASES[0].query;

const run = buildCommerceMemoryFoundation(
  { products: tray, query, sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY },
  { sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY }
);

assert.ok(run.replayFingerprint.startsWith("mmp_"));
assert.equal(buildMemoryReplayFingerprint(run), run.replayFingerprint);

console.log("OK memory determinism fingerprint");
console.log("\nAll memory determinism tests passed.");
