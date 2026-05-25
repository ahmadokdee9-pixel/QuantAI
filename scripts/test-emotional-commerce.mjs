#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_EMOTIONAL_COMMERCE_INTELLIGENCE_ENABLED = "true";

const { buildEmotionalCommerceIntelligence } = await import(
  "../lib/intelligence/emotionalCommerceIntelligence/buildEmotionalCommerceIntelligence.ts"
);
const { runEmotionalCommerceKernel } = await import(
  "../lib/intelligence/emotionalCommerceIntelligence/kernel/emotionalCommerceKernel.ts"
);
const { validateEmotionalReplayContract, DEFAULT_EMOTIONAL_REPLAY_CONTRACT } =
  await import("../lib/intelligence/emotionalCommerceIntelligence/replay/emotionalReplayContracts.ts");
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");

const tray = GOLDEN_CASES[0].tray;
const query = "luxury minimalist gift cozy comfort designer";
const preLinks = tray.map((p) => p.link);

const engine = runEmotionalCommerceKernel({ products: tray, query }, 0.1);
assert.ok(engine.fusedSignals.length > 0);
assert.ok(engine.emotionalGraph.length > 0);
assert.ok(engine.tasteCognitionGraph.length >= 4);

const result = buildEmotionalCommerceIntelligence({ products: tray, query });
assert.equal(result.products.length, tray.length);
assert.deepEqual(result.products.map((p) => p.link), preLinks);
assert.equal(validateEmotionalReplayContract(DEFAULT_EMOTIONAL_REPLAY_CONTRACT).length, 0);
assert.ok(result.replayFingerprint.startsWith("eci_"));
assert.ok(result.shadowCandidates.every((c) => c.rankingMutation === false));

console.log("OK emotional commerce kernel");
console.log("OK emotional commerce intelligence shadow discipline");
console.log("\nAll emotional commerce tests passed.");
