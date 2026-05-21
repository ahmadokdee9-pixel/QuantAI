/**
 * P4.9 — Shared calibration validation runner.
 */

import {
  EVAL_CANARY_ENV,
  INTENT_LIVE_PARTITIONS,
  runIntentEvaluationPartition,
  runIntentEvaluationPartitions,
} from "./intentEvaluationRunner.mjs";

export { EVAL_CANARY_ENV, INTENT_LIVE_PARTITIONS, runIntentEvaluationPartition, runIntentEvaluationPartitions };

export function runCalibrationPartitions(env = EVAL_CANARY_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    calibration: r.calibration,
    governance: r.governance,
    evaluation: r.evaluation,
    row: r.row,
  }));
}
