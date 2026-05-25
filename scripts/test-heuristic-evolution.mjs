#!/usr/bin/env node
import assert from "node:assert";

const { evolveCommerceHeuristics } = await import(
  "../lib/intelligence/autonomousCommerceEvolution/heuristic/commerceHeuristicEvolution.ts"
);

const comparison = evolveCommerceHeuristics({ query: "compare vs which laptop", upstreamDelta01: 0.06 });
assert.equal(comparison.heuristicId, "comparison_heuristic");
assert.ok(comparison.delta01 <= 0.08);

const value = evolveCommerceHeuristics({ query: "best deal sale discount", upstreamDelta01: 0.04 });
assert.equal(value.heuristicId, "value_heuristic");

console.log("OK commerce heuristic evolution bounded deltas");
console.log("\nAll heuristic evolution tests passed.");
