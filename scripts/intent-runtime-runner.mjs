/**
 * P5.0 — Runtime runner entry.
 */
import { runRuntimePartitions } from "./lib/intentRuntimeRunner.mjs";

console.log(JSON.stringify(runRuntimePartitions().map((r) => ({
  trayId: r.trayId,
  profile: r.runtime.runtimeProfile,
  score: r.runtime.runtimeScore,
  mutation: r.runtime.mutationApplied,
})), null, 2));
