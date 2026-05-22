/**
 * P6.5 — Market reality intelligence stability validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV, runMarketRealityPartitions } from "./lib/marketRealityRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, marketRealityIntelligence: m } of runMarketRealityPartitions(MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV)) {
  const ok = m.realityScore >= 30 && m.realityConfidence >= 0.3;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} score=${m.realityScore}`);
  } else {
    console.log(`OK ${trayId} score=${m.realityScore} confidence=${m.realityConfidence}`);
  }
}

clearIntentMemoryStore();
const shutdownEnv = { ...MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV, MARKET_REALITY_INTELLIGENCE_EMERGENCY_SHUTDOWN: "true" };
if (runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], shutdownEnv).marketRealityIntelligence.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown blocks mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "market-reality-intelligence-stability", phase: "P6.5", pass: failed === 0 }, "market-reality-intelligence-stability");
if (failed) process.exit(1);
console.log("\nMarket reality intelligence stability passed");
