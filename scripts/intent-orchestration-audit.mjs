/**
 * P5.1 — Orchestration audit (telemetry, production default OFF, caps).
 * Usage: npm run test:intent-orchestration-audit
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { INTENT_ORCH_MAX_DELTA } from "../lib/intent/intentOrchestrationFlags.ts";
import { INTENT_ORCHESTRATION_PROFILES } from "../lib/intent/intentOrchestrationProfiles.ts";
import {
  isIntentOrchestrationEnabled,
  isIntentOrchestrationMutationEnabled,
} from "../lib/intent/intentOrchestrator.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import {
  ORCHESTRATION_BOUNDED_ENV,
  ORCHESTRATION_TELEMETRY_ENV,
  runOrchestrationPartitions,
} from "./lib/intentOrchestrationRunner.mjs";

let failed = 0;
const rows = runOrchestrationPartitions(ORCHESTRATION_BOUNDED_ENV);

for (const { trayId, orchestration: o } of rows) {
  const ok =
    o.version === "intent-orchestration-v1" &&
    o.orchestrationDelta <= INTENT_ORCH_MAX_DELTA &&
    o.orchestrationScore >= 40 &&
    typeof o.mutationApplied === "boolean";

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, o);
  } else {
    console.log(`OK ${trayId} score=${o.orchestrationScore} delta=${o.orchestrationDelta} mutation=${o.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("intentOrchestration") || !route.includes("applyControlledIntentOrchestration")) {
  failed += 1;
  console.error("FAIL meta.intentOrchestration not wired");
} else {
  console.log("OK meta.intentOrchestration wired");
}

if (INTENT_ORCHESTRATION_PROFILES.length !== 6) {
  failed += 1;
  console.error("FAIL orchestration profiles");
} else {
  console.log(`OK orchestration profiles: ${INTENT_ORCHESTRATION_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.INTENT_ORCHESTRATION_ENABLED = "true";
process.env.INTENT_ORCHESTRATION_MODE = "telemetry-only";
delete process.env.INTENT_ORCHESTRATION_PROD_APPLY;
delete process.env.INTENT_ORCHESTRATION_CANARY_APPLY;
const prodBlocked = isIntentOrchestrationEnabled() && !isIntentOrchestrationMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production orchestration mutation should be blocked");
} else {
  console.log("OK production orchestration mutation OFF by default");
}

const telemetryRows = runOrchestrationPartitions(ORCHESTRATION_TELEMETRY_ENV);
if (telemetryRows.some((r) => r.orchestration.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mutated ranking");
} else {
  console.log("OK telemetry-only does not mutate");
}

saveLiveObservabilityRun({ suite: "intent-orchestration-audit", phase: "P5.1", pass: failed === 0 }, "intent-orchestration-audit");

if (failed) process.exit(1);
console.log("\nIntent orchestration audit passed");
