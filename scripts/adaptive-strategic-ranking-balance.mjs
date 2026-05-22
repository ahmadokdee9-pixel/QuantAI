/**
 * P6.3 — Adaptive strategic ranking balance validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV, runStrategicRankingPartitions } from "./lib/strategicRankingRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, adaptiveStrategicRanking: s } of runStrategicRankingPartitions(ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV)) {
  const ok =
    s.trustValueBalance >= 0 &&
    s.conversionStabilityBalance >= 0 &&
    s.analytics.topDriftCount <= 1 &&
    s.monitoring.continuityValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { trustValue: s.trustValueBalance, continuity: s.rankingContinuity });
  } else {
    console.log(`OK ${trayId} trustValue=${s.trustValueBalance} conversionStability=${s.conversionStabilityBalance}`);
  }
}

saveLiveObservabilityRun({ suite: "adaptive-strategic-ranking-balance", phase: "P6.3", pass: failed === 0 }, "adaptive-strategic-ranking-balance");
if (failed) process.exit(1);
console.log("\nAdaptive strategic ranking balance passed");
