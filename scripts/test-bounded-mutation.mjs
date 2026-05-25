#!/usr/bin/env node
import assert from "node:assert";

process.env.QUANTAI_CONTROLLED_ACTIVATION_ENABLED = "true";
process.env.QUANTAI_CANARY_ACTIVATION_PERCENT = "1";

const { prepareShadowRecommendationMutation } = await import(
  "../lib/governance/controlledActivation/apply/shadowRecommendationMutation.ts"
);
const {
  DEFAULT_SHADOW_RECOMMENDATION_APPLY_CONTRACT,
  validateRecommendationApplyContract,
} = await import(
  "../lib/governance/controlledActivation/apply/deterministicRecommendationApplyContracts.ts"
);
const { computeBoundedInfluence } = await import(
  "../lib/governance/controlledActivation/influence/boundedRecommendationInfluence.ts"
);
const { buildRecommendationCognition } = await import(
  "../lib/intelligence/recommendationCognition/buildRecommendationCognition.ts"
);
const { GOLDEN_CASES } = await import("./lib/normalizationGoldenFixtures.mjs");
const { resetCognitionFreezeForTests } = await import(
  "../lib/governance/controlledActivation/rollback/cognitionFreezeController.ts"
);

resetCognitionFreezeForTests();
process.env.QUANTAI_RECOMMENDATION_COGNITION_ENABLED = "true";
const tray = GOLDEN_CASES[0].tray;
const rec = buildRecommendationCognition({ products: tray, query: GOLDEN_CASES[0].query });

assert.equal(validateRecommendationApplyContract(DEFAULT_SHADOW_RECOMMENDATION_APPLY_CONTRACT).length, 0);
assert.equal(DEFAULT_SHADOW_RECOMMENDATION_APPLY_CONTRACT.liveApply, false);

const influence = computeBoundedInfluence(rec, 0.8);
assert.ok(influence <= 0.12);

const shadow = prepareShadowRecommendationMutation({
  activation: { inCanary: true, mutationAllowed: "shadow_only", routeReason: "canary", trafficBucket: 1 },
  governance: {
    approved: true,
    shadowOnly: true,
    blockedReasons: [],
    checks: { replay_determinism: true },
    confidence01: 0.85,
  },
  recommendationResult: rec,
  maxInfluence01: 0.12,
});
assert.equal(shadow.prepared, true);
assert.equal(shadow.rankingMutation, false);

console.log("OK shadow recommendation mutation prep");
console.log("OK bounded influence cap");
console.log("\nAll bounded mutation tests passed.");
