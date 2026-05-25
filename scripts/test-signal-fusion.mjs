#!/usr/bin/env node
import assert from "node:assert";

const { fuseCrossIntelligenceSignals } = await import(
  "../lib/intelligence/commerceBrain/fusion/crossIntelligenceSignalFusion.ts"
);
const { fuseTemporalTrustTaste } = await import(
  "../lib/intelligence/commerceBrain/fusion/temporalTrustTasteFusion.ts"
);
const { arbitrateIntelligence } = await import(
  "../lib/intelligence/commerceBrain/arbitration/deterministicIntelligenceArbitration.ts"
);
const { buildIdentityFoundation } = await import(
  "../lib/intelligence/identity/buildIdentityFoundation.ts"
);
const { buildTrustTruthEngine } = await import(
  "../lib/intelligence/trust/buildTrustTruthEngine.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");

process.env.QUANTAI_TRUST_ENGINE_ENABLED = "true";
process.env.QUANTAI_IDENTITY_FOUNDATION_ENABLED = "true";

const tray = GOLDEN_CASES[0].tray;
const query = GOLDEN_CASES[0].query;
const identity = buildIdentityFoundation({ products: tray, query });
const trust = buildTrustTruthEngine({ products: tray, query, canonicalProducts: identity.canonicalProducts });

const input = { products: tray, query, identity, trust };
const fused = fuseCrossIntelligenceSignals(input);
assert.ok(fused.length > 0);
assert.ok(fused.some((s) => s.layer === "identity"));
assert.ok(fused.some((s) => s.layer === "trust"));

const ttt = fuseTemporalTrustTaste(input);
assert.ok(ttt.fusedScore01 >= 0 && ttt.fusedScore01 <= 1);

const arb = arbitrateIntelligence(fused);
assert.ok(["identity", "trust", "recommendation", "memory", "commerce_os", "evolution", "activation", "taste"].includes(arb.primaryLayer));
assert.equal(arb.rankingMutation, false);

console.log("OK cross-intelligence signal fusion");
console.log("OK temporal trust taste fusion");
console.log("OK deterministic arbitration");
console.log("\nAll signal fusion tests passed.");
