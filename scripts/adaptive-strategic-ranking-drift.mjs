/**
 * P6.3 — Adaptive strategic ranking drift validation.
 */
import { STRATEGIC_RANKING_MAX_DELTA, STRATEGIC_RANKING_MAX_DRIFT } from "../lib/strategicRanking/strategicRankingFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV, runStrategicRankingPartitions } from "./lib/strategicRankingRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, adaptiveStrategicRanking: s } of runStrategicRankingPartitions(ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV)) {
  const pass = s.strategicRankingDelta <= STRATEGIC_RANKING_MAX_DELTA && s.analytics.topDriftCount <= STRATEGIC_RANKING_MAX_DRIFT;
  if (!pass) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: s.strategicRankingDelta, topDrift: s.analytics.topDriftCount });
  } else {
    console.log(`OK ${trayId} delta=${s.strategicRankingDelta} topDrift=${s.analytics.topDriftCount}`);
  }
}

saveLiveObservabilityRun({ suite: "adaptive-strategic-ranking-drift", phase: "P6.3", pass: failed === 0 }, "adaptive-strategic-ranking-drift");
if (failed) process.exit(1);
console.log("\nAdaptive strategic ranking drift passed");
