#!/usr/bin/env node
import assert from "node:assert";

const { buildAutonomousRecommendationGraph } = await import(
  "../lib/intelligence/recommendationCognition/graph/autonomousRecommendationGraph.ts"
);
const { buildCanonicalProductGraph } = await import(
  "../lib/intelligence/identity/canonicalProductGraph.ts"
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
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const tray = GOLDEN_CASES[0].tray;
const nodes = buildCanonicalProductGraph(tray, []).nodes;
const intent = resolveLatentIntent({
  query: "upgrade apple iphone accessories compare",
  products: tray,
  sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
});
const motivation = buildPurchaseMotivationGraph(intent);
const reasoning = runRecommendationReasoningKernel({ intent, motivation });

const auto = buildAutonomousRecommendationGraph({
  query: "upgrade apple iphone accessories",
  products: tray,
  canonicalProducts: nodes,
  intent,
  reasoning,
  sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
  categoryAffinity: {},
});

assert.ok(
  auto.bundleHints.length > 0 || auto.ecosystemHints.length > 0,
  "bundle or ecosystem hints expected for upgrade/apple query"
);

console.log("OK bundle reasoning hints");
console.log("\nAll bundle reasoning tests passed.");
