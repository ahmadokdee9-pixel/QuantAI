/**
 * P5.3 — Coordination routing lanes + decomposition stability.
 * Usage: npm run test:intent-coordination-routing
 */
import { decomposeShoppingQuery, validateDeterministicDecomposition } from "../lib/intent/intentCoordination.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COORDINATION_BOUNDED_ENV, runCoordinationPartitions } from "./lib/intentCoordinationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runCoordinationPartitions(COORDINATION_BOUNDED_ENV);

const validLanes = new Set(["hold", "primary", "secondary", "conflict", "reinforce", "stabilize"]);

for (const { trayId, coordination: c } of rows) {
  const part = INTENT_LIVE_PARTITIONS.find((p) => p.id === trayId);
  if (!part) continue;
  const canonical = buildCanonicalQuery(part.query);
  const d1 = decomposeShoppingQuery({ query: part.query, canonicalQuery: canonical });
  const d2 = decomposeShoppingQuery({ query: part.query, canonicalQuery: canonical });

  const ok =
    validLanes.has(c.routingLane) &&
    c.decompositionScore >= 30 &&
    validateDeterministicDecomposition(d1, d2) &&
    c.decompositionReplayHash === d1.replayHash &&
    c.monitoring.decompositionValid;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} lane=${c.routingLane} decomp=${c.decompositionScore}`);
  } else {
    console.log(`OK ${trayId} lane=${c.routingLane} decomp=${c.decompositionScore} partitions=${d1.expansionCount}`);
  }
}

saveLiveObservabilityRun({ suite: "intent-coordination-routing", phase: "P5.3", pass: failed === 0 }, "intent-coordination-routing");

if (failed) process.exit(1);
console.log("\nIntent coordination routing passed");
