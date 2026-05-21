/**
 * P5.1 — Orchestration drift ≤ 2.
 * Usage: npm run test:intent-orchestration-drift
 */
import { INTENT_ORCH_MAX_DRIFT } from "../lib/intent/intentOrchestrationFlags.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { ORCHESTRATION_BOUNDED_ENV, runOrchestrationPartitions } from "./lib/intentOrchestrationRunner.mjs";

let failed = 0;
const rows = runOrchestrationPartitions(ORCHESTRATION_BOUNDED_ENV);

for (const { trayId, orchestration: o } of rows) {
  const ok =
    o.orchestrationDelta <= INTENT_ORCH_MAX_DRIFT &&
    o.analytics.topDriftCount <= INTENT_ORCH_MAX_DRIFT &&
    !o.monitoring.driftEscalation;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, {
      delta: o.orchestrationDelta,
      topDrift: o.analytics.topDriftCount,
      monitoring: o.monitoring,
    });
  } else {
    console.log(`OK ${trayId} delta=${o.orchestrationDelta} topDrift=${o.analytics.topDriftCount}`);
  }
}

saveLiveObservabilityRun({ suite: "intent-orchestration-drift", phase: "P5.1", pass: failed === 0 }, "intent-orchestration-drift");

if (failed) process.exit(1);
console.log("\nIntent orchestration drift passed");
