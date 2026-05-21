/**
 * P4.4 — Live production intelligence audit (canary simulation + telemetry aggregation).
 * Usage: npm run test:intent-live-audit
 */
import {
  INTENT_LIVE_PARTITIONS,
  aggregateObservabilityMetrics,
  checkLiveObservabilityMetrics,
  observeIntentPartition,
} from "./lib/intentLiveObservabilityPartitions.mjs";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { INTENT_OBS_MAX_DRIFT } from "../lib/intent/intentObservabilityFlags.ts";

const CANARY_ENV = {
  NODE_ENV: "production",
  INTENT_INTELLIGENCE_APPLY_ENABLED: "true",
  INTENT_INTELLIGENCE_CANARY_APPLY: "true",
  INTENT_CANARY_ROLLOUT_STAGE: "100",
  TASTE_UNIFIED_APPLY_ENABLED: "false",
  TASTE_GRAMMAR_ENABLED: "false",
  TASTE_FRAGRANCE_GRAMMAR_ENABLED: "false",
  TASTE_FURNITURE_GRAMMAR_ENABLED: "false",
};

let failed = 0;
const rows = [];

for (const part of INTENT_LIVE_PARTITIONS) {
  const row = observeIntentPartition(part, CANARY_ENV);
  const monitor = checkLiveObservabilityMetrics(row);
  if (!monitor.pass) {
    failed += 1;
    console.error(`FAIL ${part.id}`, monitor.issues, row.observability);
  } else {
    console.log(
      `OK ${part.id} conf=${row.intent.confidence.toFixed(2)} drift=${row.drift} delta=${row.observability.avgDelta} warnings=${row.observability.instabilityWarnings.length}`
    );
  }
  rows.push({ ...row, monitor });
}

const aggregate = aggregateObservabilityMetrics(rows);
const maxDrift = Math.max(0, ...rows.map((r) => r.drift));
const integrityPass = rows.every((r) => r.observability.integrityPass);
const telemetryStable = rows.every((r) => r.observability.version === "intent-observability-v1");

if (maxDrift > INTENT_OBS_MAX_DRIFT) {
  failed += 1;
  console.error("FAIL max drift exceeded", maxDrift);
}
if (!integrityPass) {
  failed += 1;
  console.error("FAIL integrity pass not universal");
}
if (!telemetryStable) {
  failed += 1;
  console.error("FAIL telemetry version mismatch");
}

const report = {
  suite: "intent-live-audit",
  phase: "P4.4",
  at: new Date().toISOString(),
  rolloutMode: "canary",
  pass_rate_pct: Math.round((rows.filter((r) => r.monitor.pass).length / rows.length) * 100),
  max_drift: maxDrift,
  integrity_pass_pct: Math.round((rows.filter((r) => r.observability.integrityPass).length / rows.length) * 100),
  aggregate,
  rows: rows.map((r) => ({
    id: r.id,
    drift: r.drift,
    observability: r.observability,
    monitor: r.monitor,
  })),
  recommendation: failed === 0 ? "live_observability_operational" : "investigate_live_audit_failures",
};

saveLiveObservabilityRun(report, "intent-live-audit");

console.log("\n--- P4.4 LIVE AUDIT SUMMARY ---");
console.log(JSON.stringify({
  pass: failed === 0,
  pass_rate_pct: report.pass_rate_pct,
  aggregate,
  recommendation: report.recommendation,
}, null, 2));

if (failed) process.exit(1);
console.log("\nIntent live audit passed");
