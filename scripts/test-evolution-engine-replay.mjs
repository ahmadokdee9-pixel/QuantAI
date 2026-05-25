#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_AUTONOMOUS_COMMERCE_EVOLUTION_ENABLED = "true";

const { buildAutonomousCommerceEvolution } = await import(
  "../lib/intelligence/autonomousCommerceEvolution/buildAutonomousCommerceEvolution.ts"
);
const { assertEvolutionReplayDeterministic } = await import(
  "../lib/intelligence/autonomousCommerceEvolution/replay/deterministicEvolutionExecution.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");

const tray = GOLDEN_CASES[0].tray;
const query = "fashion beauty cross category evolution calibration";

const runA = buildAutonomousCommerceEvolution({ products: tray, query });
const runB = buildAutonomousCommerceEvolution({ products: tray, query });

assert.equal(runA.replayFingerprint, runB.replayFingerprint);
const det = assertEvolutionReplayDeterministic(runA, runB);
assert.ok(det.ok, det.reason);

console.log("OK evolution engine replay fingerprint:", runA.replayFingerprint);
console.log("\nAll evolution engine replay tests passed.");
