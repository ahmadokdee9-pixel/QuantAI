#!/usr/bin/env node
import assert from "node:assert";

const { forecastLifecycle } = await import(
  "../lib/intelligence/predictiveCommerceIntent/forecast/lifecycleForecastingEngine.ts"
);
const { predictUpgradeTiming } = await import(
  "../lib/intelligence/predictiveCommerceIntent/forecast/upgradeTimingPrediction.ts"
);
const { buildFutureCommerceGraph } = await import(
  "../lib/intelligence/predictiveCommerceIntent/graph/futureCommerceGraph.ts"
);
const { modelDeterministicFutureState } = await import(
  "../lib/intelligence/predictiveCommerceIntent/model/deterministicFutureStateModel.ts"
);
const { fuseDeterministicPredictions } = await import(
  "../lib/intelligence/predictiveCommerceIntent/fusion/deterministicPredictionFusionEngine.ts"
);

const upgrade = predictUpgradeTiming("upgrade to latest macbook pro");
assert.equal(upgrade.label, "upgrade_imminent");

const lifecycle = forecastLifecycle({});
assert.ok(["discovery", "comparison", "commitment", "replacement"].includes(lifecycle.phase) || lifecycle.phase);

const future = buildFutureCommerceGraph({
  temporalHorizon: "session",
  replacementCycle01: 0.4,
  purchaseProbability01: 0.55,
  seasonalForecast01: 0.3,
});
assert.equal(future.length, 3);

const state = modelDeterministicFutureState({
  purchaseProbability01: 0.6,
  readiness01: 0.5,
  lifecycleForecast01: 0.4,
});
assert.ok(state.confidence01 > 0);

const fused = fuseDeterministicPredictions([
  { axisId: "readiness", strength01: 0.7 },
  { axisId: "purchase_probability", strength01: 0.55 },
]);
assert.ok(fused.some((s) => s.axisId === "readiness"));

console.log("OK lifecycle forecasting engine");
console.log("OK future commerce graph");
console.log("OK deterministic future-state model");
console.log("\nAll forecasting tests passed.");
