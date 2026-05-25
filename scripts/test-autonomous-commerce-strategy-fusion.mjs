#!/usr/bin/env node
import assert from "node:assert";

const { fuseDeterministicStrategySignals } = await import(
  "../lib/intelligence/autonomousCommerceStrategy/fusion/deterministicStrategyFusionEngine.ts"
);
const { balanceTrustValueRisk } = await import(
  "../lib/intelligence/autonomousCommerceStrategy/balance/trustValueRiskBalancing.ts"
);
const { minimizeCommerceRegret } = await import(
  "../lib/intelligence/autonomousCommerceStrategy/regret/regretMinimizationEngine.ts"
);
const { arbitrateStrategyGovernance } = await import(
  "../lib/intelligence/autonomousCommerceStrategy/governance/strategyArbitration.ts"
);

const tvr = balanceTrustValueRisk({});
assert.ok(tvr.balance01 >= 0 && tvr.balance01 <= 1);

const regret = minimizeCommerceRegret({ risk01: 0.3, volatilityStrategy01: 0.25, trust01: 0.7 });
assert.ok(typeof regret.minimized === "boolean");

const fused = fuseDeterministicStrategySignals([
  { axisId: "trust_value_risk", strength01: 0.6 },
  { axisId: "timing", strength01: 0.55 },
]);
assert.ok(fused.length >= 2);
assert.equal(fused[0].rankingMutation, undefined);

const gov = arbitrateStrategyGovernance(
  { products: [], query: "test" },
  0.2,
  0.8
);
assert.equal(gov.allowed, false);
assert.ok(gov.reasons.length > 0);

console.log("OK trust-value-risk balancing");
console.log("OK regret minimization");
console.log("OK deterministic strategy fusion");
console.log("OK strategy governance arbitration");
console.log("\nAll strategy fusion tests passed.");
