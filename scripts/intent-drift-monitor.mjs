/**
 * P4.4 — Continuous drift monitor (OFF vs ON ranking positions).
 * Usage: npm run test:intent-drift-monitor
 */
import {
  INTENT_LIVE_PARTITIONS,
  observeIntentPartition,
} from "./lib/intentLiveObservabilityPartitions.mjs";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { INTENT_OBS_MAX_DRIFT } from "../lib/intent/intentObservabilityFlags.ts";

const ENV = {
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
const results = [];

for (const part of INTENT_LIVE_PARTITIONS) {
  const row = observeIntentPartition(part, ENV);
  const ok = row.drift <= INTENT_OBS_MAX_DRIFT && row.observability.driftCount <= INTENT_OBS_MAX_DRIFT;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${part.id} drift=${row.drift} metaDrift=${row.observability.driftCount}`, {
      off: row.offLinks,
      on: row.onLinks,
    });
  } else {
    console.log(`OK ${part.id} drift=${row.drift} metaDrift=${row.observability.driftCount}`);
  }
  results.push({
    id: part.id,
    pass: ok,
    drift: row.drift,
    driftCount: row.observability.driftCount,
    offLinks: row.offLinks,
    onLinks: row.onLinks,
  });
}

const report = {
  suite: "intent-drift-monitor",
  phase: "P4.4",
  at: new Date().toISOString(),
  max_drift: Math.max(0, ...results.map((r) => r.drift)),
  avg_drift: results.length
    ? Math.round((results.reduce((s, r) => s + r.drift, 0) / results.length) * 10) / 10
    : 0,
  pass_rate_pct: Math.round((results.filter((r) => r.pass).length / results.length) * 100),
  threshold: INTENT_OBS_MAX_DRIFT,
  results,
  recommendation: failed === 0 ? "drift_within_bounds" : "drift_exceeded_hold_rollout",
};

saveLiveObservabilityRun(report, "intent-drift-monitor");

if (failed) process.exit(1);
console.log("\nIntent drift monitor passed");
