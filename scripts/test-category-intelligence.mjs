#!/usr/bin/env node
import assert from "node:assert";

const { resolveUniversalCategoryCognition } = await import(
  "../lib/intelligence/universalCommerceIntelligence/cognition/universalCategoryCognition.ts"
);
const { buildVerticalIntelligence, scoreVerticalModule } = await import(
  "../lib/intelligence/universalCommerceIntelligence/verticals/categoryIntelligenceModules.ts"
);
const { buildCrossCategoryIntelligenceGraph } = await import(
  "../lib/intelligence/universalCommerceIntelligence/graph/crossCategoryIntelligenceGraph.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");

const fashion = resolveUniversalCategoryCognition({
  products: [],
  query: "nike dress summer outfit fashion",
});
assert.equal(fashion.dominantVertical, "fashion");

const beauty = resolveUniversalCategoryCognition({
  products: [],
  query: "skincare serum makeup beauty",
});
assert.equal(beauty.dominantVertical, "beauty");

const furniture = resolveUniversalCategoryCognition({
  products: GOLDEN_CASES[0].tray,
  query: "sofa ikea furniture living room",
});
assert.ok(["furniture_home", "home", "general"].includes(furniture.dominantVertical) || furniture.dominantVertical === "furniture_home");

const verticals = buildVerticalIntelligence({
  query: "gaming ps5",
  verticalScores: new Map([["gaming", 0.6]]),
});
assert.ok(verticals.gaming.active);

const graph = buildCrossCategoryIntelligenceGraph(verticals);
assert.ok(graph.length > 0);

assert.ok(scoreVerticalModule("watches_jewelry", "rolex") > 0);

console.log("OK universal category cognition");
console.log("OK vertical intelligence modules");
console.log("OK cross-category graph");
console.log("\nAll category intelligence tests passed.");
