/**
 * P4.8 — Drift governance and bounded drift checks.
 * Usage: npm run test:intent-governance-drift
 */
import { INTENT_OBS_MAX_DRIFT } from "../lib/intent/intentObservabilityFlags.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { runGovernancePartitions } from "./lib/intentGovernanceRunner.mjs";

let failed = 0;
const rows = runGovernancePartitions();

for (const { trayId, governance: g, row } of rows) {
  const drift = row.observability?.driftCount ?? 0;
  const ok =
    drift <= INTENT_OBS_MAX_DRIFT &&
    g.dimensions.rankingIntegrityGovernance >= 50 &&
    (drift === 0 || g.monitoring.driftGovernance === true);

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { drift, driftGovernance: g.monitoring.driftGovernance, ranking: g.dimensions.rankingIntegrityGovernance });
  } else {
    console.log(`OK ${trayId} drift=${drift} driftGov=${g.monitoring.driftGovernance}`);
  }
}

const stable = rows.every((r) => r.row.rankingStable);
if (!stable) {
  failed += 1;
  console.error("FAIL ranking not stable across partitions");
} else {
  console.log("OK ranking stable across partitions");
}

saveLiveObservabilityRun({ suite: "intent-governance-drift", phase: "P4.8", pass: failed === 0 }, "intent-governance-drift");

if (failed) process.exit(1);
console.log("\nIntent governance drift passed");
