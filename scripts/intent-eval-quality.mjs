/**
 * P4.6 — Evaluation quality score stability.
 * Usage: npm run test:intent-eval-quality
 */
import { aggregateIntentEvaluations } from "../lib/intent/intentEvaluationEngine.ts";
import { INTENT_EVAL_MIN_QUALITY_SCORE } from "../lib/intent/intentEvaluationFlags.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { EVAL_CANARY_ENV, INTENT_LIVE_PARTITIONS, runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";

let failed = 0;
const rows = [];

for (const part of INTENT_LIVE_PARTITIONS) {
  const row = runIntentEvaluationPartition(part, EVAL_CANARY_ENV);
  const e = row.evaluation;
  const ok =
    e.version === "intent-evaluation-v1" &&
    e.active &&
    e.qualityScore >= INTENT_EVAL_MIN_QUALITY_SCORE &&
    e.trustScore >= 55 &&
    e.dimensions.trustQuality >= 50 &&
    e.analytics.driftQualityScore >= 60;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${part.id}`, { qualityScore: e.qualityScore, trustScore: e.trustScore });
  } else {
    console.log(`OK ${part.id} quality=${e.qualityScore} trust=${e.trustScore}`);
  }
  rows.push({ trayId: part.id, evaluation: e });
}

const agg = aggregateIntentEvaluations(rows);
if (!agg.topPerformingDimensions.length) {
  failed += 1;
  console.error("FAIL no top performing dimensions");
} else {
  console.log(`OK top dimensions: ${agg.topPerformingDimensions.join(", ")}`);
}

saveLiveObservabilityRun(
  {
    suite: "intent-eval-quality",
    phase: "P4.6",
    pass_rate_pct: Math.round((rows.filter((r) => r.evaluation.qualityScore >= INTENT_EVAL_MIN_QUALITY_SCORE).length / rows.length) * 100),
    aggregate: agg,
    rows: rows.map((r) => ({ id: r.trayId, qualityScore: r.evaluation.qualityScore })),
  },
  "intent-eval-quality"
);

if (failed) process.exit(1);
console.log("\nIntent eval quality passed");
