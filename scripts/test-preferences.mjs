#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_COMMERCE_MEMORY_ENABLED = "true";

const { applyConfidenceDecay } = await import(
  "../lib/intelligence/memory/signals/confidenceDecayEngine.ts"
);
const { buildDeterministicPreferenceSignals } = await import(
  "../lib/intelligence/memory/signals/deterministicPreferenceSignals.ts"
);
const { runTasteProfileEngine } = await import(
  "../lib/intelligence/memory/taste/tasteProfileEngine.ts"
);
const { runCommerceMemoryKernel } = await import(
  "../lib/intelligence/memory/memory/commerceMemoryKernel.ts"
);
const { buildCommerceMemoryFoundation } = await import(
  "../lib/intelligence/memory/buildCommerceMemoryFoundation.ts"
);
const { MAX_MEMORY_GROWTH_BYTES } = await import(
  "../lib/intelligence/memory/replay/preferenceReplayContracts.ts"
);
const { verifyBoundedMemoryGrowth } = await import(
  "../lib/intelligence/memory/replay/deterministicMemoryExecution.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { EMPTY_COMMERCE_SESSION_MEMORY } = await import(
  "../lib/intelligence/commerceSessionMemory.ts"
);

const tray = GOLDEN_CASES[0].tray;
const sessionHigh = {
  ...EMPTY_COMMERCE_SESSION_MEMORY,
  interactionCount: 20,
  preferredBrands: ["apple", "samsung"],
  categoryAffinity: { electronics: 5, phones: 3 },
};

const decayLow = applyConfidenceDecay({ rawConfidence01: 0.8, interactionCount: 0 });
const decayHigh = applyConfidenceDecay({ rawConfidence01: 0.8, interactionCount: 20 });
assert.ok(decayHigh < decayLow, "confidence decays with interaction count");

const taste = runTasteProfileEngine({ query: "apple iphone", products: tray, sessionMemory: sessionHigh });
const memory = runCommerceMemoryKernel({ query: "apple iphone", products: tray, sessionMemory: sessionHigh });
const signals = buildDeterministicPreferenceSignals({ taste, memory, sessionMemory: sessionHigh });
assert.equal(signals.rankingMutation, false);
assert.ok(signals.preferenceScore > 0);
assert.ok(signals.stability01 > 0);

const result = buildCommerceMemoryFoundation(
  { products: tray, query: "apple iphone", sessionMemory: sessionHigh },
  { sessionMemory: sessionHigh }
);
assert.ok(verifyBoundedMemoryGrowth(result.meta.memoryGrowthBytes));
assert.ok(result.meta.memoryGrowthBytes <= MAX_MEMORY_GROWTH_BYTES);

console.log("OK confidence decay");
console.log("OK deterministic preference signals");
console.log("OK bounded memory growth");
console.log("\nAll preference tests passed.");
