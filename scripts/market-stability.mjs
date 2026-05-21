/**
 * P5.8 — Market stability + emergency shutdown.
 * Usage: npm run test:market-stability
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MARKET_BOUNDED_ENV, runMarketPartitions } from "./lib/marketRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runMarketPartitions(MARKET_BOUNDED_ENV);

for (const { trayId, marketIntelligence: m } of rows) {
  const ok = m.marketScore >= 30 && m.marketConfidence >= 0.3;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} score=${m.marketScore} confidence=${m.marketConfidence}`);
  } else {
    console.log(`OK ${trayId} score=${m.marketScore} confidence=${m.marketConfidence}`);
  }
}

clearIntentMemoryStore();
const shutdownEnv = { ...MARKET_BOUNDED_ENV, MARKET_INTELLIGENCE_EMERGENCY_SHUTDOWN: "true" };
const shutdownRow = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], shutdownEnv);
if (shutdownRow.marketIntelligence.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown blocks mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "market-stability", phase: "P5.8", pass: failed === 0 }, "market-stability");

if (failed) process.exit(1);
console.log("\nMarket intelligence stability passed");
