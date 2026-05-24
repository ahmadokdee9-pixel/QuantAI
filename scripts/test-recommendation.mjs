#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_RECOMMENDATION_COGNITION_ENABLED = "true";
process.env.QUANTAI_COMMERCE_MEMORY_ENABLED = "true";
process.env.QUANTAI_TRUST_ENGINE_ENABLED = "true";

const { buildRecommendationCognition } = await import(
  "../lib/intelligence/recommendationCognition/buildRecommendationCognition.ts"
);
const { assertRecommendationReplayDeterministic } = await import(
  "../lib/intelligence/recommendationCognition/replay/recommendationReplayKernel.ts"
);
const { validateRecommendationContract, DEFAULT_RECOMMENDATION_CONTRACT } =
  await import(
    "../lib/intelligence/recommendationCognition/contracts/deterministicRecommendationContracts.ts"
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

const runA = buildRecommendationCognition(
  { products: tray, query: GOLDEN_CASES[0].query, trustResult: trust, memoryResult: memory, sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY },
  { sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY }
);
const runB = buildRecommendationCognition(
  { products: tray, query: GOLDEN_CASES[0].query, trustResult: trust, memoryResult: memory, sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY },
  { sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY }
);

assert.equal(runA.products.length, tray.length);
assert.deepEqual(runA.products.map((p) => p.link), preLinks, "no ranking mutation");
assert.equal(validateRecommendationContract(DEFAULT_RECOMMENDATION_CONTRACT).length, 0);
assert.equal(assertRecommendationReplayDeterministic(runA, runB).ok, true);
assert.ok(runA.shadowCandidates.length > 0);
assert.ok(runA.shadowCandidates.every((c) => c.rankingMutation === false));

console.log("OK recommendation cognition shadow discipline");
console.log("OK recommendation replay determinism");
console.log("\nAll recommendation tests passed.");
