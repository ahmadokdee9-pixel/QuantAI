/**
 * P5.0 — Runtime stability monitors and emergency shutdown.
 * Usage: npm run test:intent-runtime-stability
 */
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { RUNTIME_BOUNDED_ENV, runRuntimePartitions } from "./lib/intentRuntimeRunner.mjs";

let failed = 0;
const rows = runRuntimePartitions(RUNTIME_BOUNDED_ENV);

for (const { trayId, runtime: r } of rows) {
  const ok =
    r.analytics.stabilityScoring >= 50 &&
    r.monitoring.deterministicReplayReady &&
    !r.monitoring.runtimeInstability;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { stability: r.analytics.stabilityScoring, monitoring: r.monitoring });
  } else {
    console.log(`OK ${trayId} stability=${r.analytics.stabilityScoring}`);
  }
}

process.env.INTENT_RUNTIME_EMERGENCY_SHUTDOWN = "true";
process.env.INTENT_RUNTIME_ENABLED = "true";
process.env.INTENT_RUNTIME_MODE = "bounded-apply";
const { applyControlledIntentRuntime } = await import("../lib/intent/intentRuntimeController.ts");
const sample = rows[0];
const shutdown = applyControlledIntentRuntime({
  products: sample.row.products,
  query: sample.row.query,
  canonicalQuery: (await import("../lib/search/canonicalQuery.ts")).buildCanonicalQuery(sample.row.query),
  intentIntelligence: sample.row.intent,
  intentApply: sample.row.intentApply,
  intentProductionApply: sample.row.intentProductionApply,
  intentObservability: sample.row.observability,
  intentCanary: sample.row.canary,
  intentEvaluation: sample.row.evaluation,
  intentOptimization: sample.row.optimization,
  intentGovernance: sample.row.governance,
  intentCalibration: sample.row.calibration,
  preOrderLinks: sample.row.products.map((p) => p.link || p.title),
  rankingStable: sample.row.rankingStable,
});
delete process.env.INTENT_RUNTIME_EMERGENCY_SHUTDOWN;

if (!shutdown.meta.emergencyShutdown || shutdown.meta.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown", shutdown.meta);
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "intent-runtime-stability", phase: "P5.0", pass: failed === 0 }, "intent-runtime-stability");

if (failed) process.exit(1);
console.log("\nIntent runtime stability passed");
