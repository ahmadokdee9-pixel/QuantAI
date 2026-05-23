/**
 * P6.8 — Unified cognitive governance integrity validation.
 */
import {
  isUnifiedCognitiveGovernanceEnabled,
  isUnifiedCognitiveGovernanceMutationEnabled,
} from "../lib/cognitiveGovernance/cognitiveGovernanceIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV, runCognitiveGovernancePartitions } from "./lib/cognitiveGovernanceRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, unifiedCognitiveGovernance: m } of runCognitiveGovernancePartitions(UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV)) {
  const ok = typeof m.governanceDelta === "number" && typeof m.monitoring?.replayIntegrityValid === "boolean";
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, m);
  } else {
    console.log(`OK ${trayId} delta=${m.governanceDelta}`);
  }
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.COGNITIVE_GOVERNANCE_ENABLED = "true";
process.env.COGNITIVE_GOVERNANCE_MODE = "bounded-governance";
delete process.env.COGNITIVE_GOVERNANCE_PROD_APPLY;
delete process.env.COGNITIVE_GOVERNANCE_CANARY_APPLY;
const prodBlocked = isUnifiedCognitiveGovernanceEnabled() && !isUnifiedCognitiveGovernanceMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production blocked without opt-in");
} else {
  console.log("OK production blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "cognitive-governance-integrity", phase: "P6.8", pass: failed === 0 }, "cognitive-governance-integrity");
if (failed) process.exit(1);
console.log("\nUnified cognitive governance integrity passed");
