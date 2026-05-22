/**
 * P6.3 — Adaptive strategic ranking routing validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV, runStrategicRankingPartitions } from "./lib/strategicRankingRunner.mjs";

const VALID_LANES = new Set([
  "hold",
  "stabilize",
  "reinforce",
  "compare",
  "strategic-balance",
  "conversion-check",
  "trust-check",
  "inflation-check",
  "contradiction-check",
  "ranking-safe",
  "replay-protect",
]);

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, adaptiveStrategicRanking: s } of runStrategicRankingPartitions(ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV)) {
  const ok = VALID_LANES.has(s.routingLane) && s.analytics.replayIntegrityAnalytics >= 60 && s.monitoring.replayIntegrityValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} lane=${s.routingLane}`);
  } else {
    console.log(`OK ${trayId} lane=${s.routingLane} graph=${s.graphExecutionHash.slice(0, 20)}`);
  }
}

saveLiveObservabilityRun({ suite: "adaptive-strategic-ranking-routing", phase: "P6.3", pass: failed === 0 }, "adaptive-strategic-ranking-routing");
if (failed) process.exit(1);
console.log("\nAdaptive strategic ranking routing passed");
