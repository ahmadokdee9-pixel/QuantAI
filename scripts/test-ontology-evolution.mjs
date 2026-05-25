#!/usr/bin/env node
import assert from "node:assert";

const { refineOntology } = await import(
  "../lib/intelligence/autonomousCommerceEvolution/ontology/ontologyRefinementEngine.ts"
);

const refined = refineOntology({ query: "luxury gift occasion premium", dominantVertical: "luxury" });
assert.ok(refined.refinedConcepts.includes("luxury_evolution"));
assert.ok(refined.nodes.length >= 4);

console.log("OK ontology refinement engine");
console.log("\nAll ontology evolution tests passed.");
