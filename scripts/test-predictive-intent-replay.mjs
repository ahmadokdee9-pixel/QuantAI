#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_PREDICTIVE_COMMERCE_INTENT_ENABLED = "true";

const { buildPredictiveCommerceIntent } = await import(
  "../lib/intelligence/predictiveCommerceIntent/buildPredictiveCommerceIntent.ts"
);
const { assertPredictionReplayDeterministic } = await import(
  "../lib/intelligence/predictiveCommerceIntent/replay/deterministicPredictionExecution.ts"
);
const { buildReplaySafePredictiveMemory } = await import(
  "../lib/intelligence/predictiveCommerceIntent/memory/replaySafePredictiveMemory.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const tray = GOLDEN_CASES[0].tray;
const query = GOLDEN_CASES[0].query;
const sessionMemory = { ...EMPTY_COMMERCE_SESSION_MEMORY, interactionCount: 2 };

const input = { products: tray, query, sessionMemory };
const runA = buildPredictiveCommerceIntent(input, { sessionMemory });
const runB = buildPredictiveCommerceIntent(input, { sessionMemory });
const replay = assertPredictionReplayDeterministic(runA, runB);
assert.equal(replay.ok, true, replay.reason);

const memA = buildReplaySafePredictiveMemory({ query, interactionCount: 2 });
const memB = buildReplaySafePredictiveMemory({ query, interactionCount: 2 });
assert.equal(memA.memoryKey, memB.memoryKey);

console.log("OK predictive intent replay determinism");
console.log("\nAll predictive intent replay tests passed.");
