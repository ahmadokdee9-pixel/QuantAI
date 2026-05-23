/**
 * P6.8 — Unified cognitive governance balance validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV, runCognitiveGovernancePartitions } from "./lib/cognitiveGovernanceRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, unifiedCognitiveGovernance: m } of runCognitiveGovernancePartitions(UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV)) {
  const ok =
    typeof m.governanceContinuity === "number" &&
    typeof m.rankingEquilibriumProtection === "number" &&
    m.analytics?.harmonyAnalytics >= 50;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, m);
  } else {
    console.log(
      `OK ${trayId} continuity=${m.governanceContinuity} equilibrium=${m.rankingEquilibriumProtection} harmony=${m.analytics.harmonyAnalytics}`
    );
  }
}

saveLiveObservabilityRun({ suite: "cognitive-governance-balance", phase: "P6.8", pass: failed === 0 }, "cognitive-governance-balance");
if (failed) process.exit(1);
console.log("\nUnified cognitive governance balance passed");
