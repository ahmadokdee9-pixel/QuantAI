/**
 * P6.8 — Unified cognitive governance routing validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV, runCognitiveGovernancePartitions } from "./lib/cognitiveGovernanceRunner.mjs";

const VALID_LANES = new Set([
  "hold",
  "stabilize",
  "reinforce",
  "compare",
  "governance-check",
  "equilibrium-check",
  "confidence-check",
  "causality-check",
  "contradiction-check",
  "replay-protect",
  "ranking-safe",
  "system-safe",
  "rollback-safe",
]);

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, unifiedCognitiveGovernance: m } of runCognitiveGovernancePartitions(UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV)) {
  const ok = VALID_LANES.has(m.routingLane) && typeof m.governanceExecutionHash === "string";
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} lane=${m.routingLane}`);
  } else {
    console.log(`OK ${trayId} lane=${m.routingLane} gov=${m.governanceExecutionHash.slice(0, 30)}`);
  }
}

saveLiveObservabilityRun({ suite: "cognitive-governance-routing", phase: "P6.8", pass: failed === 0 }, "cognitive-governance-routing");
if (failed) process.exit(1);
console.log("\nUnified cognitive governance routing passed");
