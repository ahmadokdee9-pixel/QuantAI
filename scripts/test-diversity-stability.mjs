#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_RECOMMENDATION_COGNITION_ENABLED = "true";

const { buildShadowRecommendationCandidates, computeDiversityStability } =
  await import(
    "../lib/intelligence/recommendationCognition/candidates/shadowRecommendationCandidates.ts"
  );
const { applyRecommendationSafetyGuards } = await import(
  "../lib/intelligence/recommendationCognition/safety/recommendationSafetyGuards.ts"
);
const { resolveLatentIntent } = await import(
  "../lib/intelligence/recommendationCognition/cognition/latentIntentResolver.ts"
);
const { runRecommendationReasoningKernel } = await import(
  "../lib/intelligence/recommendationCognition/cognition/recommendationReasoningKernel.ts"
);
const { buildPurchaseMotivationGraph } = await import(
  "../lib/intelligence/recommendationCognition/cognition/purchaseMotivationGraph.ts"
);
const { MAX_SHADOW_CANDIDATES } = await import(
  "../lib/intelligence/recommendationCognition/contracts/deterministicRecommendationContracts.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const tray = GOLDEN_CASES[0].tray;
const intent = resolveLatentIntent({
  query: GOLDEN_CASES[0].query,
  products: tray,
  sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
});
const motivation = buildPurchaseMotivationGraph(intent);
const reasoning = runRecommendationReasoningKernel({ intent, motivation });

const raw = buildShadowRecommendationCandidates({
  products: tray,
  intent,
  reasoning,
});
assert.ok(raw.length <= MAX_SHADOW_CANDIDATES);

const safety = applyRecommendationSafetyGuards({ candidates: raw, products: tray });
const diversity = computeDiversityStability(safety.allowed);
assert.ok(diversity >= 0 && diversity <= 1);

console.log("OK diversity stability metrics");
console.log("OK safety guard diversity");
console.log("\nAll diversity stability tests passed.");
