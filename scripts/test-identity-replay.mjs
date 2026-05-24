#!/usr/bin/env node
/**
 * Phase 4 — Identity graph replay determinism.
 */
import assert from "node:assert";

process.env.QUANTAI_IDENTITY_FOUNDATION_ENABLED = "true";

const { buildIdentityFoundation } = await import(
  "../lib/intelligence/identity/buildIdentityFoundation.ts"
);
const { trayPriceHistoryStore } = await import(
  "../lib/intelligence/identity/pricing/priceHistoryStore.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");

trayPriceHistoryStore.clear();

const tray = GOLDEN_CASES[1]?.tray ?? GOLDEN_CASES[0].tray;
const query = GOLDEN_CASES[1]?.query ?? GOLDEN_CASES[0].query;

const runA = buildIdentityFoundation({ products: tray, query });
trayPriceHistoryStore.clear();
const runB = buildIdentityFoundation({ products: tray, query });

assert.equal(runA.meta.canonicalProductCount, runB.meta.canonicalProductCount);
assert.equal(runA.meta.identityCoverage, runB.meta.identityCoverage);
assert.equal(runA.meta.falseCollapseBlocked, runB.meta.falseCollapseBlocked);

const idsA = runA.canonicalProducts.map((n) => n.commerceId).sort();
const idsB = runB.canonicalProducts.map((n) => n.commerceId).sort();
assert.deepEqual(idsA, idsB, "canonical commerce IDs stable across replays");

console.log("OK identity foundation replay determinism");
console.log("\nAll identity replay tests passed.");
