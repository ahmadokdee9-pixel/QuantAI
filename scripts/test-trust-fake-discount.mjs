#!/usr/bin/env node
import assert from "node:assert";

const { runPriceTruthEngine } = await import(
  "../lib/intelligence/trust/pricing/priceTruthEngine.ts"
);
const { buildTrustRankingPrepSignals } = await import(
  "../lib/intelligence/trust/ranking/trustRankingSignals.ts"
);

function p(partial) {
  return {
    id: 1,
    title: partial.title ?? "Sale Item",
    store: partial.store ?? "DiscountStore",
    price: partial.price ?? 50,
    displayPrice: "€50",
    rating: 4,
    link: partial.link ?? "https://fd.test/1",
    image: "",
    reviewsCount: 5,
    shipping: null,
    availability: "Limited stock!",
    oldPrice: partial.oldPrice ?? 199,
    priceTrend: "down",
    extensions: ["70% off"],
  };
}

const tray = [
  p({ link: "https://fd.test/1", price: 49, oldPrice: 249 }),
  p({ link: "https://fd.test/2", price: 120, oldPrice: null, store: "TrustedShop" }),
];

const engine = runPriceTruthEngine(tray);
const profiles = Object.values(engine.byCommerceId);
assert.ok(profiles.some((x) => x.fakeDiscountRisk01 >= 0.3));

const prep = buildTrustRankingPrepSignals({
  offer: {
    listingKey: "qlk_test",
    link: tray[0].link,
    store: tray[0].store,
    price: tray[0].price,
    oldPrice: tray[0].oldPrice,
    trustScore: 55,
    merchantConfidence01: 0.5,
    isRepresentative: true,
    warehouseConfidence: 0.5,
    duplicateSellerRisk: 0,
  },
  priceTruth: profiles[0],
});
assert.equal(prep.rankingMutation, false);
assert.ok(prep.fakeDiscountRisk >= 0);

console.log("OK fake discount detection");
console.log("OK ranking prep signals (no mutation)");
console.log("\nAll fake discount tests passed.");
