/**
 * P4.6 — Full production evaluation gate (all P4.6 dimensions + route wiring).
 * Usage: npm run test:intent-eval-production
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { aggregateIntentEvaluations } from "../lib/intent/intentEvaluationEngine.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { EVAL_CANARY_ENV, INTENT_LIVE_PARTITIONS, runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";

let failed = 0;
const rows = [];

for (const part of INTENT_LIVE_PARTITIONS) {
  const row = runIntentEvaluationPartition(part, EVAL_CANARY_ENV);
  const e = row.evaluation;
  const dims = Object.values(e.dimensions);
  const ok =
    e.version === "intent-evaluation-v1" &&
    dims.every((v) => v >= 45 && v <= 100) &&
    e.analytics.canaryOutcomeScore >= 50 &&
    e.qualityScore >= 55 &&
    row.rankingStable;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${part.id}`, e.dimensions, e.qualityScore);
  } else {
    console.log(`OK ${part.id} canaryOutcome=${e.analytics.canaryOutcomeScore} quality=${e.qualityScore}`);
  }
  rows.push({ trayId: part.id, evaluation: e });
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("intentEvaluation") || !route.includes("buildIntentEvaluationMeta")) {
  failed += 1;
  console.error("FAIL meta.intentEvaluation not wired");
} else {
  console.log("OK meta.intentEvaluation wired");
}

const agg = aggregateIntentEvaluations(rows);
console.log("\n--- P4.6 AGGREGATE ---");
console.log(JSON.stringify(agg, null, 2));

saveLiveObservabilityRun(
  {
    suite: "intent-eval-production",
    phase: "P4.6",
    pass: failed === 0,
    pass_rate_pct: Math.round((rows.length - failed) / rows.length * 100),
    aggregate: agg,
    recommendation: failed === 0 ? "production_evaluation_operational" : "evaluation_degraded",
  },
  "intent-eval-production"
);

if (failed) process.exit(1);
console.log("\nIntent eval production passed");
