/**
 * P6.3 — Adaptive strategic ranking stability validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV, runStrategicRankingPartitions } from "./lib/strategicRankingRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, adaptiveStrategicRanking: s } of runStrategicRankingPartitions(ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV)) {
  const ok = s.strategicRankingScore >= 30 && s.strategicRankingConfidence >= 0.3;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} score=${s.strategicRankingScore}`);
  } else {
    console.log(`OK ${trayId} score=${s.strategicRankingScore} confidence=${s.strategicRankingConfidence}`);
  }
}

clearIntentMemoryStore();
const shutdownEnv = { ...ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV, ADAPTIVE_STRATEGIC_RANKING_EMERGENCY_SHUTDOWN: "true" };
if (runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], shutdownEnv).adaptiveStrategicRanking.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown blocks mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "adaptive-strategic-ranking-stability", phase: "P6.3", pass: failed === 0 }, "adaptive-strategic-ranking-stability");
if (failed) process.exit(1);
console.log("\nAdaptive strategic ranking stability passed");
