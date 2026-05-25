#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_CONTROLLED_ACTIVATION_ENABLED = "true";
process.env.QUANTAI_CANARY_ACTIVATION_PERCENT = "1";
process.env.QUANTAI_NORMALIZATION_APPLY = "false";

const { runMutationGovernanceKernel } = await import(
  "../lib/governance/controlledActivation/mutation/mutationGovernanceKernel.ts"
);
const { buildControlledActivation } = await import(
  "../lib/governance/controlledActivation/buildControlledActivation.ts"
);
const { assertActivationReplayDeterministic } = await import(
  "../lib/governance/controlledActivation/replay/deterministicActivationExecution.ts"
);
const { validateActivationReplayContract, DEFAULT_ACTIVATION_REPLAY_CONTRACT } =
  await import("../lib/governance/controlledActivation/replay/activationReplayContracts.ts");
const { buildTrustTruthEngine } = await import(
  "../lib/intelligence/trust/buildTrustTruthEngine.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { resetCognitionFreezeForTests } = await import(
  "../lib/governance/controlledActivation/rollback/cognitionFreezeController.ts"
);

resetCognitionFreezeForTests();
const tray = GOLDEN_CASES[0].tray;
const preLinks = tray.map((p) => p.link);
process.env.QUANTAI_TRUST_ENGINE_ENABLED = "true";
const trust = buildTrustTruthEngine({ products: tray, query: GOLDEN_CASES[0].query });

const gov = runMutationGovernanceKernel({
  products: tray,
  query: GOLDEN_CASES[0].query,
  sessionKey: "gov_test",
  preMutationLinks: preLinks,
  trustResult: trust,
  latencyBudgetOk: true,
});
assert.ok(Object.keys(gov.checks).length >= 6);

const runA = buildControlledActivation({
  products: tray,
  query: GOLDEN_CASES[0].query,
  sessionKey: "full_stack_session",
  preMutationLinks: preLinks,
  trustResult: trust,
  latencyBudgetOk: true,
});
const runB = buildControlledActivation({
  products: tray,
  query: GOLDEN_CASES[0].query,
  sessionKey: "full_stack_session",
  preMutationLinks: preLinks,
  trustResult: trust,
  latencyBudgetOk: true,
});

assert.equal(validateActivationReplayContract(DEFAULT_ACTIVATION_REPLAY_CONTRACT).length, 0);
assert.equal(assertActivationReplayDeterministic(runA, runB).ok, true);
assert.equal(runA.meta.globalApplyBlocked, true);
assert.equal(runA.shadowMutation.rankingMutation, false);

console.log("OK mutation governance kernel");
console.log("OK activation replay determinism");
console.log("\nAll activation governance tests passed.");
