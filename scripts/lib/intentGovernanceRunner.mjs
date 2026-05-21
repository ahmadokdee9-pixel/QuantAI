/**
 * P4.8 — Shared governance validation runner.
 */

import {
  EVAL_CANARY_ENV,
  INTENT_LIVE_PARTITIONS,
  runIntentEvaluationPartition,
  runIntentEvaluationPartitions,
} from "./intentEvaluationRunner.mjs";

export { EVAL_CANARY_ENV, INTENT_LIVE_PARTITIONS, runIntentEvaluationPartition, runIntentEvaluationPartitions };

export function runGovernancePartitions(env = EVAL_CANARY_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    governance: r.governance,
    evaluation: r.evaluation,
    optimization: r.optimization,
    row: r.row,
  }));
}
