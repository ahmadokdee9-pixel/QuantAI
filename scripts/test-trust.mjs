#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_TRUST_ENGINE_ENABLED = "true";
process.env.QUANTAI_IDENTITY_FOUNDATION_ENABLED = "true";

const { buildTrustTruthEngine } = await import(
  "../lib/intelligence/trust/buildTrustTruthEngine.ts"
);
const { assertTrustReplayDeterministic } = await import(
  "../lib/intelligence/trust/replay/deterministicTrustExecution.ts"
);
const { validateTrustReplayContract, DEFAULT_TRUST_REPLAY_CONTRACT } = await import(
  "../lib/intelligence/trust/replay/trustReplayContracts.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { trayPriceHistoryStore } = await import(
  "../lib/intelligence/identity/pricing/priceHistoryStore.ts"
);

const tray = GOLDEN_CASES[0].tray;
const preLinks = tray.map((p) => p.link);

trayPriceHistoryStore.clear();
const runA = buildTrustTruthEngine({ products: tray, query: GOLDEN_CASES[0].query });
trayPriceHistoryStore.clear();
const runB = buildTrustTruthEngine({ products: tray, query: GOLDEN_CASES[0].query });

assert.equal(runA.products.length, tray.length);
assert.deepEqual(runA.products.map((p) => p.link), preLinks, "no ranking mutation");
assert.equal(validateTrustReplayContract(DEFAULT_TRUST_REPLAY_CONTRACT).length, 0);
assert.equal(assertTrustReplayDeterministic(runA, runB).ok, true);
assert.ok(runA.meta.avgTrustScore > 0);
assert.ok(runA.meta.trustCoverage > 0);

console.log("OK trust engine shadow discipline");
console.log("OK trust replay determinism");
console.log("\nAll trust tests passed.");
