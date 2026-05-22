/**
 * P6.4 — Memoryless commerce learning audit.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MEMORYLESS_LEARNING_MAX_DELTA } from "../lib/memorylessLearning/memorylessLearningFlags.ts";
import { MEMORYLESS_COMMERCE_LEARNING_PROFILES } from "../lib/memorylessLearning/memorylessLearningProfiles.ts";
import {
  isMemorylessCommerceLearningEnabled,
  isMemorylessCommerceLearningMutationEnabled,
} from "../lib/memorylessLearning/memorylessLearningIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import {
  MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV,
  MEMORYLESS_COMMERCE_LEARNING_TELEMETRY_ENV,
  runMemorylessLearningPartitions,
} from "./lib/memorylessLearningRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, memorylessCommerceLearning: m } of runMemorylessLearningPartitions(MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV)) {
  const ok =
    m.version === "memoryless-commerce-learning-v1" &&
    m.learningDelta <= MEMORYLESS_LEARNING_MAX_DELTA &&
    m.learningScore >= 30 &&
    typeof m.mutationApplied === "boolean";
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, m);
  } else {
    console.log(`OK ${trayId} score=${m.learningScore} delta=${m.learningDelta} mutation=${m.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("memorylessCommerceLearning") || !route.includes("applyControlledMemorylessCommerceLearning")) {
  failed += 1;
  console.error("FAIL meta.memorylessCommerceLearning not wired");
} else {
  console.log("OK meta.memorylessCommerceLearning wired");
}

if (MEMORYLESS_COMMERCE_LEARNING_PROFILES.length !== 6) {
  failed += 1;
  console.error("FAIL memoryless learning profiles count");
} else {
  console.log(`OK memoryless learning profiles: ${MEMORYLESS_COMMERCE_LEARNING_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.MEMORYLESS_COMMERCE_LEARNING_ENABLED = "true";
process.env.MEMORYLESS_COMMERCE_LEARNING_MODE = "telemetry-only";
delete process.env.MEMORYLESS_COMMERCE_LEARNING_PROD_APPLY;
delete process.env.MEMORYLESS_COMMERCE_LEARNING_CANARY_APPLY;
const prodBlocked = isMemorylessCommerceLearningEnabled() && !isMemorylessCommerceLearningMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production memoryless learning mutation blocked");
} else {
  console.log("OK production memoryless learning OFF by default");
}

clearIntentMemoryStore();
if (runMemorylessLearningPartitions(MEMORYLESS_COMMERCE_LEARNING_TELEMETRY_ENV).some((r) => r.memorylessCommerceLearning.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mutated");
} else {
  console.log("OK telemetry-only does not mutate");
}

if (/userProfile|personalizationMemory|userTasteProfile/.test(route)) {
  failed += 1;
  console.error("FAIL personalization patterns in search route");
} else {
  console.log("OK no personalization memory in route");
}

saveLiveObservabilityRun({ suite: "memoryless-commerce-learning-audit", phase: "P6.4", pass: failed === 0 }, "memoryless-commerce-learning-audit");
if (failed) process.exit(1);
console.log("\nMemoryless commerce learning audit passed");
