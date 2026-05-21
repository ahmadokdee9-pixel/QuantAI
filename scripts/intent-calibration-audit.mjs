/**
 * P4.9 — Full calibration audit (telemetry, advisory-only, production apply off).
 * Usage: npm run test:intent-calibration-audit
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  aggregateIntentCalibration,
  isIntentCalibrationAutonomousBlocked,
} from "../lib/intent/intentCalibrationEngine.ts";
import { INTENT_CAL_MIN_CALIBRATION_SCORE, INTENT_CAL_WEIGHT_MIN, INTENT_CAL_WEIGHT_MAX } from "../lib/intent/intentCalibrationFlags.ts";
import { INTENT_CALIBRATION_PROFILES } from "../lib/intent/intentCalibrationProfiles.ts";
import {
  isIntentApplyBlockedInProduction,
  isIntentIntelligenceApplyEnabled,
} from "../lib/intent/intentIntelligenceFlags.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { runCalibrationPartitions } from "./lib/intentCalibrationRunner.mjs";

let failed = 0;
const rows = runCalibrationPartitions();
const calRows = rows.map((r) => ({ trayId: r.trayId, calibration: r.calibration }));

for (const { trayId, calibration: c } of calRows) {
  const weights = [
    c.confidenceWeight,
    c.suppressionWeight,
    c.trustWeight,
    c.comparisonWeight,
    c.diversityWeight,
    c.driftWeight,
    c.stabilityWeight,
  ];
  const dims = Object.values(c.dimensions);
  const ok =
    c.version === "intent-calibration-v1" &&
    c.advisoryOnly === true &&
    c.autonomousBlocked === true &&
    c.active &&
    c.calibrationScore >= INTENT_CAL_MIN_CALIBRATION_SCORE &&
    dims.every((v) => v >= 40 && v <= 100) &&
    weights.every((w) => w >= INTENT_CAL_WEIGHT_MIN && w <= INTENT_CAL_WEIGHT_MAX) &&
    c.analytics.calibrationEffectiveness >= 40;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, c);
  } else {
    console.log(`OK ${trayId} score=${c.calibrationScore} profile=${c.profileId}`);
  }
}

const run1 = calRows[0].calibration;
const run2 = runCalibrationPartitions()[0].calibration;
if (JSON.stringify(run1) !== JSON.stringify(run2)) {
  failed += 1;
  console.error("FAIL calibration not deterministic");
} else {
  console.log("OK calibration deterministic");
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("intentCalibration") || !route.includes("buildIntentCalibrationMeta")) {
  failed += 1;
  console.error("FAIL meta.intentCalibration not wired");
} else {
  console.log("OK meta.intentCalibration wired");
}

if (INTENT_CALIBRATION_PROFILES.length < 3) {
  failed += 1;
  console.error("FAIL calibration profiles");
} else {
  console.log(`OK calibration profiles: ${INTENT_CALIBRATION_PROFILES.length}`);
}

const savedProd = process.env.NODE_ENV;
const savedApply = process.env.INTENT_INTELLIGENCE_APPLY_ENABLED;
process.env.NODE_ENV = "production";
process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
delete process.env.INTENT_INTELLIGENCE_PROD_APPLY;
delete process.env.INTENT_INTELLIGENCE_CANARY_APPLY;
const applyOff = !isIntentIntelligenceApplyEnabled() && isIntentApplyBlockedInProduction();
if (savedProd === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = savedProd;
if (savedApply === undefined) delete process.env.INTENT_INTELLIGENCE_APPLY_ENABLED;
else process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = savedApply;

if (!applyOff || !isIntentCalibrationAutonomousBlocked()) {
  failed += 1;
  console.error("FAIL production safety");
} else {
  console.log("OK production apply OFF; calibration autonomous blocked");
}

const agg = aggregateIntentCalibration(calRows);
console.log("\n--- P4.9 AGGREGATE ---");
console.log(JSON.stringify(agg, null, 2));

saveLiveObservabilityRun({ suite: "intent-calibration-audit", phase: "P4.9", pass: failed === 0, aggregate: agg }, "intent-calibration-audit");

if (failed) process.exit(1);
console.log("\nIntent calibration audit passed");
