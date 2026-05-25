#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_COMMERCE_EVOLUTION_ENABLED = "true";
process.env.QUANTAI_RECOMMENDATION_COGNITION_ENABLED = "true";
process.env.QUANTAI_COMMERCE_MEMORY_ENABLED = "true";

const { buildCommerceEvolution } = await import(
  "../lib/intelligence/commerceEvolution/buildCommerceEvolution.ts"
);
const { runBoundedEvolutionEngine } = await import(
  "../lib/intelligence/commerceEvolution/engine/boundedEvolutionEngine.ts"
);
const { validateEvolutionReplayContract, DEFAULT_EVOLUTION_REPLAY_CONTRACT } =
  await import("../lib/intelligence/commerceEvolution/replay/evolutionReplayContracts.ts");
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const tray = GOLDEN_CASES[0].tray;
const preLinks = tray.map((p) => p.link);

const engine = runBoundedEvolutionEngine({
  products: tray,
  query: "upgrade iphone replace newer 2026",
  sessionMemory: { ...EMPTY_COMMERCE_SESSION_MEMORY, interactionCount: 5 },
});
assert.ok(["discovery", "comparison", "commitment", "replacement"].includes(engine.lifecycle.phase));
assert.ok(engine.memoryGraph.nodes.length > 0);

const result = buildCommerceEvolution({
  products: tray,
  query: "upgrade iphone replace newer 2026",
  sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
});
assert.equal(result.products.length, tray.length);
assert.deepEqual(result.products.map((p) => p.link), preLinks);
assert.equal(validateEvolutionReplayContract(DEFAULT_EVOLUTION_REPLAY_CONTRACT).length, 0);
assert.ok(result.replayFingerprint.startsWith("evo_"));
assert.ok(result.shadowCandidates.every((c) => c.rankingMutation === false));

console.log("OK bounded evolution engine");
console.log("OK commerce evolution shadow discipline");
console.log("\nAll evolution tests passed.");
