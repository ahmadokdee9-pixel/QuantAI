#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_RECOMMENDATION_COGNITION_ENABLED = "true";

const { buildRecommendationCognition } = await import(
  "../lib/intelligence/recommendationCognition/buildRecommendationCognition.ts"
);
const { buildRecommendationReplayFingerprint } = await import(
  "../lib/intelligence/recommendationCognition/replay/recommendationReplayKernel.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const tray = GOLDEN_CASES[0].tray;
const run = buildRecommendationCognition(
  { products: tray, query: "luxury watch compare", sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY },
  { sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY }
);

assert.ok(run.replayFingerprint.startsWith("rcp_"));
assert.equal(buildRecommendationReplayFingerprint(run), run.replayFingerprint);

console.log("OK recommendation determinism fingerprint");
console.log("\nAll recommendation determinism tests passed.");
