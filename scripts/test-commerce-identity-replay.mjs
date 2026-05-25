#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_AUTONOMOUS_COMMERCE_IDENTITY_ENABLED = "true";

const { buildAutonomousCommerceIdentity } = await import(
  "../lib/intelligence/autonomousCommerceIdentity/buildAutonomousCommerceIdentity.ts"
);
const { assertIdentityReplayDeterministic } = await import(
  "../lib/intelligence/autonomousCommerceIdentity/replay/deterministicIdentityExecution.ts"
);
const { buildIdentityContinuityMemory } = await import(
  "../lib/intelligence/autonomousCommerceIdentity/memory/identityContinuityMemory.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const tray = GOLDEN_CASES[0].tray;
const query = GOLDEN_CASES[0].query;
const sessionMemory = {
  ...EMPTY_COMMERCE_SESSION_MEMORY,
  interactionCount: 3,
  preferredBrands: ["sony"],
};

const input = { products: tray, query, sessionMemory };
const runA = buildAutonomousCommerceIdentity(input, { sessionMemory });
const runB = buildAutonomousCommerceIdentity(input, { sessionMemory });
const replay = assertIdentityReplayDeterministic(runA, runB);
assert.equal(replay.ok, true, replay.reason);

const memA = buildIdentityContinuityMemory(sessionMemory);
const memB = buildIdentityContinuityMemory(sessionMemory);
assert.equal(memA.memoryKey, memB.memoryKey);

console.log("OK commerce identity replay determinism");
console.log("\nAll commerce identity replay tests passed.");
