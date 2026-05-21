/**
 * P4.9 — Calibration runner entry.
 */
import { runCalibrationPartitions } from "./lib/intentCalibrationRunner.mjs";

const rows = runCalibrationPartitions();
console.log(
  JSON.stringify(
    rows.map((r) => ({
      trayId: r.trayId,
      calibrationScore: r.calibration.calibrationScore,
      profileId: r.calibration.profileId,
      weights: {
        confidence: r.calibration.confidenceWeight,
        trust: r.calibration.trustWeight,
        drift: r.calibration.driftWeight,
      },
    })),
    null,
    2
  )
);
