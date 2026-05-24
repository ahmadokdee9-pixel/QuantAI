#!/usr/bin/env node
/**
 * Phase 3 — Orchestration kernel consistency + no-ranking-mutation assertions.
 */
import assert from "node:assert";

for (const key of [
  "INTENT_RUNTIME_ENABLED",
  "INTENT_ORCHESTRATION_ENABLED",
  "INTENT_MEMORY_ENABLED",
  "INTENT_COORDINATION_ENABLED",
  "INTENT_FUSION_ENABLED",
  "ADAPTIVE_REASONING_ENABLED",
  "DECISION_INTELLIGENCE_ENABLED",
  "STRATEGY_INTELLIGENCE_ENABLED",
  "MARKET_INTELLIGENCE_ENABLED",
  "BEHAVIORAL_COMMERCE_ENABLED",
  "COGNITION_ENGINE_ENABLED",
  "INTENT_COGNITION_ENABLED",
  "MULTI_OBJECTIVE_COMMERCE_ENABLED",
  "ADAPTIVE_STRATEGIC_RANKING_ENABLED",
  "MEMORYLESS_COMMERCE_LEARNING_ENABLED",
  "MARKET_REALITY_INTELLIGENCE_ENABLED",
  "COMMERCE_DECISION_INTELLIGENCE_ENABLED",
  "AUTONOMOUS_COMMERCE_REASONING_GRAPH_ENABLED",
  "COGNITIVE_GOVERNANCE_ENABLED",
  "ECONOMIC_WORLD_SIMULATION_ENABLED",
  "QUANTAI_NORMALIZATION_ENABLED",
  "QUANTAI_NORMALIZATION_APPLY",
]) {
  process.env[key] = "false";
}

const { scanControlledStackRegistry } = await import(
  "../lib/governance/controlledStackRegistry.ts"
);
const { validateRouterConsistency, CONTROLLED_LAYER_ROUTES } = await import(
  "../lib/governance/deterministicLayerRouter.ts"
);
const { executeNormalizationStage } = await import(
  "../lib/intelligence/normalization/normalizationExecutionGraph.ts"
);
const {
  enforceControlledLayerRankingInvariant,
  resolveGlobalMutationPolicy,
} = await import("../lib/governance/applyMutationGuard.ts");

const sampleProducts = [
  { title: "A", store: "S1", link: "https://x.test/a", price: 10, qiRank: 0 },
  { title: "B", store: "S2", link: "https://x.test/b", price: 20, qiRank: 1 },
  { title: "C", store: "S3", link: "https://x.test/c", price: 30, qiRank: 2 },
];

const routerErrors = validateRouterConsistency();
assert.equal(routerErrors.length, 0, `router errors: ${routerErrors.join("; ")}`);
assert.equal(CONTROLLED_LAYER_ROUTES.length, 20, "20 controlled layers in router");

const registry = scanControlledStackRegistry();
assert.equal(registry.enabledCount, 0, "all controlled layers off in CI env");
assert.equal(registry.fastPathEligible, true, "fast path eligible when zero layers enabled");

const policy = resolveGlobalMutationPolicy();
const shuffled = [...sampleProducts].reverse();
const invariant = enforceControlledLayerRankingInvariant({
  layerId: "test_layer",
  baseline: sampleProducts,
  candidate: shuffled,
  policy: { ...policy, controlledStackMutationBlocked: true, production: true },
});
assert.equal(invariant.rolledBack, true, "production hard-block rolls back ranking drift");
assert.deepEqual(
  invariant.products.map((p) => p.link),
  sampleProducts.map((p) => p.link)
);

const norm = executeNormalizationStage({
  products: sampleProducts,
  query: "iphone 15",
  stage: "post_semantic",
});
assert.equal(norm.products.length, sampleProducts.length, "normalization shadow preserves tray");
assert.equal(norm.graphNode.rankingMutation, false, "normalization graph reports no mutation");
assert.equal(norm.graphNode.apply, false, "APPLY blocked in graph node");

console.log("OK router + registry fast-path");
console.log("OK production mutation hard-block rollback");
console.log("OK normalization execution graph shadow discipline");
console.log("\nAll orchestration kernel tests passed.");
