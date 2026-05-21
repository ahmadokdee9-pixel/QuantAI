/**
 * P4.6 — Explanation consistency and rollback explainability.
 * Usage: npm run test:intent-eval-explainability
 */
import { INTENT_EVAL_MIN_EXPLANATION_FIELDS } from "../lib/intent/intentEvaluationFlags.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { EVAL_CANARY_ENV, INTENT_LIVE_PARTITIONS, runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";

let failed = 0;

for (const part of INTENT_LIVE_PARTITIONS) {
  const row = runIntentEvaluationPartition(part, EVAL_CANARY_ENV);
  const ex = row.evaluation.explainability;
  const fieldCount =
    (ex.whyBoosted.length > 0 ? 1 : 0) +
    (ex.whySuppressed.length > 0 ? 1 : 0) +
    (ex.whyStable.length > 0 ? 1 : 0) +
    (ex.appliedDimensions.length >= 0 ? 1 : 0) +
    (ex.skippedDimensions.length > 0 ? 1 : 0) +
    (ex.rollbackContext != null ? 1 : 0);

  const ok =
    ex.whyStable.length >= 1 &&
    ex.skippedDimensions.length >= 1 &&
    row.evaluation.explanationCompleteness >= INTENT_EVAL_MIN_EXPLANATION_FIELDS * 15;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${part.id}`, { fieldCount, ex, completeness: row.evaluation.explanationCompleteness });
  } else {
    console.log(`OK ${part.id} completeness=${row.evaluation.explanationCompleteness}% fields=${fieldCount}`);
  }
}

const blocked = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], {
  NODE_ENV: "production",
  INTENT_INTELLIGENCE_APPLY_ENABLED: "true",
  INTENT_INTELLIGENCE_CANARY_APPLY: undefined,
  INTENT_INTELLIGENCE_PROD_APPLY: undefined,
  INTENT_CANARY_ROLLOUT_STAGE: undefined,
  TASTE_UNIFIED_APPLY_ENABLED: "false",
});
const rollbackCtx = blocked.evaluation.explainability.rollbackContext;
const blockedOk = Boolean(rollbackCtx) && rollbackCtx.includes("production:blocked");
if (!blockedOk) {
  failed += 1;
  console.error("FAIL rollback context when production blocked", blocked.evaluation.explainability);
} else {
  console.log(`OK rollback context: ${rollbackCtx}`);
}

const run1 = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[1], EVAL_CANARY_ENV);
const run2 = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[1], EVAL_CANARY_ENV);
const stableExpl =
  JSON.stringify(run1.evaluation.explainability) === JSON.stringify(run2.evaluation.explainability);
if (!stableExpl) {
  failed += 1;
  console.error("FAIL explanation not deterministic");
} else {
  console.log("OK explanation deterministic across runs");
}

saveLiveObservabilityRun({ suite: "intent-eval-explainability", phase: "P4.6", pass: failed === 0 }, "intent-eval-explainability");

if (failed) process.exit(1);
console.log("\nIntent eval explainability passed");
