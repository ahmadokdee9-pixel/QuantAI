/**
 * P5.5 — Reasoning audit (telemetry, production OFF, caps).
 * Usage: npm run test:reasoning-audit
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REASONING_MAX_DELTA } from "../lib/reasoning/reasoningFlags.ts";
import { REASONING_PROFILES } from "../lib/reasoning/reasoningProfiles.ts";
import {
  isAdaptiveReasoningEnabled,
  isAdaptiveReasoningMutationEnabled,
} from "../lib/reasoning/adaptiveReasoning.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { REASONING_BOUNDED_ENV, REASONING_TELEMETRY_ENV, runReasoningPartitions } from "./lib/reasoningRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runReasoningPartitions(REASONING_BOUNDED_ENV);

for (const { trayId, adaptiveReasoning: r } of rows) {
  const ok =
    r.version === "adaptive-reasoning-v1" &&
    r.reasoningDelta <= REASONING_MAX_DELTA &&
    r.reasoningScore >= 30 &&
    typeof r.mutationApplied === "boolean";

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, r);
  } else {
    console.log(`OK ${trayId} score=${r.reasoningScore} delta=${r.reasoningDelta} mutation=${r.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("adaptiveReasoning") || !route.includes("applyControlledAdaptiveReasoning")) {
  failed += 1;
  console.error("FAIL meta.adaptiveReasoning not wired");
} else {
  console.log("OK meta.adaptiveReasoning wired");
}

if (REASONING_PROFILES.length !== 6) {
  failed += 1;
  console.error("FAIL reasoning profiles count");
} else {
  console.log(`OK reasoning profiles: ${REASONING_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.ADAPTIVE_REASONING_ENABLED = "true";
process.env.ADAPTIVE_REASONING_MODE = "telemetry-only";
delete process.env.ADAPTIVE_REASONING_PROD_APPLY;
delete process.env.ADAPTIVE_REASONING_CANARY_APPLY;
const prodBlocked = isAdaptiveReasoningEnabled() && !isAdaptiveReasoningMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production reasoning mutation blocked");
} else {
  console.log("OK production reasoning mutation OFF by default");
}

clearIntentMemoryStore();
const telemetryRows = runReasoningPartitions(REASONING_TELEMETRY_ENV);
if (telemetryRows.some((row) => row.adaptiveReasoning.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mutated");
} else {
  console.log("OK telemetry-only does not mutate");
}

saveLiveObservabilityRun({ suite: "reasoning-audit", phase: "P5.5", pass: failed === 0 }, "reasoning-audit");

if (failed) process.exit(1);
console.log("\nAdaptive reasoning audit passed");
