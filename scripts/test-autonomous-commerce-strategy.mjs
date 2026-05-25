#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_AUTONOMOUS_COMMERCE_STRATEGY_ENABLED = "true";
process.env.QUANTAI_PREDICTIVE_COMMERCE_INTENT_ENABLED = "true";

const { buildAutonomousCommerceStrategy } = await import(
  "../lib/intelligence/autonomousCommerceStrategy/buildAutonomousCommerceStrategy.ts"
);
const { runAutonomousStrategyKernel } = await import(
  "../lib/intelligence/autonomousCommerceStrategy/kernel/autonomousStrategyKernel.ts"
);
const { validateStrategyReplayContract, DEFAULT_STRATEGY_REPLAY_CONTRACT } =
  await import("../lib/intelligence/autonomousCommerceStrategy/replay/strategyReplayContracts.ts");
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const tray = GOLDEN_CASES[0].tray;
const query = "upgrade iphone trust deal best value";
const preLinks = tray.map((p) => p.link);
const sessionMemory = { ...EMPTY_COMMERCE_SESSION_MEMORY, interactionCount: 5 };

const engine = runAutonomousStrategyKernel(
  { products: tray, query, sessionMemory },
  sessionMemory,
  0.1
);
assert.ok(engine.fusedSignals.length > 0);
assert.ok(engine.primaryStrategy.length > 0);

const result = buildAutonomousCommerceStrategy(
  { products: tray, query, sessionMemory },
  { sessionMemory }
);
assert.equal(result.products.length, tray.length);
assert.deepEqual(result.products.map((p) => p.link), preLinks);
assert.equal(validateStrategyReplayContract(DEFAULT_STRATEGY_REPLAY_CONTRACT).length, 0);
assert.ok(result.replayFingerprint.startsWith("acs_"));
assert.ok(result.shadowCandidates.every((c) => c.rankingMutation === false));
assert.ok(result.explain.traceExamples.length > 0);

console.log("OK autonomous strategy kernel");
console.log("OK autonomous commerce strategy shadow discipline");
console.log("\nAll strategy tests passed.");
