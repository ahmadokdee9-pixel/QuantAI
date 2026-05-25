#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_COMMERCE_BRAIN_ENABLED = "true";
process.env.QUANTAI_TRUST_ENGINE_ENABLED = "true";
process.env.QUANTAI_IDENTITY_FOUNDATION_ENABLED = "true";

const { buildUnifiedCommerceBrain } = await import(
  "../lib/intelligence/commerceBrain/buildUnifiedCommerceBrain.ts"
);
const { assertBrainReplayDeterministic } = await import(
  "../lib/intelligence/commerceBrain/replay/deterministicBrainExecution.ts"
);
const { buildIdentityFoundation } = await import(
  "../lib/intelligence/identity/buildIdentityFoundation.ts"
);
const { buildTrustTruthEngine } = await import(
  "../lib/intelligence/trust/buildTrustTruthEngine.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");

const tray = GOLDEN_CASES[0].tray;
const query = GOLDEN_CASES[0].query;
const identity = buildIdentityFoundation({ products: tray, query });
const trust = buildTrustTruthEngine({ products: tray, query, canonicalProducts: identity.canonicalProducts });
const input = { products: tray, query, identity, trust };

const runA = buildUnifiedCommerceBrain(input);
const runB = buildUnifiedCommerceBrain(input);
assert.equal(assertBrainReplayDeterministic(runA, runB).ok, true);

console.log("OK brain replay determinism");
console.log("\nAll brain replay tests passed.");
