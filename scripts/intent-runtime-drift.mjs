/**
 * P5.0 — Drift overflow and bounded drift ≤ 3.
 * Usage: npm run test:intent-runtime-drift
 */
import { INTENT_RUNTIME_HARD_ROLLBACK_DRIFT } from "../lib/intent/intentRuntimeFlags.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { RUNTIME_BOUNDED_ENV, runRuntimePartitions } from "./lib/intentRuntimeRunner.mjs";

let failed = 0;
const rows = runRuntimePartitions(RUNTIME_BOUNDED_ENV);

for (const { trayId, runtime: r, row } of rows) {
  const drift = r.analytics.appliedVsBaselineDelta;
  const ok =
    drift <= INTENT_RUNTIME_HARD_ROLLBACK_DRIFT &&
    !r.monitoring.driftOverflow &&
    r.runtimeDelta <= INTENT_RUNTIME_HARD_ROLLBACK_DRIFT;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { drift, runtimeDelta: r.runtimeDelta, monitoring: r.monitoring });
  } else {
    console.log(`OK ${trayId} drift=${drift} runtimeDelta=${r.runtimeDelta}`);
  }
}

if (!rows.every((r) => r.row.rankingStable)) {
  failed += 1;
  console.error("FAIL ranking unstable in runner");
} else {
  console.log("OK ranking stable in runner");
}

saveLiveObservabilityRun({ suite: "intent-runtime-drift", phase: "P5.0", pass: failed === 0 }, "intent-runtime-drift");

if (failed) process.exit(1);
console.log("\nIntent runtime drift passed");
