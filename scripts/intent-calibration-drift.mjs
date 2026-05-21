/**
 * P4.9 — Drift-aware calibration and bounded drift.
 * Usage: npm run test:intent-calibration-drift
 */
import { INTENT_OBS_MAX_DRIFT } from "../lib/intent/intentObservabilityFlags.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { runCalibrationPartitions } from "./lib/intentCalibrationRunner.mjs";

let failed = 0;
const rows = runCalibrationPartitions();

for (const { trayId, calibration: c, row } of rows) {
  const drift = row.observability?.driftCount ?? 0;
  const ok =
    drift <= INTENT_OBS_MAX_DRIFT &&
    c.driftWeight >= 0.35 &&
    c.dimensions.rankingStabilityCalibration >= 50 &&
    (drift === 0 || c.calibrationWarnings.includes("drift_aware_calibration") || c.driftWeight > 0.74);

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { drift, driftWeight: c.driftWeight, warnings: c.calibrationWarnings });
  } else {
    console.log(`OK ${trayId} drift=${drift} driftWeight=${c.driftWeight}`);
  }
}

if (!rows.every((r) => r.row.rankingStable)) {
  failed += 1;
  console.error("FAIL ranking unstable");
} else {
  console.log("OK ranking stable");
}

saveLiveObservabilityRun({ suite: "intent-calibration-drift", phase: "P4.9", pass: failed === 0 }, "intent-calibration-drift");

if (failed) process.exit(1);
console.log("\nIntent calibration drift passed");
