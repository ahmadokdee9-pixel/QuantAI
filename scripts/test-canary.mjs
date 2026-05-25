#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_CONTROLLED_ACTIVATION_ENABLED = "true";
process.env.QUANTAI_CANARY_ACTIVATION_PERCENT = "0.01";
process.env.QUANTAI_NORMALIZATION_APPLY = "false";

const { allocateTrafficBucket, isInCanaryBucket } = await import(
  "../lib/governance/controlledActivation/canary/activationTrafficAllocator.ts"
);
const { evaluateDeterministicMutationGate } = await import(
  "../lib/governance/controlledActivation/canary/deterministicMutationGate.ts"
);
const { readControlledActivationFlags } = await import(
  "../lib/governance/controlledActivation/flags.ts"
);
const { runCanaryActivationKernel } = await import(
  "../lib/governance/controlledActivation/canary/canaryActivationKernel.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");

const flags = readControlledActivationFlags();
const gate = evaluateDeterministicMutationGate(flags);
assert.equal(gate.globalApplyBlocked, true);

const bucket = allocateTrafficBucket("session_canary_test_fixed");
assert.ok(bucket >= 0 && bucket < 10000);
assert.equal(isInCanaryBucket(0, 0.01), true);
assert.equal(isInCanaryBucket(9999, 0.01), false);

flags.canaryPercent = 0.01;
flags.emergencyDisable = false;
const tray = GOLDEN_CASES[0].tray;
let foundIn = false;
let foundOut = false;
for (let i = 0; i < 200; i++) {
  const act = runCanaryActivationKernel({
    flags,
    sessionKey: `probe_${i}`,
    query: tray[0].title,
    category: "electronics",
    products: tray,
    cognitionConfidence01: 0.7,
  });
  if (act.inCanary) foundIn = true;
  else foundOut = true;
}
assert.ok(foundOut, "most traffic excluded at 1%");

console.log("OK traffic allocator");
console.log("OK mutation gate global apply blocked");
console.log("OK canary activation kernel");
console.log("\nAll canary tests passed.");
