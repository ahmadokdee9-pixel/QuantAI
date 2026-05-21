/**
 * P5.2 — Memory audit (telemetry, production OFF, caps).
 * Usage: npm run test:intent-memory-audit
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { INTENT_MEMORY_MAX_DELTA } from "../lib/intent/intentMemoryFlags.ts";
import { INTENT_MEMORY_PROFILES } from "../lib/intent/intentMemoryProfiles.ts";
import {
  clearIntentMemoryStore,
  isIntentMemoryEnabled,
  isIntentMemoryMutationEnabled,
} from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MEMORY_BOUNDED_ENV, MEMORY_TELEMETRY_ENV, runMemoryPartitions } from "./lib/intentMemoryRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runMemoryPartitions(MEMORY_BOUNDED_ENV);

for (const { trayId, memory: m } of rows) {
  const ok =
    m.version === "intent-memory-v1" &&
    m.memoryDelta <= INTENT_MEMORY_MAX_DELTA &&
    m.memoryScore >= 40 &&
    typeof m.mutationApplied === "boolean";

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, m);
  } else {
    console.log(`OK ${trayId} score=${m.memoryScore} delta=${m.memoryDelta} mutation=${m.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("intentMemory") || !route.includes("applyControlledIntentMemory")) {
  failed += 1;
  console.error("FAIL meta.intentMemory not wired");
} else {
  console.log("OK meta.intentMemory wired");
}

if (INTENT_MEMORY_PROFILES.length !== 6) {
  failed += 1;
  console.error("FAIL memory profiles count");
} else {
  console.log(`OK memory profiles: ${INTENT_MEMORY_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.INTENT_MEMORY_ENABLED = "true";
process.env.INTENT_MEMORY_MODE = "telemetry-only";
delete process.env.INTENT_MEMORY_PROD_APPLY;
delete process.env.INTENT_MEMORY_CANARY_APPLY;
const prodBlocked = isIntentMemoryEnabled() && !isIntentMemoryMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production memory mutation blocked");
} else {
  console.log("OK production memory mutation OFF by default");
}

clearIntentMemoryStore();
const telemetryRows = runMemoryPartitions(MEMORY_TELEMETRY_ENV);
if (telemetryRows.some((r) => r.memory.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mutated");
} else {
  console.log("OK telemetry-only does not mutate");
}

saveLiveObservabilityRun({ suite: "intent-memory-audit", phase: "P5.2", pass: failed === 0 }, "intent-memory-audit");

if (failed) process.exit(1);
console.log("\nIntent memory audit passed");
