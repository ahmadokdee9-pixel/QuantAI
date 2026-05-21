/**
 * P6.0 — Cognition audit (telemetry, production OFF, caps).
 * Usage: npm run test:cognition-audit
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COGNITION_MAX_DELTA } from "../lib/cognition/cognitionFlags.ts";
import { COGNITION_PROFILES } from "../lib/cognition/cognitionProfiles.ts";
import {
  isCognitionEngineEnabled,
  isCognitionEngineMutationEnabled,
} from "../lib/cognition/cognitionIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COGNITION_BOUNDED_ENV, COGNITION_TELEMETRY_ENV, runCognitionPartitions } from "./lib/cognitionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runCognitionPartitions(COGNITION_BOUNDED_ENV);

for (const { trayId, cognitionEngine: c } of rows) {
  const ok =
    c.version === "cognition-engine-v1" &&
    c.cognitionDelta <= COGNITION_MAX_DELTA &&
    c.cognitionScore >= 30 &&
    typeof c.mutationApplied === "boolean";

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, c);
  } else {
    console.log(`OK ${trayId} score=${c.cognitionScore} delta=${c.cognitionDelta} mutation=${c.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("cognitionEngine") || !route.includes("applyControlledCognitionEngine")) {
  failed += 1;
  console.error("FAIL meta.cognitionEngine not wired");
} else {
  console.log("OK meta.cognitionEngine wired");
}

if (COGNITION_PROFILES.length !== 6) {
  failed += 1;
  console.error("FAIL cognition profiles count");
} else {
  console.log(`OK cognition profiles: ${COGNITION_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.COGNITION_ENGINE_ENABLED = "true";
process.env.COGNITION_ENGINE_MODE = "telemetry-only";
delete process.env.COGNITION_ENGINE_PROD_APPLY;
delete process.env.COGNITION_ENGINE_CANARY_APPLY;
const prodBlocked = isCognitionEngineEnabled() && !isCognitionEngineMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production cognition mutation blocked");
} else {
  console.log("OK production cognition mutation OFF by default");
}

clearIntentMemoryStore();
const telemetryRows = runCognitionPartitions(COGNITION_TELEMETRY_ENV);
if (telemetryRows.some((r) => r.cognitionEngine.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mutated");
} else {
  console.log("OK telemetry-only does not mutate");
}

saveLiveObservabilityRun({ suite: "cognition-audit", phase: "P6.0", pass: failed === 0 }, "cognition-audit");

if (failed) process.exit(1);
console.log("\nCognition engine audit passed");
