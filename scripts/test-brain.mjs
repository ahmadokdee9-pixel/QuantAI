#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_COMMERCE_BRAIN_ENABLED = "true";
process.env.QUANTAI_TRUST_ENGINE_ENABLED = "true";
process.env.QUANTAI_IDENTITY_FOUNDATION_ENABLED = "true";
process.env.QUANTAI_COMMERCE_MEMORY_ENABLED = "true";
process.env.QUANTAI_RECOMMENDATION_COGNITION_ENABLED = "true";

const { buildUnifiedCommerceBrain } = await import(
  "../lib/intelligence/commerceBrain/buildUnifiedCommerceBrain.ts"
);
const { validateBrainReplayContract, DEFAULT_BRAIN_REPLAY_CONTRACT } = await import(
  "../lib/intelligence/commerceBrain/replay/brainReplayContracts.ts"
);
const { buildIdentityFoundation } = await import(
  "../lib/intelligence/identity/buildIdentityFoundation.ts"
);
const { buildTrustTruthEngine } = await import(
  "../lib/intelligence/trust/buildTrustTruthEngine.ts"
);
const { buildCommerceMemoryFoundation } = await import(
  "../lib/intelligence/memory/buildCommerceMemoryFoundation.ts"
);
const { buildRecommendationCognition } = await import(
  "../lib/intelligence/recommendationCognition/buildRecommendationCognition.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const tray = GOLDEN_CASES[0].tray;
const preLinks = tray.map((p) => p.link);
const query = GOLDEN_CASES[0].query;

const identity = buildIdentityFoundation({ products: tray, query });
const trust = buildTrustTruthEngine({ products: tray, query, canonicalProducts: identity.canonicalProducts });
const memory = buildCommerceMemoryFoundation(
  { products: tray, query, trustResult: trust, sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY },
  { sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY }
);
const rec = buildRecommendationCognition(
  { products: tray, query, trustResult: trust, memoryResult: memory, sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY },
  { sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY }
);

const result = buildUnifiedCommerceBrain({
  products: tray,
  query,
  identity,
  trust,
  memory,
  recommendation: rec,
});

assert.equal(result.products.length, tray.length);
assert.deepEqual(result.products.map((p) => p.link), preLinks, "no ranking mutation");
assert.equal(validateBrainReplayContract(DEFAULT_BRAIN_REPLAY_CONTRACT).length, 0);
assert.ok(result.replayFingerprint.startsWith("brn_"));
assert.equal(result.synthesis.rankingMutation, false);
assert.ok(result.meta.maxInfluence01 <= 0.15);
assert.ok(result.fusedSignals.length > 0);

console.log("OK unified commerce brain shadow discipline");
console.log("OK brain synthesis bounded influence");
console.log("\nAll brain tests passed.");
