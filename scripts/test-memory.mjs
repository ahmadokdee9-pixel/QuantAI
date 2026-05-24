#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_COMMERCE_MEMORY_ENABLED = "true";
process.env.QUANTAI_TRUST_ENGINE_ENABLED = "true";
process.env.QUANTAI_IDENTITY_FOUNDATION_ENABLED = "true";

const { buildCommerceMemoryFoundation } = await import(
  "../lib/intelligence/memory/buildCommerceMemoryFoundation.ts"
);
const { assertMemoryReplayDeterministic } = await import(
  "../lib/intelligence/memory/replay/deterministicMemoryExecution.ts"
);
const { validatePreferenceReplayContract, DEFAULT_PREFERENCE_REPLAY_CONTRACT } =
  await import("../lib/intelligence/memory/replay/preferenceReplayContracts.ts");
const { buildTrustTruthEngine } = await import(
  "../lib/intelligence/trust/buildTrustTruthEngine.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { trayPriceHistoryStore } = await import(
  "../lib/intelligence/identity/pricing/priceHistoryStore.ts"
);
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const tray = GOLDEN_CASES[0].tray;
const preLinks = tray.map((p) => p.link);

trayPriceHistoryStore.clear();
const trust = buildTrustTruthEngine({ products: tray, query: GOLDEN_CASES[0].query });
trayPriceHistoryStore.clear();
const runA = buildCommerceMemoryFoundation(
  { products: tray, query: GOLDEN_CASES[0].query, trustResult: trust, sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY },
  { sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY }
);
const runB = buildCommerceMemoryFoundation(
  { products: tray, query: GOLDEN_CASES[0].query, trustResult: trust, sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY },
  { sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY }
);

assert.equal(runA.products.length, tray.length);
assert.deepEqual(runA.products.map((p) => p.link), preLinks, "no ranking mutation");
assert.equal(validatePreferenceReplayContract(DEFAULT_PREFERENCE_REPLAY_CONTRACT).length, 0);
assert.equal(assertMemoryReplayDeterministic(runA, runB).ok, true);
assert.equal(runA.preferenceSignals.rankingMutation, false);
assert.ok(runA.meta.memoryNodeCount > 0);
assert.ok(runA.meta.tasteProfileConfidence > 0);

console.log("OK commerce memory shadow discipline");
console.log("OK memory replay determinism");
console.log("\nAll memory tests passed.");
