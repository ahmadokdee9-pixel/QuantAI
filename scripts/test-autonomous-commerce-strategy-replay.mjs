#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_AUTONOMOUS_COMMERCE_STRATEGY_ENABLED = "true";

const { buildAutonomousCommerceStrategy } = await import(
  "../lib/intelligence/autonomousCommerceStrategy/buildAutonomousCommerceStrategy.ts"
);
const { assertStrategyReplayDeterministic } = await import(
  "../lib/intelligence/autonomousCommerceStrategy/replay/deterministicStrategyExecution.ts"
);
const { buildReplaySafeStrategyMemory } = await import(
  "../lib/intelligence/autonomousCommerceStrategy/memory/replaySafeStrategyMemory.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const tray = GOLDEN_CASES[0].tray;
const query = GOLDEN_CASES[0].query;
const sessionMemory = EMPTY_COMMERCE_SESSION_MEMORY;

const input = { products: tray, query, sessionMemory };
const runA = buildAutonomousCommerceStrategy(input, { sessionMemory });
const runB = buildAutonomousCommerceStrategy(input, { sessionMemory });
const replay = assertStrategyReplayDeterministic(runA, runB);
assert.equal(replay.ok, true, replay.reason);

const memA = buildReplaySafeStrategyMemory({ query, primaryStrategy: "neutral_strategy" });
const memB = buildReplaySafeStrategyMemory({ query, primaryStrategy: "neutral_strategy" });
assert.equal(memA.memoryKey, memB.memoryKey);

console.log("OK strategy replay determinism");
console.log("\nAll strategy replay tests passed.");
