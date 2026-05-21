/**
 * P4.9 — Trust integrity, suppression balance, calibrated confidence.
 * Usage: npm run test:intent-calibration-integrity
 */
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { runCalibrationPartitions } from "./lib/intentCalibrationRunner.mjs";

let failed = 0;
const rows = runCalibrationPartitions();

for (const { trayId, calibration: c } of rows) {
  const ok =
    c.dimensions.trustCalibration >= 60 &&
    c.analytics.trustCalibrationQuality >= 60 &&
    c.analytics.suppressionPrecision >= 55 &&
    c.dimensions.suppressionCalibration >= 55 &&
    c.confidenceWeight >= 0.35 &&
    !c.monitoring.suppressionImbalance;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, {
      trust: c.dimensions.trustCalibration,
      suppression: c.dimensions.suppressionCalibration,
      precision: c.analytics.suppressionPrecision,
    });
  } else {
    console.log(
      `OK ${trayId} trust=${c.dimensions.trustCalibration} suppression=${c.dimensions.suppressionCalibration} prec=${c.analytics.suppressionPrecision}`
    );
  }
}

const prod = runCalibrationPartitions({
  NODE_ENV: "production",
  INTENT_INTELLIGENCE_APPLY_ENABLED: "true",
  INTENT_INTELLIGENCE_CANARY_APPLY: undefined,
  INTENT_INTELLIGENCE_PROD_APPLY: undefined,
  INTENT_CANARY_ROLLOUT_STAGE: undefined,
  TASTE_UNIFIED_APPLY_ENABLED: "false",
});
const rollbackOk =
  prod[0].calibration.rollbackCalibrationReason?.includes("production_blocked") ||
  prod[0].calibration.rollbackCalibrationReason?.includes("governance:");
if (!rollbackOk) {
  failed += 1;
  console.error("FAIL rollback calibration", prod[0].calibration.rollbackCalibrationReason);
} else {
  console.log(`OK rollback calibration: ${prod[0].calibration.rollbackCalibrationReason}`);
}

saveLiveObservabilityRun({ suite: "intent-calibration-integrity", phase: "P4.9", pass: failed === 0 }, "intent-calibration-integrity");

if (failed) process.exit(1);
console.log("\nIntent calibration integrity passed");
