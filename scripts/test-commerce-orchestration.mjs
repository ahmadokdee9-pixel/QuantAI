#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_AUTONOMOUS_COMMERCE_OS_ENABLED = "true";
process.env.QUANTAI_RECOMMENDATION_COGNITION_ENABLED = "true";
process.env.QUANTAI_COMMERCE_MEMORY_ENABLED = "true";
process.env.QUANTAI_TRUST_ENGINE_ENABLED = "true";

const { buildAutonomousCommerceOs } = await import(
  "../lib/intelligence/autonomousCommerce/buildAutonomousCommerceOs.ts"
);
const { assertOrchestrationReplayDeterministic } = await import(
  "../lib/intelligence/autonomousCommerce/replay/deterministicOrchestrationExecution.ts"
);
const { validateOrchestrationReplayContract, DEFAULT_ORCHESTRATION_REPLAY_CONTRACT } =
  await import("../lib/intelligence/autonomousCommerce/replay/orchestrationReplayContracts.ts");
const { buildRecommendationCognition } = await import(
  "../lib/intelligence/recommendationCognition/buildRecommendationCognition.ts"
);
const { buildCommerceMemoryFoundation } = await import(
  "../lib/intelligence/memory/buildCommerceMemoryFoundation.ts"
);
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
const memory = buildCommerceMemoryFoundation(
  { products: tray, query: GOLDEN_CASES[0].query, trustResult: trust, sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY },
  { sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY }
);
const rec = buildRecommendationCognition(
  { products: tray, query: GOLDEN_CASES[0].query, trustResult: trust, memoryResult: memory, sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY },
  { sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY }
);

const runA = buildAutonomousCommerceOs(
  {
    products: tray,
    query: GOLDEN_CASES[0].query,
    trustResult: trust,
    memoryResult: memory,
    recommendationResult: rec,
    sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
  },
  { sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY }
);
const runB = buildAutonomousCommerceOs(
  {
    products: tray,
    query: GOLDEN_CASES[0].query,
    trustResult: trust,
    memoryResult: memory,
    recommendationResult: rec,
    sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
  },
  { sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY }
);

assert.equal(runA.products.length, tray.length);
assert.deepEqual(runA.products.map((p) => p.link), preLinks);
assert.equal(validateOrchestrationReplayContract(DEFAULT_ORCHESTRATION_REPLAY_CONTRACT).length, 0);
assert.equal(assertOrchestrationReplayDeterministic(runA, runB).ok, true);
assert.ok(runA.replayFingerprint.startsWith("aco_"));
assert.ok(runA.strategicLayers.every((l) => l.rankingMutation === false));

console.log("OK autonomous commerce OS shadow discipline");
console.log("OK orchestration replay determinism");
console.log("\nAll commerce orchestration tests passed.");
