#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_COMMERCE_EVOLUTION_ENABLED = "true";

const { buildCommerceEvolution } = await import(
  "../lib/intelligence/commerceEvolution/buildCommerceEvolution.ts"
);
const { assertEvolutionReplayDeterministic } = await import(
  "../lib/intelligence/commerceEvolution/replay/deterministicEvolutionExecution.ts"
);
const { buildRecommendationCognition } = await import(
  "../lib/intelligence/recommendationCognition/buildRecommendationCognition.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

process.env.QUANTAI_RECOMMENDATION_COGNITION_ENABLED = "true";
const tray = GOLDEN_CASES[0].tray;
const rec = buildRecommendationCognition({ products: tray, query: GOLDEN_CASES[0].query });

const runA = buildCommerceEvolution({
  products: tray,
  query: GOLDEN_CASES[0].query,
  sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
  recommendationResult: rec,
});
const runB = buildCommerceEvolution({
  products: tray,
  query: GOLDEN_CASES[0].query,
  sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
  recommendationResult: rec,
});

assert.equal(assertEvolutionReplayDeterministic(runA, runB).ok, true);

console.log("OK evolution replay determinism");
console.log("\nAll evolution replay tests passed.");
