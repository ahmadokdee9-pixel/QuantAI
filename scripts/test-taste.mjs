#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_COMMERCE_MEMORY_ENABLED = "true";

const { runTasteProfileEngine } = await import(
  "../lib/intelligence/memory/taste/tasteProfileEngine.ts"
);
const { resolveStyleSignals } = await import(
  "../lib/intelligence/memory/taste/styleSignalResolver.ts"
);
const { trackBrandAffinity } = await import(
  "../lib/intelligence/memory/taste/brandAffinityTracker.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const tray = GOLDEN_CASES[0].tray;
const luxuryQuery = "luxury designer watch premium boutique";
const gamerQuery = "gaming rgb rtx playstation";

const luxuryAxes = resolveStyleSignals({
  query: luxuryQuery,
  sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
  styleTags: [],
});
assert.ok(luxuryAxes.luxury01 > luxuryAxes.minimalist01, "luxury query boosts luxury axis");

const gamerAxes = resolveStyleSignals({
  query: gamerQuery,
  sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
  styleTags: [],
});
assert.ok(gamerAxes.gamer01 > 0.4, "gamer query boosts gamer axis");

const affinity = trackBrandAffinity({
  query: "apple iphone",
  products: tray,
  sessionMemory: { ...EMPTY_COMMERCE_SESSION_MEMORY, preferredBrands: ["apple"] },
});
assert.ok(affinity.apple > 0, "brand affinity tracks apple");

const taste = runTasteProfileEngine({
  query: luxuryQuery,
  products: tray,
  sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
});
assert.ok(taste.canonicalTaste.premiumIntent.premiumPreference01 > 0);
assert.ok(taste.aestheticGraph.nodes.length > 0);

console.log("OK style signal resolver");
console.log("OK brand affinity tracker");
console.log("OK taste profile engine");
console.log("\nAll taste tests passed.");
