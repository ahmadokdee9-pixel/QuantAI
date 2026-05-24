#!/usr/bin/env node
import assert from "node:assert";

const { buildRelatedCommerceGraph } = await import(
  "../lib/intelligence/recommendationCognition/graph/relatedCommerceGraph.ts"
);
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
const { MAX_GRAPH_NODES } = await import(
  "../lib/intelligence/recommendationCognition/contracts/deterministicRecommendationContracts.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const tray = GOLDEN_CASES[0].tray;
const nodes = buildCanonicalProductGraph(tray, []).nodes;
const categoryByCommerceId = {};
for (const p of tray) {
  const cid = p.qiNormalizedCommerce?.commerceId ?? p.link;
  categoryByCommerceId[cid] = p.qiCategory ?? "general";
}

const related = buildRelatedCommerceGraph(nodes, categoryByCommerceId);
assert.ok(related.nodeCount > 0);
assert.ok(related.edges.length <= 32);

const intent = resolveLatentIntent({
  query: tray[0].title,
  products: tray,
  sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
});
const motivation = buildPurchaseMotivationGraph(intent);
const reasoning = runRecommendationReasoningKernel({ intent, motivation });

const auto = buildAutonomousRecommendationGraph({
  query: GOLDEN_CASES[0].query,
  products: tray,
  canonicalProducts: nodes,
  intent,
  reasoning,
  sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
  categoryAffinity: { electronics: 2 },
});
assert.ok(auto.nodeCount > 0);
assert.ok(auto.nodeCount <= MAX_GRAPH_NODES);

console.log("OK related commerce graph");
console.log("OK autonomous recommendation graph");
console.log("\nAll commerce graph tests passed.");
