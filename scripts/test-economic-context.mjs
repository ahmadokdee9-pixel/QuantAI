#!/usr/bin/env node
import assert from "node:assert";

const { interpretEconomicSignals } = await import(
  "../lib/intelligence/autonomousCommerce/economic/economicSignalInterpreter.ts"
);
const { analyzePricingClimate } = await import(
  "../lib/intelligence/autonomousCommerce/economic/pricingClimateAnalyzer.ts"
);
const { computeAffordabilityContext } = await import(
  "../lib/intelligence/autonomousCommerce/economic/affordabilityContextEngine.ts"
);
const { resolveRegionalDynamics } = await import(
  "../lib/intelligence/autonomousCommerce/economic/regionalCommerceDynamics.ts"
);
const { resolveMarketConditions } = await import(
  "../lib/intelligence/autonomousCommerce/market/marketConditionResolver.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const tray = GOLDEN_CASES[0].tray;
const market = resolveMarketConditions({ query: "inflation expensive nl europe", products: tray });
const economic = interpretEconomicSignals({ query: "inflation expensive nl", market });
assert.ok(economic.inflationSensitive01 > 0.4);
assert.ok(economic.regionalPattern01 > 0.4);

const climate = analyzePricingClimate(market, economic);
assert.ok(["tight", "neutral", "promotional"].includes(climate.climate));

const affordability = computeAffordabilityContext({
  products: tray,
  economic,
  sessionMemory: { ...EMPTY_COMMERCE_SESSION_MEMORY, priceComfortCenter: 500 },
});
assert.ok(affordability.affordabilityFit01 >= 0);

const regional = resolveRegionalDynamics("shop in netherlands nl", economic);
assert.equal(regional.regionId, "nl");

console.log("OK economic signal interpreter");
console.log("OK pricing climate + affordability");
console.log("\nAll economic context tests passed.");
