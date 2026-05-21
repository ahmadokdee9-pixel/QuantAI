/**
 * P5.1 — Trust, suppression, governance integrity.
 * Usage: npm run test:intent-orchestration-integrity
 */
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { ORCHESTRATION_BOUNDED_ENV, ORCHESTRATION_TELEMETRY_ENV, runOrchestrationPartitions } from "./lib/intentOrchestrationRunner.mjs";

let failed = 0;
const rows = runOrchestrationPartitions(ORCHESTRATION_BOUNDED_ENV);

for (const { trayId, orchestration: o } of rows) {
  const ok =
    o.analytics.trustRiskReductionMetrics >= 45 &&
    o.analytics.suppressionRecoveryMetrics >= 55 &&
    o.analytics.merchantFairnessMetrics >= 28 &&
    !o.monitoring.trustInflation;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, o.analytics);
  } else {
    console.log(`OK ${trayId} trust=${o.analytics.trustRiskReductionMetrics} suppression=${o.analytics.suppressionRecoveryMetrics}`);
  }
}

const prod = runOrchestrationPartitions(ORCHESTRATION_TELEMETRY_ENV);
const blockedOk =
  prod[0].orchestration.orchestrationWarnings.includes("production_orchestration_blocked") ||
  !prod[0].orchestration.mutationApplied;
if (!blockedOk) {
  failed += 1;
  console.error("FAIL production orchestration blocked", prod[0].orchestration);
} else {
  console.log("OK production orchestration blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "intent-orchestration-integrity", phase: "P5.1", pass: failed === 0 }, "intent-orchestration-integrity");

if (failed) process.exit(1);
console.log("\nIntent orchestration integrity passed");
