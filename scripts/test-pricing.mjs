#!/usr/bin/env node
import assert from "node:assert";

const { runPriceTruthEngine } = await import(
  "../lib/intelligence/trust/pricing/priceTruthEngine.ts"
);
const { evaluateMsrpIntegrity } = await import(
  "../lib/intelligence/trust/pricing/msrpIntegrityEngine.ts"
);
const { detectPriceAnomalies } = await import(
  "../lib/intelligence/trust/pricing/priceAnomalyDetector.ts"
);
const { resolveHistoricalBaseline } = await import(
  "../lib/intelligence/trust/pricing/historicalPriceResolver.ts"
);
const { trayPriceHistoryStore } = await import(
  "../lib/intelligence/identity/pricing/priceHistoryStore.ts"
);

function p(partial) {
  return {
    id: 1,
    title: partial.title,
    store: partial.store ?? "Store",
    price: partial.price ?? 100,
    displayPrice: "€100",
    rating: 4.5,
    link: partial.link ?? `https://p.test/${Math.random()}`,
    image: "",
    reviewsCount: 10,
    shipping: null,
    availability: null,
    oldPrice: partial.oldPrice ?? null,
    priceTrend: "stable",
    extensions: [],
  };
}

trayPriceHistoryStore.clear();
const inflated = p({
  title: "Gadget Pro",
  price: 80,
  oldPrice: 200,
  link: "https://p.test/inflated",
});
const tray = [inflated, p({ title: "Gadget Pro alt", price: 95, link: "https://p.test/alt" })];

const msrp = evaluateMsrpIntegrity(inflated, tray);
assert.ok(msrp.msrpIntegrity01 < 0.8, "inflated MSRP detected");

const baseline = resolveHistoricalBaseline(inflated);
trayPriceHistoryStore.record({
  commerceId: baseline.commerceId,
  store: inflated.store,
  link: inflated.link,
  price: 150,
  oldPrice: null,
  observedAt: new Date().toISOString(),
});

const baselineWithHistory = {
  ...baseline,
  baselinePrice: 150,
  sampleCount: 1,
  confidence01: 0.45,
};
const anomaly = detectPriceAnomalies(inflated, baselineWithHistory, 90);
assert.ok(anomaly.anomalySpike01 > 0 || anomaly.unrealisticSale01 > 0);

const engine = runPriceTruthEngine(tray);
assert.ok(Object.keys(engine.byCommerceId).length > 0);

console.log("OK MSRP integrity");
console.log("OK price anomalies");
console.log("OK price truth engine");
console.log("\nAll pricing tests passed.");
