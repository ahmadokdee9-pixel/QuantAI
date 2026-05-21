/**
 * P5.0 — Full runtime audit (telemetry, production default OFF, bounded caps).
 * Usage: npm run test:intent-runtime-audit
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { INTENT_RUNTIME_MAX_DELTA } from "../lib/intent/intentRuntimeFlags.ts";
import { INTENT_RUNTIME_PROFILES } from "../lib/intent/intentRuntimeProfiles.ts";
import {
  isIntentRuntimeEnabled,
  isIntentRuntimeEnvironmentAllowed,
  isIntentRuntimeMutationEnabled,
} from "../lib/intent/intentRuntimeController.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { RUNTIME_BOUNDED_ENV, RUNTIME_TELEMETRY_ENV, runRuntimePartitions } from "./lib/intentRuntimeRunner.mjs";

let failed = 0;
const rows = runRuntimePartitions(RUNTIME_BOUNDED_ENV);

for (const { trayId, runtime: r } of rows) {
  const ok =
    r.version === "intent-runtime-v1" &&
    r.runtimeDelta <= INTENT_RUNTIME_MAX_DELTA &&
    r.trustApplied <= 20 &&
    r.runtimeScore >= 40 &&
    typeof r.mutationApplied === "boolean";

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, r);
  } else {
    console.log(`OK ${trayId} score=${r.runtimeScore} delta=${r.runtimeDelta} mutation=${r.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("intentRuntime") || !route.includes("applyControlledIntentRuntime")) {
  failed += 1;
  console.error("FAIL meta.intentRuntime not wired");
} else {
  console.log("OK meta.intentRuntime wired");
}

if (INTENT_RUNTIME_PROFILES.length !== 5) {
  failed += 1;
  console.error("FAIL runtime profiles count");
} else {
  console.log(`OK runtime profiles: ${INTENT_RUNTIME_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.INTENT_RUNTIME_ENABLED = "true";
process.env.INTENT_RUNTIME_MODE = "telemetry-only";
delete process.env.INTENT_RUNTIME_PROD_APPLY;
delete process.env.INTENT_RUNTIME_CANARY_APPLY;
const prodBlocked = isIntentRuntimeEnabled() && !isIntentRuntimeMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production mutation should be blocked by default");
} else {
  console.log("OK production runtime mutation OFF by default");
}

const telemetryRows = runRuntimePartitions(RUNTIME_TELEMETRY_ENV);
if (telemetryRows.some((r) => r.runtime.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mode mutated ranking");
} else {
  console.log("OK telemetry-only mode does not mutate");
}

saveLiveObservabilityRun({ suite: "intent-runtime-audit", phase: "P5.0", pass: failed === 0 }, "intent-runtime-audit");

if (failed) process.exit(1);
console.log("\nIntent runtime audit passed");
