/**
 * P6.1 — Intent cognition audit.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { INTENT_COGNITION_MAX_DELTA } from "../lib/intent/intentFlags.ts";
import { INTENT_COGNITION_PROFILES } from "../lib/intent/intentProfiles.ts";
import {
  isIntentCognitionEnabled,
  isIntentCognitionMutationEnabled,
} from "../lib/intent/intentIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import {
  INTENT_COGNITION_BOUNDED_ENV,
  INTENT_COGNITION_TELEMETRY_ENV,
  runIntentCognitionPartitions,
} from "./lib/intentRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runIntentCognitionPartitions(INTENT_COGNITION_BOUNDED_ENV);

for (const { trayId, intentCognition: i } of rows) {
  const ok =
    i.version === "intent-cognition-v1" &&
    i.intentDelta <= INTENT_COGNITION_MAX_DELTA &&
    i.intentScore >= 30 &&
    typeof i.mutationApplied === "boolean";

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, i);
  } else {
    console.log(`OK ${trayId} score=${i.intentScore} delta=${i.intentDelta} mutation=${i.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("intentCognition") || !route.includes("applyControlledIntentCognition")) {
  failed += 1;
  console.error("FAIL meta.intentCognition not wired");
} else {
  console.log("OK meta.intentCognition wired");
}

if (INTENT_COGNITION_PROFILES.length !== 6) {
  failed += 1;
  console.error("FAIL intent cognition profiles count");
} else {
  console.log(`OK intent cognition profiles: ${INTENT_COGNITION_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.INTENT_COGNITION_ENABLED = "true";
process.env.INTENT_COGNITION_MODE = "telemetry-only";
delete process.env.INTENT_COGNITION_PROD_APPLY;
delete process.env.INTENT_COGNITION_CANARY_APPLY;
const prodBlocked = isIntentCognitionEnabled() && !isIntentCognitionMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production intent cognition mutation blocked");
} else {
  console.log("OK production intent cognition OFF by default");
}

clearIntentMemoryStore();
const telemetryRows = runIntentCognitionPartitions(INTENT_COGNITION_TELEMETRY_ENV);
if (telemetryRows.some((r) => r.intentCognition.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mutated");
} else {
  console.log("OK telemetry-only does not mutate");
}

saveLiveObservabilityRun({ suite: "intent-cognition-audit", phase: "P6.1", pass: failed === 0 }, "intent-cognition-audit");

if (failed) process.exit(1);
console.log("\nIntent cognition audit passed");
