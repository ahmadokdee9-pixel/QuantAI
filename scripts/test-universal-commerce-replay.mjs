#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_UNIVERSAL_COMMERCE_INTELLIGENCE_ENABLED = "true";

const { buildUniversalCommerceIntelligence } = await import(
  "../lib/intelligence/universalCommerceIntelligence/buildUniversalCommerceIntelligence.ts"
);
const { assertUniversalReplayDeterministic } = await import(
  "../lib/intelligence/universalCommerceIntelligence/replay/deterministicUniversalExecution.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");

const tray = GOLDEN_CASES[0].tray;
const query = GOLDEN_CASES[0].query;

const runA = buildUniversalCommerceIntelligence({ products: tray, query });
const runB = buildUniversalCommerceIntelligence({ products: tray, query });
const replay = assertUniversalReplayDeterministic(runA, runB);
assert.equal(replay.ok, true, replay.reason);

console.log("OK universal commerce replay determinism");
console.log("\nAll universal commerce replay tests passed.");
