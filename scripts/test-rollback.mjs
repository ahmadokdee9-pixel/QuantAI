#!/usr/bin/env node
import assert from "node:assert";

const { restoreProductOrder, buildRestoreId } = await import(
  "../lib/governance/controlledActivation/rollback/deterministicStateRestore.ts"
);
const { runEmergencyRollbackKernel } = await import(
  "../lib/governance/controlledActivation/rollback/emergencyRollbackKernel.ts"
);
const {
  resetCognitionFreezeForTests,
  clearCognitionFreeze,
} = await import(
  "../lib/governance/controlledActivation/rollback/cognitionFreezeController.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");

resetCognitionFreezeForTests();
const tray = [...GOLDEN_CASES[0].tray];
const preLinks = tray.map((p) => p.link);
const shuffled = [tray[2], tray[0], tray[1], ...tray.slice(3)];
const restored = restoreProductOrder(shuffled, preLinks);
assert.deepEqual(restored.slice(0, preLinks.length).map((p) => p.link), preLinks);

const rid = buildRestoreId(preLinks);
assert.ok(rid.startsWith("rst_"));

const rollback = runEmergencyRollbackKernel({
  products: shuffled,
  preMutationLinks: preLinks,
  governance: {
    approved: false,
    shadowOnly: true,
    blockedReasons: ["ranking_safety"],
    checks: {},
    confidence01: 0.2,
  },
  stackFingerprint: "test",
});
assert.equal(rollback.rolledBack, true);
assert.deepEqual(rollback.products.slice(0, preLinks.length).map((p) => p.link), preLinks);

clearCognitionFreeze();
console.log("OK deterministic state restore");
console.log("OK emergency rollback kernel");
console.log("\nAll rollback tests passed.");
