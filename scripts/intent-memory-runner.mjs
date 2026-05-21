/**
 * P5.2 — Memory runner entry.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { runMemoryPartitions } from "./lib/intentMemoryRunner.mjs";

clearIntentMemoryStore();
console.log(JSON.stringify(runMemoryPartitions().map((r) => ({
  trayId: r.trayId,
  profile: r.memory.memoryProfile,
  score: r.memory.memoryScore,
  mutation: r.memory.mutationApplied,
})), null, 2));
