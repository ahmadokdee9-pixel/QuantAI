#!/usr/bin/env node
import assert from "node:assert";

const { buildUniversalCommerceOntology } = await import(
  "../lib/intelligence/universalCommerceIntelligence/ontology/universalCommerceOntology.ts"
);
const { fuseDeterministicCategorySignals } = await import(
  "../lib/intelligence/universalCommerceIntelligence/fusion/deterministicCategoryFusion.ts"
);
const { arbitrateUniversalCognition } = await import(
  "../lib/intelligence/universalCommerceIntelligence/governance/cognitionArbitration.ts"
);

const ontology = buildUniversalCommerceOntology({
  query: "compare best deal trust",
  dominantVertical: "electronics",
});
assert.ok(ontology.some((n) => n.concept === "comparison_intent"));
assert.ok(ontology.some((n) => n.concept === "product_entity"));

const fused = fuseDeterministicCategorySignals(
  [
    { axisId: "ontology", verticalId: "electronics", strength01: 0.5 },
    { axisId: "trust", verticalId: "electronics", strength01: 0.6 },
  ],
  0.8
);
assert.ok(fused.length >= 2);

const gov = arbitrateUniversalCognition({ products: [], query: "x" }, 0.2);
assert.equal(gov.allowed, false);

console.log("OK universal commerce ontology");
console.log("OK deterministic category fusion");
console.log("OK cognition governance arbitration");
console.log("\nAll ontology tests passed.");
