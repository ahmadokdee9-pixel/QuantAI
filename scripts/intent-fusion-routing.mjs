/**
 * P5.4 — Fusion routing lanes validation.
 * Usage: npm run test:intent-fusion-routing
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { FUSION_BOUNDED_ENV, runFusionPartitions } from "./lib/intentFusionRunner.mjs";

const VALID_LANES = new Set([
  "hold",
  "stabilize",
  "reinforce",
  "recover",
  "balance",
  "suppress",
  "compare",
  "confidence-check",
]);

clearIntentMemoryStore();
let failed = 0;
const rows = runFusionPartitions(FUSION_BOUNDED_ENV);

for (const { trayId, fusion: f } of rows) {
  const ok = VALID_LANES.has(f.routingLane) && f.replayIntegrity >= 60 && f.monitoring.replayIntegrityValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} lane=${f.routingLane} replay=${f.replayIntegrity}`);
  } else {
    console.log(`OK ${trayId} lane=${f.routingLane} replay=${f.replayIntegrity} continuity=${f.rankingContinuity}`);
  }
}

saveLiveObservabilityRun({ suite: "intent-fusion-routing", phase: "P5.4", pass: failed === 0 }, "intent-fusion-routing");

if (failed) process.exit(1);
console.log("\nIntent fusion routing passed");
