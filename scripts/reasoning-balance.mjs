/**
 * P5.5 — Reasoning balancing (trust/value, continuity, recommendation).
 * Usage: npm run test:reasoning-balance
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { REASONING_BOUNDED_ENV, runReasoningPartitions } from "./lib/reasoningRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runReasoningPartitions(REASONING_BOUNDED_ENV);

for (const { trayId, adaptiveReasoning: r } of rows) {
  const ok =
    r.analytics.trustValueAnalytics >= 1 &&
    r.analytics.rankingContinuityAnalytics >= 0 &&
    r.monitoring.continuityValid &&
    r.monitoring.recommendationStability;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, {
      trustValue: r.analytics.trustValueAnalytics,
      continuity: r.analytics.rankingContinuityAnalytics,
    });
  } else {
    console.log(`OK ${trayId} trustValue=${r.analytics.trustValueAnalytics} continuity=${r.continuityStrength}`);
  }
}

saveLiveObservabilityRun({ suite: "reasoning-balance", phase: "P5.5", pass: failed === 0 }, "reasoning-balance");

if (failed) process.exit(1);
console.log("\nAdaptive reasoning balance passed");
