#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_LIVE_COMMERCE_SIGNALS_ENABLED = "true";
process.env.QUANTAI_AUTONOMOUS_COMMERCE_OS_ENABLED = "true";
process.env.QUANTAI_TRUST_ENGINE_ENABLED = "true";
process.env.QUANTAI_COMMERCE_EVOLUTION_ENABLED = "true";
process.env.QUANTAI_COMMERCE_BRAIN_ENABLED = "true";

const { buildLiveAdaptiveCommerceSignals } = await import(
  "../lib/intelligence/liveAdaptiveCommerceSignals/buildLiveCommerceSignals.ts"
);
const { runBoundedLiveSignalEngine } = await import(
  "../lib/intelligence/liveAdaptiveCommerceSignals/engine/boundedLiveSignalEngine.ts"
);
const { validateLiveSignalReplayContract, DEFAULT_LIVE_SIGNAL_REPLAY_CONTRACT } =
  await import("../lib/intelligence/liveAdaptiveCommerceSignals/replay/liveSignalReplayContracts.ts");
const { fuseDeterministicLiveSignals } = await import(
  "../lib/intelligence/liveAdaptiveCommerceSignals/kernel/deterministicSignalFusionKernel.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");

const tray = GOLDEN_CASES[0].tray;
const query = GOLDEN_CASES[0].query;
const preLinks = tray.map((p) => p.link);

const fused = fuseDeterministicLiveSignals([
  { signalId: "momentum", strength01: 0.6 },
  { signalId: "market_interpretation", strength01: 0.5 },
]);
assert.ok(fused.length >= 2);
assert.ok(fused.every((s) => s.trustAdjusted01 >= 0 && s.trustAdjusted01 <= 1));

const engine = runBoundedLiveSignalEngine({ products: tray, query }, 0.12);
assert.ok(engine.fusedSignals.length > 0);
assert.ok(["low", "moderate", "elevated"].includes(engine.volatilityBand));

const result = buildLiveAdaptiveCommerceSignals({ products: tray, query });
assert.equal(result.products.length, tray.length);
assert.deepEqual(result.products.map((p) => p.link), preLinks);
assert.equal(validateLiveSignalReplayContract(DEFAULT_LIVE_SIGNAL_REPLAY_CONTRACT).length, 0);
assert.ok(result.replayFingerprint.startsWith("lcs_"));
assert.ok(result.shadowCandidates.every((c) => c.rankingMutation === false));
assert.ok(result.meta.maxInfluence01 <= 0.15);

console.log("OK bounded live signal engine");
console.log("OK live commerce signals shadow discipline");
console.log("\nAll live signals tests passed.");
