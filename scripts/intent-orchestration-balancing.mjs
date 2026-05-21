/**
 * P5.1 — Adaptive balancing stability.
 * Usage: npm run test:intent-orchestration-balancing
 */
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { ORCHESTRATION_BOUNDED_ENV, runOrchestrationPartitions } from "./lib/intentOrchestrationRunner.mjs";

let failed = 0;
const rows = runOrchestrationPartitions(ORCHESTRATION_BOUNDED_ENV);

for (const { trayId, orchestration: o } of rows) {
  const pass =
    o.adaptiveBalanceScore >= 45 &&
    o.confidenceNormalization >= 0.35 &&
    o.analytics.balancingEffectiveness >= 45 &&
    o.analytics.signalConflictAnalysis >= 65;

  if (!pass) {
    failed += 1;
    console.error(`FAIL ${trayId}`, {
      adaptiveBalanceScore: o.adaptiveBalanceScore,
      balancingEffectiveness: o.analytics.balancingEffectiveness,
      conflicts: o.analytics.signalConflictAnalysis,
    });
  } else {
    console.log(`OK ${trayId} balance=${o.adaptiveBalanceScore} effectiveness=${o.analytics.balancingEffectiveness}`);
  }
}

saveLiveObservabilityRun({ suite: "intent-orchestration-balancing", phase: "P5.1", pass: failed === 0 }, "intent-orchestration-balancing");

if (failed) process.exit(1);
console.log("\nIntent orchestration balancing passed");
