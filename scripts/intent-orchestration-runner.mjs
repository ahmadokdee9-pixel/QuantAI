/**
 * P5.1 — Orchestration runner entry.
 */
import { runOrchestrationPartitions } from "./lib/intentOrchestrationRunner.mjs";

console.log(JSON.stringify(runOrchestrationPartitions().map((r) => ({
  trayId: r.trayId,
  profile: r.orchestration.orchestrationProfile,
  score: r.orchestration.orchestrationScore,
  mutation: r.orchestration.mutationApplied,
})), null, 2));
