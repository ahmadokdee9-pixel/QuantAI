/**
 * P4.6 — Drift quality measurable and capped.
 * Usage: npm run test:intent-eval-drift
 */
import { aggregateIntentEvaluations } from "../lib/intent/intentEvaluationEngine.ts";
import { INTENT_OBS_MAX_DRIFT } from "../lib/intent/intentObservabilityFlags.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { EVAL_CANARY_ENV, INTENT_LIVE_PARTITIONS, runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";

let failed = 0;
const rows = [];

for (const part of INTENT_LIVE_PARTITIONS) {
  const row = runIntentEvaluationPartition(part, EVAL_CANARY_ENV);
  const e = row.evaluation;
  const ok =
    row.drift <= INTENT_OBS_MAX_DRIFT &&
    e.analytics.baselineVsApplyDelta <= INTENT_OBS_MAX_DRIFT &&
    e.analytics.driftQualityScore >= 55 &&
    e.dimensions.rankingQuality >= 50;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${part.id}`, {
      drift: row.drift,
      baselineVsApplyDelta: e.analytics.baselineVsApplyDelta,
      driftQualityScore: e.analytics.driftQualityScore,
    });
  } else {
    console.log(`OK ${part.id} drift=${row.drift} driftQuality=${e.analytics.driftQualityScore}`);
  }
  rows.push({ trayId: part.id, evaluation: e });
}

const heatmap = aggregateIntentEvaluations(rows).driftHeatmap;
const maxHeat = Math.max(0, ...Object.values(heatmap));
if (maxHeat > INTENT_OBS_MAX_DRIFT) {
  failed += 1;
  console.error("FAIL drift heatmap exceeds cap", heatmap);
} else {
  console.log("OK drift heatmap within cap", heatmap);
}

saveLiveObservabilityRun(
  { suite: "intent-eval-drift", phase: "P4.6", drift_heatmap: heatmap, max_drift: maxHeat },
  "intent-eval-drift"
);

if (failed) process.exit(1);
console.log("\nIntent eval drift passed");
