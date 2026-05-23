/**
 * P6.8 — Unified cognitive governance drift validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV, runCognitiveGovernancePartitions } from "./lib/cognitiveGovernanceRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, unifiedCognitiveGovernance: m } of runCognitiveGovernancePartitions(UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV)) {
  const topDrift = m.analytics?.topDriftCount ?? 0;
  const ok = typeof m.governanceDelta === "number" && topDrift <= 5;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} delta=${m.governanceDelta} topDrift=${topDrift}`);
  } else {
    console.log(`OK ${trayId} delta=${m.governanceDelta} topDrift=${topDrift}`);
  }
}

saveLiveObservabilityRun({ suite: "cognitive-governance-drift", phase: "P6.8", pass: failed === 0 }, "cognitive-governance-drift");
if (failed) process.exit(1);
console.log("\nUnified cognitive governance drift passed");
