/**
 * P5.1 — Orchestration stability and emergency shutdown.
 * Usage: npm run test:intent-orchestration-stability
 */
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { ORCHESTRATION_BOUNDED_ENV, runOrchestrationPartitions } from "./lib/intentOrchestrationRunner.mjs";

let failed = 0;
const rows = runOrchestrationPartitions(ORCHESTRATION_BOUNDED_ENV);

for (const { trayId, orchestration: o } of rows) {
  const ok =
    o.stabilizationScore >= 50 &&
    o.monitoring.replayConsistencyReady &&
    !o.monitoring.orchestrationInstability;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { stabilization: o.stabilizationScore, monitoring: o.monitoring });
  } else {
    console.log(`OK ${trayId} stabilization=${o.stabilizationScore} lane=${o.routingLane}`);
  }
}

process.env.INTENT_ORCHESTRATION_EMERGENCY_SHUTDOWN = "true";
process.env.INTENT_ORCHESTRATION_ENABLED = "true";
process.env.INTENT_ORCHESTRATION_MODE = "bounded-orchestration";
const { applyControlledIntentOrchestration } = await import("../lib/intent/intentOrchestrator.ts");
const sample = rows[0];
const shutdown = applyControlledIntentOrchestration({
  products: sample.row.runtimeProducts ?? sample.row.products,
  evaluation: sample.row.evaluation,
  optimization: sample.row.optimization,
  governance: sample.row.governance,
  calibration: sample.row.calibration,
  runtime: sample.row.runtime,
  preOrderLinks: (sample.row.runtimeProducts ?? sample.row.products).map((p) => p.link || p.title),
});
delete process.env.INTENT_ORCHESTRATION_EMERGENCY_SHUTDOWN;

if (shutdown.meta.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown", shutdown.meta);
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "intent-orchestration-stability", phase: "P5.1", pass: failed === 0 }, "intent-orchestration-stability");

if (failed) process.exit(1);
console.log("\nIntent orchestration stability passed");
