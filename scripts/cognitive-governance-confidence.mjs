/**
 * P6.8 — Unified cognitive governance confidence validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV, runCognitiveGovernancePartitions } from "./lib/cognitiveGovernanceRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, unifiedCognitiveGovernance: m } of runCognitiveGovernancePartitions(UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV)) {
  const ok = m.governanceConfidence >= 0.3;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} confidence=${m.governanceConfidence}`);
  } else {
    console.log(`OK ${trayId} confidence=${m.governanceConfidence}`);
  }
}

saveLiveObservabilityRun({ suite: "cognitive-governance-confidence", phase: "P6.8", pass: failed === 0 }, "cognitive-governance-confidence");
if (failed) process.exit(1);
console.log("\nUnified cognitive governance confidence passed");
