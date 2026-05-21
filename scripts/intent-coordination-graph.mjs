/**
 * P5.3 — Commerce reasoning graph integrity.
 * Usage: npm run test:intent-coordination-graph
 */
import { buildCommerceReasoningGraph, validateGraphExecutionReplay } from "../lib/intent/intentCoordination.ts";
import { resolveCoordinationProfile } from "../lib/intent/intentCoordinationProfiles.ts";
import { decomposeShoppingQuery } from "../lib/intent/intentQueryDecomposer.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COORDINATION_BOUNDED_ENV, runCoordinationPartitions } from "./lib/intentCoordinationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runCoordinationPartitions(COORDINATION_BOUNDED_ENV);

for (const { trayId, coordination: c, memory, orchestration } of rows) {
  const part = INTENT_LIVE_PARTITIONS.find((p) => p.id === trayId);
  if (!part) continue;
  const canonical = buildCanonicalQuery(part.query);
  const decomposition = decomposeShoppingQuery({ query: part.query, canonicalQuery: canonical });
  const profile = resolveCoordinationProfile("bounded-coordination");
  const graph1 = buildCommerceReasoningGraph({ decomposition, orchestration, memory, profile });
  const graph2 = buildCommerceReasoningGraph({ decomposition, orchestration, memory, profile });

  const ok =
    c.graphIntegrity >= 50 &&
    graph1.nodes.length > 0 &&
    validateGraphExecutionReplay(graph1, graph2) &&
    c.graphExecutionHash === graph1.executionHash;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} integrity=${c.graphIntegrity} nodes=${graph1.nodes.length}`);
  } else {
    console.log(`OK ${trayId} integrity=${c.graphIntegrity} nodes=${graph1.nodes.length} hash=${graph1.executionHash.slice(0, 24)}`);
  }
}

saveLiveObservabilityRun({ suite: "intent-coordination-graph", phase: "P5.3", pass: failed === 0 }, "intent-coordination-graph");

if (failed) process.exit(1);
console.log("\nIntent coordination graph passed");
