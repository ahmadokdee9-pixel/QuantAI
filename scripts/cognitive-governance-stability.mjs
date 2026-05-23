/**
 * P6.8 — Unified cognitive governance stability validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV, runCognitiveGovernancePartitions } from "./lib/cognitiveGovernanceRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, unifiedCognitiveGovernance: m } of runCognitiveGovernancePartitions(UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV)) {
  const ok = m.governanceScore >= 30 && m.governanceConfidence >= 0.3;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} score=${m.governanceScore}`);
  } else {
    console.log(`OK ${trayId} score=${m.governanceScore} confidence=${m.governanceConfidence}`);
  }
}

clearIntentMemoryStore();
const shutdownEnv = { ...UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV, COGNITIVE_GOVERNANCE_EMERGENCY_SHUTDOWN: "true" };
if (runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], shutdownEnv).unifiedCognitiveGovernance.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown blocks mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "cognitive-governance-stability", phase: "P6.8", pass: failed === 0 }, "cognitive-governance-stability");
if (failed) process.exit(1);
console.log("\nUnified cognitive governance stability passed");
