/**
 * P6.8 — Unified cognitive governance audit.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COGNITIVE_GOVERNANCE_MAX_DELTA } from "../lib/cognitiveGovernance/cognitiveGovernanceFlags.ts";
import { UNIFIED_COGNITIVE_GOVERNANCE_PROFILES } from "../lib/cognitiveGovernance/cognitiveGovernanceProfiles.ts";
import {
  isUnifiedCognitiveGovernanceEnabled,
  isUnifiedCognitiveGovernanceMutationEnabled,
} from "../lib/cognitiveGovernance/cognitiveGovernanceIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import {
  UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV,
  UNIFIED_COGNITIVE_GOVERNANCE_TELEMETRY_ENV,
  runCognitiveGovernancePartitions,
} from "./lib/cognitiveGovernanceRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, unifiedCognitiveGovernance: m } of runCognitiveGovernancePartitions(UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV)) {
  const ok =
    m.version === "unified-cognitive-governance-v1" &&
    m.governanceDelta <= COGNITIVE_GOVERNANCE_MAX_DELTA &&
    m.governanceScore >= 30 &&
    typeof m.mutationApplied === "boolean" &&
    typeof m.governanceSnapshotHash === "string";
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, m);
  } else {
    console.log(`OK ${trayId} score=${m.governanceScore} delta=${m.governanceDelta} mutation=${m.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("unifiedCognitiveGovernance") || !route.includes("applyControlledUnifiedCognitiveGovernance")) {
  failed += 1;
  console.error("FAIL meta.unifiedCognitiveGovernance not wired");
} else {
  console.log("OK meta.unifiedCognitiveGovernance wired");
}

if (UNIFIED_COGNITIVE_GOVERNANCE_PROFILES.length !== 6) {
  failed += 1;
  console.error("FAIL cognitive governance profiles count");
} else {
  console.log(`OK cognitive governance profiles: ${UNIFIED_COGNITIVE_GOVERNANCE_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.COGNITIVE_GOVERNANCE_ENABLED = "true";
process.env.COGNITIVE_GOVERNANCE_MODE = "telemetry-only";
delete process.env.COGNITIVE_GOVERNANCE_PROD_APPLY;
delete process.env.COGNITIVE_GOVERNANCE_CANARY_APPLY;
const prodBlocked = isUnifiedCognitiveGovernanceEnabled() && !isUnifiedCognitiveGovernanceMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production cognitive governance mutation blocked");
} else {
  console.log("OK production cognitive governance OFF by default");
}

clearIntentMemoryStore();
if (runCognitiveGovernancePartitions(UNIFIED_COGNITIVE_GOVERNANCE_TELEMETRY_ENV).some((r) => r.unifiedCognitiveGovernance.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mutated");
} else {
  console.log("OK telemetry-only does not mutate");
}

if (/userProfile|personalizationMemory|autonomousAgent|embeddingGovernance|memoryStorage/.test(route)) {
  failed += 1;
  console.error("FAIL personalization/autonomous agent/memory patterns in search route");
} else {
  console.log("OK no personalization, memory storage, or autonomous agents in route");
}

saveLiveObservabilityRun({ suite: "cognitive-governance-audit", phase: "P6.8", pass: failed === 0 }, "cognitive-governance-audit");
if (failed) process.exit(1);
console.log("\nUnified cognitive governance audit passed");
