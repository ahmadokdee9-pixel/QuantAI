#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_AUTONOMOUS_COMMERCE_EVOLUTION_ENABLED = "true";

const { buildAutonomousCommerceEvolution } = await import(
  "../lib/intelligence/autonomousCommerceEvolution/buildAutonomousCommerceEvolution.ts"
);
const { runAutonomousEvolutionKernel } = await import(
  "../lib/intelligence/autonomousCommerceEvolution/kernel/autonomousEvolutionKernel.ts"
);
const { validateEvolutionReplayContract, DEFAULT_EVOLUTION_REPLAY_CONTRACT } =
  await import("../lib/intelligence/autonomousCommerceEvolution/replay/evolutionReplayContracts.ts");
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");

const tray = GOLDEN_CASES[0].tray;
const query = "luxury watch compare premium evolution ontology";
const preLinks = tray.map((p) => p.link);

const engine = runAutonomousEvolutionKernel({ products: tray, query }, 0.1);
assert.ok(engine.fusedSignals.length > 0);
assert.ok(engine.evolutionGraph.length >= 4);

const result = buildAutonomousCommerceEvolution({ products: tray, query });
assert.equal(result.products.length, tray.length);
assert.deepEqual(result.products.map((p) => p.link), preLinks);
assert.equal(validateEvolutionReplayContract(DEFAULT_EVOLUTION_REPLAY_CONTRACT).length, 0);
assert.ok(result.replayFingerprint.startsWith("ace_"));
assert.ok(result.shadowCandidates.every((c) => c.rankingMutation === false));

console.log("OK autonomous evolution kernel");
console.log("OK autonomous commerce evolution shadow discipline");
console.log("\nAll evolution engine tests passed.");
