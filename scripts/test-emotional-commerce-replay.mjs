#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_EMOTIONAL_COMMERCE_INTELLIGENCE_ENABLED = "true";

const { buildEmotionalCommerceIntelligence } = await import(
  "../lib/intelligence/emotionalCommerceIntelligence/buildEmotionalCommerceIntelligence.ts"
);
const { assertEmotionalReplayDeterministic } = await import(
  "../lib/intelligence/emotionalCommerceIntelligence/replay/deterministicEmotionalExecution.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");

const tray = GOLDEN_CASES[0].tray;
const query = "premium lifestyle minimalist watch gift";

const runA = buildEmotionalCommerceIntelligence({ products: tray, query });
const runB = buildEmotionalCommerceIntelligence({ products: tray, query });

assert.equal(runA.replayFingerprint, runB.replayFingerprint);
const det = assertEmotionalReplayDeterministic(runA, runB);
assert.ok(det.ok, det.reason);

console.log("OK emotional commerce replay fingerprint:", runA.replayFingerprint);
console.log("\nAll emotional commerce replay tests passed.");
