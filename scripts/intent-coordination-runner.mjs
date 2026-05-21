/**
 * P5.3 — Coordination runner summary.
 * Usage: npx tsx scripts/intent-coordination-runner.mjs
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { COORDINATION_BOUNDED_ENV, runCoordinationPartitions } from "./lib/intentCoordinationRunner.mjs";

clearIntentMemoryStore();
const rows = runCoordinationPartitions(COORDINATION_BOUNDED_ENV);
console.log(JSON.stringify(rows.map((r) => ({
  trayId: r.trayId,
  score: r.coordination.coordinationScore,
  delta: r.coordination.coordinationDelta,
  lane: r.coordination.routingLane,
  graph: r.coordination.graphIntegrity,
  mutation: r.coordination.mutationApplied,
})), null, 2));
