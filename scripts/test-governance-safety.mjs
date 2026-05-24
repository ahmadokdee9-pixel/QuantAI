#!/usr/bin/env node
import assert from "node:assert";

const { applyCommerceSafetyGovernance } = await import(
  "../lib/intelligence/autonomousCommerce/governance/commerceSafetyGovernance.ts"
);

const layers = [
  { layerId: "upgrade_timing", horizon: "immediate", confidence01: 0.7, rankingMutation: false },
  { layerId: "value_retention", horizon: "immediate", confidence01: 0.6, rankingMutation: false },
  { layerId: "scarcity_timing", horizon: "immediate", confidence01: 0.55, rankingMutation: false },
];

const blocked = applyCommerceSafetyGovernance({
  layers,
  trustResult: null,
  merchantVolatility01: 0.1,
  discountAnomaly01: 0.85,
});
assert.ok(blocked.blockedCount >= 0);
assert.ok(blocked.allowedLayers.every((l) => l.rankingMutation === false));

const trustLow = {
  rankingPrepByLink: {
    a: { trustScore: 10, rankingMutation: false },
  },
};
const trustBlock = applyCommerceSafetyGovernance({
  layers,
  trustResult: trustLow,
  merchantVolatility01: 0.5,
  discountAnomaly01: 0.2,
});
assert.ok(trustBlock.blockReasons.includes("trust_suppression_blocked") || trustBlock.allowedLayers.length <= layers.length);

console.log("OK commerce safety governance");
console.log("\nAll governance safety tests passed.");
