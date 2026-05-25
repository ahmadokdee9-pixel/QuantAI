#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_UNIVERSAL_COMMERCE_INTELLIGENCE_ENABLED = "true";

const { buildUniversalCommerceIntelligence } = await import(
  "../lib/intelligence/universalCommerceIntelligence/buildUniversalCommerceIntelligence.ts"
);
const { runUniversalCommerceKernel } = await import(
  "../lib/intelligence/universalCommerceIntelligence/kernel/universalCommerceKernel.ts"
);
const { validateUniversalReplayContract, DEFAULT_UNIVERSAL_REPLAY_CONTRACT } =
  await import("../lib/intelligence/universalCommerceIntelligence/replay/universalReplayContracts.ts");
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");

const tray = GOLDEN_CASES[0].tray;
const query = "luxury watch rolex designer";
const preLinks = tray.map((p) => p.link);

const engine = runUniversalCommerceKernel({ products: tray, query }, 0.1);
assert.ok(engine.fusedSignals.length > 0);
assert.ok(["fashion", "luxury", "watches_jewelry", "electronics", "general"].includes(
  engine.categoryCognition.dominantVertical
));

const result = buildUniversalCommerceIntelligence({ products: tray, query });
assert.equal(result.products.length, tray.length);
assert.deepEqual(result.products.map((p) => p.link), preLinks);
assert.equal(validateUniversalReplayContract(DEFAULT_UNIVERSAL_REPLAY_CONTRACT).length, 0);
assert.ok(result.replayFingerprint.startsWith("uci_"));
assert.ok(result.shadowCandidates.every((c) => c.rankingMutation === false));

console.log("OK universal commerce kernel");
console.log("OK universal commerce intelligence shadow discipline");
console.log("\nAll universal commerce tests passed.");
