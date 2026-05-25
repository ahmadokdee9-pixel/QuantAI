#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_EMOTIONAL_COMMERCE_INTELLIGENCE_ENABLED = "true";

const { modelAestheticIdentity } = await import(
  "../lib/intelligence/emotionalCommerceIntelligence/aesthetic/aestheticIdentityModeling.ts"
);
const { detectMinimalismMaximalism } = await import(
  "../lib/intelligence/emotionalCommerceIntelligence/style/minimalismMaximalismDetection.ts"
);
const { buildTasteCognitionGraph } = await import(
  "../lib/intelligence/emotionalCommerceIntelligence/graph/tasteCognitionGraph.ts"
);

const identity = modelAestheticIdentity({ query: "minimal scandi clean aesthetic" });
const pole = detectMinimalismMaximalism(identity);
assert.equal(pole.pole, "minimal");

const graph = buildTasteCognitionGraph({
  minimalist01: identity.minimalist01,
  maximalist01: identity.maximalist01,
  aestheticScore01: 0.62,
  personality: "comfort_seeker",
});
assert.ok(graph.some((n) => n.trait === "minimalism"));

console.log("OK taste intelligence aesthetic identity");
console.log("\nAll taste intelligence tests passed.");
