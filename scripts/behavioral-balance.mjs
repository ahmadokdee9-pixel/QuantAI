/**
 * P5.9 — Behavioral balancing (readiness/trust, continuity).
 * Usage: npm run test:behavioral-balance
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { BEHAVIORAL_BOUNDED_ENV, runBehavioralPartitions } from "./lib/behavioralRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runBehavioralPartitions(BEHAVIORAL_BOUNDED_ENV);

for (const { trayId, behavioralCommerce: b } of rows) {
  const ok =
    b.analytics.readinessAnalytics >= 1 &&
    b.analytics.trustMomentumAnalytics >= 0 &&
    b.analytics.topDriftCount <= 1 &&
    b.monitoring.rankingContinuityValid;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, {
      readiness: b.analytics.readinessAnalytics,
      trust: b.analytics.trustMomentumAnalytics,
    });
  } else {
    console.log(`OK ${trayId} readiness=${b.analytics.readinessAnalytics} trust=${b.analytics.trustMomentumAnalytics}`);
  }
}

saveLiveObservabilityRun({ suite: "behavioral-balance", phase: "P5.9", pass: failed === 0 }, "behavioral-balance");

if (failed) process.exit(1);
console.log("\nBehavioral commerce balance passed");
