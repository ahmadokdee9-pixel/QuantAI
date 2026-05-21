/**
 * P4.9 — Calibration stability, diversity preservation, monitoring checks.
 * Usage: npm run test:intent-calibration-stability
 */
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { runCalibrationPartitions } from "./lib/intentCalibrationRunner.mjs";

let failed = 0;
const rows = runCalibrationPartitions();

for (const { trayId, calibration: c } of rows) {
  const ok =
    c.stabilityWeight >= 0.35 &&
    c.dimensions.rankingStabilityCalibration >= 50 &&
    c.analytics.diversityPreservationMetrics >= 40 &&
    c.dimensions.merchantDiversityCalibration >= 45 &&
    !c.monitoring.unstableCalibration;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, {
      stability: c.dimensions.rankingStabilityCalibration,
      diversity: c.dimensions.merchantDiversityCalibration,
      monitoring: c.monitoring,
    });
  } else {
    console.log(
      `OK ${trayId} stability=${c.dimensions.rankingStabilityCalibration} diversity=${c.dimensions.merchantDiversityCalibration}`
    );
  }
}

process.env.INTENT_CALIBRATION = "false";
const { buildIntentCalibrationMeta } = await import("../lib/intent/intentCalibrationEngine.ts");
const off = buildIntentCalibrationMeta({
  evaluation: rows[0].evaluation,
  governance: rows[0].governance,
  observability: rows[0].row.observability,
  intentApply: rows[0].row.intentApply,
  productionApply: rows[0].row.intentProductionApply,
  products: rows[0].row.products,
  rankingStable: rows[0].row.rankingStable,
});
delete process.env.INTENT_CALIBRATION;
if (off.rollbackCalibrationReason !== "calibration_disabled") {
  failed += 1;
  console.error("FAIL INTENT_CALIBRATION=false", off.rollbackCalibrationReason);
} else {
  console.log("OK INTENT_CALIBRATION=false disables meta");
}

saveLiveObservabilityRun({ suite: "intent-calibration-stability", phase: "P4.9", pass: failed === 0 }, "intent-calibration-stability");

if (failed) process.exit(1);
console.log("\nIntent calibration stability passed");
