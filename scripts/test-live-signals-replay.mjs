#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_LIVE_COMMERCE_SIGNALS_ENABLED = "true";

const { buildLiveAdaptiveCommerceSignals } = await import(
  "../lib/intelligence/liveAdaptiveCommerceSignals/buildLiveCommerceSignals.ts"
);
const { assertLiveSignalReplayDeterministic } = await import(
  "../lib/intelligence/liveAdaptiveCommerceSignals/replay/deterministicLiveSignalExecution.ts"
);
const { resolveMacroCommerceTiming } = await import(
  "../lib/intelligence/liveAdaptiveCommerceSignals/macro/macroCommerceTiming.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");

const tray = GOLDEN_CASES[0].tray;
const query = GOLDEN_CASES[0].query;
const fixedNow = Date.UTC(2026, 4, 15);

const input = { products: tray, query };
const runA = buildLiveAdaptiveCommerceSignals(input);
const runB = buildLiveAdaptiveCommerceSignals(input);
const replay = assertLiveSignalReplayDeterministic(runA, runB);
assert.equal(replay.ok, true, replay.reason);

const macroA = resolveMacroCommerceTiming(query, fixedNow);
const macroB = resolveMacroCommerceTiming(query, fixedNow);
assert.equal(macroA.macroScore01, macroB.macroScore01);

console.log("OK live signals replay determinism");
console.log("\nAll live signals replay tests passed.");
