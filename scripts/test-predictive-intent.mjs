#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_PREDICTIVE_COMMERCE_INTENT_ENABLED = "true";
process.env.QUANTAI_AUTONOMOUS_COMMERCE_IDENTITY_ENABLED = "true";
process.env.QUANTAI_COMMERCE_EVOLUTION_ENABLED = "true";

const { buildPredictiveCommerceIntent } = await import(
  "../lib/intelligence/predictiveCommerceIntent/buildPredictiveCommerceIntent.ts"
);
const { runPredictiveIntentKernel } = await import(
  "../lib/intelligence/predictiveCommerceIntent/kernel/predictiveIntentKernel.ts"
);
const { validatePredictionReplayContract, DEFAULT_PREDICTION_REPLAY_CONTRACT } =
  await import("../lib/intelligence/predictiveCommerceIntent/replay/predictionReplayContracts.ts");
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const tray = GOLDEN_CASES[0].tray;
const query = "upgrade iphone replace newer urgent buy";
const preLinks = tray.map((p) => p.link);
const sessionMemory = { ...EMPTY_COMMERCE_SESSION_MEMORY, interactionCount: 6 };

const engine = runPredictiveIntentKernel(
  { products: tray, query, sessionMemory },
  sessionMemory,
  0.1
);
assert.ok(engine.fusedSignals.length > 0);
assert.ok(engine.readiness.readiness01 >= 0);

const result = buildPredictiveCommerceIntent(
  { products: tray, query, sessionMemory },
  { sessionMemory }
);
assert.equal(result.products.length, tray.length);
assert.deepEqual(result.products.map((p) => p.link), preLinks);
assert.equal(validatePredictionReplayContract(DEFAULT_PREDICTION_REPLAY_CONTRACT).length, 0);
assert.ok(result.replayFingerprint.startsWith("pci_"));
assert.ok(result.shadowCandidates.every((c) => c.rankingMutation === false));
assert.ok(result.explain.traceExamples.length > 0);

console.log("OK predictive intent kernel");
console.log("OK predictive commerce intent shadow discipline");
console.log("\nAll predictive intent tests passed.");
