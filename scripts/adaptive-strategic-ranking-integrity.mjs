/**
 * P6.3 — Adaptive strategic ranking integrity validation.
 */
import {
  isAdaptiveStrategicRankingEnabled,
  isAdaptiveStrategicRankingEnvironmentAllowed,
  isAdaptiveStrategicRankingMutationEnabled,
} from "../lib/strategicRanking/strategicRankingIntelligence.ts";
import { STRATEGIC_RANKING_MAX_DELTA } from "../lib/strategicRanking/strategicRankingFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV, runStrategicRankingPartitions } from "./lib/strategicRankingRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, adaptiveStrategicRanking: s } of runStrategicRankingPartitions(ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV)) {
  const ok = s.strategicRankingDelta <= STRATEGIC_RANKING_MAX_DELTA && s.monitoring.crossBalanceValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: s.strategicRankingDelta });
  } else {
    console.log(`OK ${trayId} delta=${s.strategicRankingDelta}`);
  }
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.ADAPTIVE_STRATEGIC_RANKING_ENABLED = "true";
process.env.ADAPTIVE_STRATEGIC_RANKING_MODE = "bounded-strategic";
delete process.env.ADAPTIVE_STRATEGIC_RANKING_PROD_APPLY;
delete process.env.ADAPTIVE_STRATEGIC_RANKING_CANARY_APPLY;
const blocked = isAdaptiveStrategicRankingEnabled() && !isAdaptiveStrategicRankingMutationEnabled() && !isAdaptiveStrategicRankingEnvironmentAllowed();
Object.assign(process.env, saved);
if (!blocked) {
  failed += 1;
  console.error("FAIL production blocked without opt-in");
} else {
  console.log("OK production blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "adaptive-strategic-ranking-integrity", phase: "P6.3", pass: failed === 0 }, "adaptive-strategic-ranking-integrity");
if (failed) process.exit(1);
console.log("\nAdaptive strategic ranking integrity passed");
