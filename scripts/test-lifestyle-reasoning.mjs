#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_EMOTIONAL_COMMERCE_INTELLIGENCE_ENABLED = "true";

const { resolveLifestylePreference } = await import(
  "../lib/intelligence/emotionalCommerceIntelligence/lifestyle/lifestylePreferenceIntelligence.ts"
);
const { measureLifestyleContinuity } = await import(
  "../lib/intelligence/emotionalCommerceIntelligence/lifestyle/lifestyleContinuityEngine.ts"
);
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const session = {
  ...EMPTY_COMMERCE_SESSION_MEMORY,
  styleTags: ["outdoor", "active"],
  emotionalToneTags: ["adventurous"],
  interactionCount: 5,
};

const lifestyle = resolveLifestylePreference({ query: "travel outdoor hiking gear", sessionMemory: session });
assert.equal(lifestyle.lifestyleLabel, "active_outdoor");

const continuity = measureLifestyleContinuity(session);
assert.ok(continuity.continuity01 > 0);

console.log("OK lifestyle preference intelligence");
console.log("\nAll lifestyle reasoning tests passed.");
