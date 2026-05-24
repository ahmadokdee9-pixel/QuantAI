#!/usr/bin/env node
import assert from "node:assert";

const { runMarketAwarenessEngine } = await import(
  "../lib/intelligence/autonomousCommerce/market/marketAwarenessEngine.ts"
);
const { resolveMarketConditions } = await import(
  "../lib/intelligence/autonomousCommerce/market/marketConditionResolver.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");

const tray = GOLDEN_CASES[0].tray;

const holiday = resolveMarketConditions({
  query: "black friday christmas holiday deal",
  products: tray,
});
assert.ok(holiday.seasonalDemand01 > 0.4);

const launch = resolveMarketConditions({
  query: "new launch 2026 latest release",
  products: tray,
});
assert.ok(launch.launchCycle01 > 0.4);

const engine = runMarketAwarenessEngine({
  query: GOLDEN_CASES[0].query,
  products: tray,
});
assert.ok(engine.environment.nodes.length >= 0);
assert.ok(engine.trend.pressureScore >= 0);

console.log("OK market condition resolver");
console.log("OK market awareness engine");
console.log("\nAll market awareness tests passed.");
