/**
 * P4.4 — Instability ceiling + rollback auto-warning validation.
 * Usage: npm run test:intent-instability-check
 */
import {
  INTENT_LIVE_PARTITIONS,
  aggregateObservabilityMetrics,
  observeIntentPartition,
} from "./lib/intentLiveObservabilityPartitions.mjs";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import {
  INTENT_OBS_INSTABILITY_CEILING,
} from "../lib/intent/intentObservabilityFlags.ts";
import {
  isIntentApplyHardRollback,
  isIntentIntelligenceApplyEnabled,
} from "../lib/intent/intentIntelligenceFlags.ts";

const saved = {
  NODE_ENV: process.env.NODE_ENV,
  INTENT_INTELLIGENCE_APPLY_ENABLED: process.env.INTENT_INTELLIGENCE_APPLY_ENABLED,
  INTENT_INTELLIGENCE_PROD_APPLY: process.env.INTENT_INTELLIGENCE_PROD_APPLY,
  INTENT_INTELLIGENCE_CANARY_APPLY: process.env.INTENT_INTELLIGENCE_CANARY_APPLY,
};

function restore() {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

let failed = 0;

try {
  const canaryRows = INTENT_LIVE_PARTITIONS.map((p) =>
    observeIntentPartition(p, {
      NODE_ENV: "production",
      INTENT_INTELLIGENCE_APPLY_ENABLED: "true",
      INTENT_INTELLIGENCE_CANARY_APPLY: "true",
      TASTE_UNIFIED_APPLY_ENABLED: "false",
    })
  );

  for (const row of canaryRows) {
    if (row.observability.instabilityWarnings.length > INTENT_OBS_INSTABILITY_CEILING) {
      failed += 1;
      console.error(`FAIL ${row.id} instability ceiling`, row.observability.instabilityWarnings);
    } else if (row.observability.rollbackWarning) {
      failed += 1;
      console.error(`FAIL ${row.id} unexpected rollback warning in canary`, row.observability);
    } else {
      console.log(`OK canary ${row.id} warnings=${row.observability.instabilityWarnings.length}`);
    }
  }

  process.env.NODE_ENV = "production";
  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
  delete process.env.INTENT_INTELLIGENCE_PROD_APPLY;
  delete process.env.INTENT_INTELLIGENCE_CANARY_APPLY;

  const blockedRow = observeIntentPartition(INTENT_LIVE_PARTITIONS[0], {
    NODE_ENV: "production",
    INTENT_INTELLIGENCE_APPLY_ENABLED: "true",
    TASTE_UNIFIED_APPLY_ENABLED: "false",
  });

  if (!blockedRow.observability.rollbackWarning) {
    failed += 1;
    console.error("FAIL expected rollback warning when prod blocked");
  } else {
    console.log("OK rollback auto-warning when production blocked");
  }

  if (isIntentIntelligenceApplyEnabled()) {
    failed += 1;
    console.error("FAIL hidden activation — apply enabled without prod/canary flag");
  } else {
    console.log("OK no hidden activation path");
  }

  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "false";
  if (!isIntentApplyHardRollback() || isIntentIntelligenceApplyEnabled()) {
    failed += 1;
    console.error("FAIL hard rollback state");
  } else {
    console.log("OK hard rollback disables apply");
  }

  const rollbackRow = observeIntentPartition(INTENT_LIVE_PARTITIONS[0], {
    NODE_ENV: "production",
    INTENT_INTELLIGENCE_APPLY_ENABLED: "false",
    TASTE_UNIFIED_APPLY_ENABLED: "false",
  });

  if (rollbackRow.observability.rollbackWarning !== true) {
    failed += 1;
    console.error("FAIL rollback warning on hard rollback");
  } else {
    console.log("OK rollback warning on INTENT_INTELLIGENCE_APPLY_ENABLED=false");
  }

  const aggregate = aggregateObservabilityMetrics(canaryRows);
  const report = {
    suite: "intent-instability-check",
    phase: "P4.4",
    at: new Date().toISOString(),
    instability_ceiling: INTENT_OBS_INSTABILITY_CEILING,
    canary_warning_max: Math.max(0, ...canaryRows.map((r) => r.observability.instabilityWarnings.length)),
    rollback_warning_functional: !failed,
    aggregate,
    recommendation: failed === 0 ? "instability_monitors_operational" : "instability_threshold_breach",
  };

  saveLiveObservabilityRun(report, "intent-instability-check");

  console.log("\n--- P4.4 INSTABILITY SUMMARY ---");
  console.log(JSON.stringify({
    pass: failed === 0,
    canary_warning_max: report.canary_warning_max,
    aggregate,
  }, null, 2));
} finally {
  restore();
}

if (failed) process.exit(1);
console.log("\nIntent instability check passed");
