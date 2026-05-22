/**
 * P6.3 — Adaptive strategic ranking confidence validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV, runStrategicRankingPartitions } from "./lib/strategicRankingRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, adaptiveStrategicRanking: s } of runStrategicRankingPartitions(ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV)) {
  const ok = s.strategicRankingConfidence >= 0.3 && s.strategicRankingConfidence <= 1 && !s.monitoring.inflationRisk;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} confidence=${s.strategicRankingConfidence}`);
  } else {
    console.log(`OK ${trayId} confidence=${s.strategicRankingConfidence}`);
  }
}

saveLiveObservabilityRun({ suite: "adaptive-strategic-ranking-confidence", phase: "P6.3", pass: failed === 0 }, "adaptive-strategic-ranking-confidence");
if (failed) process.exit(1);
console.log("\nAdaptive strategic ranking confidence passed");
