#!/usr/bin/env node
import assert from "node:assert";

const { resolveLatentIntent } = await import(
  "../lib/intelligence/recommendationCognition/cognition/latentIntentResolver.ts"
);
const { trackIntentEvolution } = await import(
  "../lib/intelligence/recommendationCognition/intent/intentEvolutionTracker.ts"
);
const { runRecommendationReasoningKernel } = await import(
  "../lib/intelligence/recommendationCognition/cognition/recommendationReasoningKernel.ts"
);
const { buildPurchaseMotivationGraph } = await import(
  "../lib/intelligence/recommendationCognition/cognition/purchaseMotivationGraph.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const tray = GOLDEN_CASES[0].tray;
const sessionHigh = { ...EMPTY_COMMERCE_SESSION_MEMORY, interactionCount: 8, categoryAffinity: { phones: 4 } };

const luxuryIntent = resolveLatentIntent({
  query: "luxury designer watch premium boutique",
  products: tray,
  sessionMemory: sessionHigh,
});
assert.ok(luxuryIntent.luxuryIntent01 > 0.45);

const valueIntent = resolveLatentIntent({
  query: "cheap budget deal discount under 100",
  products: tray,
  sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
});
assert.ok(valueIntent.valueSeekingIntent01 > 0.45);

const motivation = buildPurchaseMotivationGraph(luxuryIntent);
const reasoning = runRecommendationReasoningKernel({ intent: luxuryIntent, motivation });
const evolution = trackIntentEvolution({
  query: "luxury watch",
  sessionMemory: sessionHigh,
  intent: luxuryIntent,
  reasoning,
});
assert.ok(evolution.shoppingMaturity01 > 0);
assert.ok(evolution.trajectoryId.length > 0);

console.log("OK latent intent resolver");
console.log("OK intent evolution tracker");
console.log("\nAll intent evolution tests passed.");
