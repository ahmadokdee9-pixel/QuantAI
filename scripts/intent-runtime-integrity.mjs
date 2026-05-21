/**
 * P5.0 — Trust integrity, suppression precision, governance stability.
 * Usage: npm run test:intent-runtime-integrity
 */
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { RUNTIME_BOUNDED_ENV, RUNTIME_TELEMETRY_ENV, runRuntimePartitions } from "./lib/intentRuntimeRunner.mjs";

let failed = 0;
const rows = runRuntimePartitions(RUNTIME_BOUNDED_ENV);

for (const { trayId, runtime: r } of rows) {
  const ok =
    r.analytics.suppressionPrecisionImpact >= 55 &&
    r.analytics.trustImpactAnalysis >= 50 &&
    r.analytics.merchantDiversityPreservation >= 45 &&
    !r.emergencyShutdown;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, r.analytics);
  } else {
    console.log(`OK ${trayId} trust=${r.analytics.trustImpactAnalysis} suppression=${r.analytics.suppressionPrecisionImpact}`);
  }
}

const prod = runRuntimePartitions({
  ...RUNTIME_TELEMETRY_ENV,
  NODE_ENV: "production",
  INTENT_INTELLIGENCE_APPLY_ENABLED: "true",
});
const rollbackOk = prod[0].runtime.runtimeWarnings.includes("production_runtime_blocked") || !prod[0].runtime.mutationApplied;
if (!rollbackOk) {
  failed += 1;
  console.error("FAIL production runtime blocked", prod[0].runtime);
} else {
  console.log("OK production runtime blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "intent-runtime-integrity", phase: "P5.0", pass: failed === 0 }, "intent-runtime-integrity");

if (failed) process.exit(1);
console.log("\nIntent runtime integrity passed");
