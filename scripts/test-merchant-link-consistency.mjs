#!/usr/bin/env node
/**
 * Phase 4 — Merchant offer link consistency tests.
 */
import assert from "node:assert";

const { buildMerchantOfferGraph, linkMerchantOffer } = await import(
  "../lib/intelligence/identity/merchantOfferLinker.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");

const tray = GOLDEN_CASES[0].tray;
const graph = buildMerchantOfferGraph(tray);

let totalOffers = 0;
for (const offers of graph.values()) {
  totalOffers += offers.length;
  for (const o of offers) {
    assert.ok(o.link.length > 0);
    assert.ok(o.store.length > 0);
    assert.ok(o.trustScore >= 0 && o.trustScore <= 100);
    assert.ok(o.warehouseConfidence >= 0 && o.warehouseConfidence <= 1);
  }
}
assert.equal(totalOffers, tray.length, "every listing linked to an offer");

const stores = tray.map((p) => p.store);
const offer = linkMerchantOffer(tray[0], stores);
assert.equal(offer.link, tray[0].link);
assert.equal(offer.price, tray[0].price);

console.log("OK merchant offer graph covers full tray");
console.log("\nAll merchant link consistency tests passed.");
