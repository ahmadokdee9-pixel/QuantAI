#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_AUTONOMOUS_COMMERCE_IDENTITY_ENABLED = "true";
process.env.QUANTAI_COMMERCE_MEMORY_ENABLED = "true";
process.env.QUANTAI_COMMERCE_EVOLUTION_ENABLED = "true";

const { buildAutonomousCommerceIdentity } = await import(
  "../lib/intelligence/autonomousCommerceIdentity/buildAutonomousCommerceIdentity.ts"
);
const { runIdentityOrchestrationKernel } = await import(
  "../lib/intelligence/autonomousCommerceIdentity/kernel/identityOrchestrationKernel.ts"
);
const { validateIdentityReplayContract, DEFAULT_IDENTITY_REPLAY_CONTRACT } =
  await import("../lib/intelligence/autonomousCommerceIdentity/replay/identityReplayContracts.ts");
const { fuseDeterministicIdentitySignals } = await import(
  "../lib/intelligence/autonomousCommerceIdentity/fusion/deterministicIdentityFusionEngine.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const tray = GOLDEN_CASES[0].tray;
const query = GOLDEN_CASES[0].query;
const preLinks = tray.map((p) => p.link);
const sessionMemory = {
  ...EMPTY_COMMERCE_SESSION_MEMORY,
  interactionCount: 4,
  preferredBrands: ["apple"],
  categoryAffinity: { electronics: 0.6 },
};

const fused = fuseDeterministicIdentitySignals([
  { axisId: "taste", strength01: 0.55 },
  { axisId: "premium", strength01: 0.48 },
]);
assert.ok(fused.length >= 2);

const engine = runIdentityOrchestrationKernel(
  { products: tray, query, sessionMemory },
  sessionMemory,
  0.1
);
assert.ok(engine.fusedSignals.length > 0);
assert.ok(["stable", "moderate", "elevated"].includes(engine.driftBand));

const result = buildAutonomousCommerceIdentity(
  { products: tray, query, sessionMemory },
  { sessionMemory }
);
assert.equal(result.products.length, tray.length);
assert.deepEqual(result.products.map((p) => p.link), preLinks);
assert.equal(validateIdentityReplayContract(DEFAULT_IDENTITY_REPLAY_CONTRACT).length, 0);
assert.ok(result.replayFingerprint.startsWith("aci_"));
assert.ok(result.shadowCandidates.every((c) => c.rankingMutation === false));
assert.ok(result.meta.maxInfluence01 <= 0.12);
assert.ok(result.explain.traceExamples.length > 0);

console.log("OK identity orchestration kernel");
console.log("OK autonomous commerce identity shadow discipline");
console.log("\nAll commerce identity tests passed.");
