/**
 * P6.7 — Autonomous commerce reasoning graph audit.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COMMERCE_REASONING_GRAPH_MAX_DELTA } from "../lib/commerceReasoningGraph/commerceReasoningGraphFlags.ts";
import { AUTONOMOUS_COMMERCE_REASONING_GRAPH_PROFILES } from "../lib/commerceReasoningGraph/commerceReasoningGraphProfiles.ts";
import {
  isAutonomousCommerceReasoningGraphEnabled,
  isAutonomousCommerceReasoningGraphMutationEnabled,
} from "../lib/commerceReasoningGraph/commerceReasoningGraphIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import {
  AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV,
  AUTONOMOUS_COMMERCE_REASONING_GRAPH_TELEMETRY_ENV,
  runCommerceReasoningGraphPartitions,
} from "./lib/commerceReasoningGraphRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, autonomousCommerceReasoningGraph: m } of runCommerceReasoningGraphPartitions(AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV)) {
  const ok =
    m.version === "autonomous-commerce-reasoning-graph-v1" &&
    m.graphDelta <= COMMERCE_REASONING_GRAPH_MAX_DELTA &&
    m.graphScore >= 30 &&
    typeof m.mutationApplied === "boolean" &&
    typeof m.reasoningSnapshotHash === "string";
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, m);
  } else {
    console.log(`OK ${trayId} score=${m.graphScore} delta=${m.graphDelta} mutation=${m.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("autonomousCommerceReasoningGraph") || !route.includes("applyControlledAutonomousCommerceReasoningGraph")) {
  failed += 1;
  console.error("FAIL meta.autonomousCommerceReasoningGraph not wired");
} else {
  console.log("OK meta.autonomousCommerceReasoningGraph wired");
}

if (AUTONOMOUS_COMMERCE_REASONING_GRAPH_PROFILES.length !== 6) {
  failed += 1;
  console.error("FAIL reasoning graph profiles count");
} else {
  console.log(`OK reasoning graph profiles: ${AUTONOMOUS_COMMERCE_REASONING_GRAPH_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.AUTONOMOUS_COMMERCE_REASONING_GRAPH_ENABLED = "true";
process.env.AUTONOMOUS_COMMERCE_REASONING_GRAPH_MODE = "telemetry-only";
delete process.env.AUTONOMOUS_COMMERCE_REASONING_GRAPH_PROD_APPLY;
delete process.env.AUTONOMOUS_COMMERCE_REASONING_GRAPH_CANARY_APPLY;
const prodBlocked = isAutonomousCommerceReasoningGraphEnabled() && !isAutonomousCommerceReasoningGraphMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production reasoning graph mutation blocked");
} else {
  console.log("OK production reasoning graph OFF by default");
}

clearIntentMemoryStore();
if (runCommerceReasoningGraphPartitions(AUTONOMOUS_COMMERCE_REASONING_GRAPH_TELEMETRY_ENV).some((r) => r.autonomousCommerceReasoningGraph.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mutated");
} else {
  console.log("OK telemetry-only does not mutate");
}

if (/userProfile|personalizationMemory|autonomousAgent|embeddingReasoningGraph/.test(route)) {
  failed += 1;
  console.error("FAIL personalization/autonomous agent patterns in search route");
} else {
  console.log("OK no personalization or autonomous agents in route");
}

saveLiveObservabilityRun({ suite: "autonomous-commerce-reasoning-graph-audit", phase: "P6.7", pass: failed === 0 }, "autonomous-commerce-reasoning-graph-audit");
if (failed) process.exit(1);
console.log("\nAutonomous commerce reasoning graph audit passed");
