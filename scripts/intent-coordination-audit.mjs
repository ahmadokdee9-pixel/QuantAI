/**
 * P5.3 — Coordination audit (telemetry, production OFF, caps).
 * Usage: npm run test:intent-coordination-audit
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { INTENT_COORDINATION_MAX_DELTA } from "../lib/intent/intentCoordinationFlags.ts";
import { INTENT_COORDINATION_PROFILES } from "../lib/intent/intentCoordinationProfiles.ts";
import {
  isIntentCoordinationEnabled,
  isIntentCoordinationMutationEnabled,
} from "../lib/intent/intentCoordination.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COORDINATION_BOUNDED_ENV, COORDINATION_TELEMETRY_ENV, runCoordinationPartitions } from "./lib/intentCoordinationRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runCoordinationPartitions(COORDINATION_BOUNDED_ENV);

for (const { trayId, coordination: c } of rows) {
  const ok =
    c.version === "intent-coordination-v1" &&
    c.coordinationDelta <= INTENT_COORDINATION_MAX_DELTA &&
    c.coordinationScore >= 40 &&
    typeof c.mutationApplied === "boolean";

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, c);
  } else {
    console.log(`OK ${trayId} score=${c.coordinationScore} delta=${c.coordinationDelta} mutation=${c.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("intentCoordination") || !route.includes("applyControlledIntentCoordination")) {
  failed += 1;
  console.error("FAIL meta.intentCoordination not wired");
} else {
  console.log("OK meta.intentCoordination wired");
}

if (INTENT_COORDINATION_PROFILES.length !== 6) {
  failed += 1;
  console.error("FAIL coordination profiles count");
} else {
  console.log(`OK coordination profiles: ${INTENT_COORDINATION_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.INTENT_COORDINATION_ENABLED = "true";
process.env.INTENT_COORDINATION_MODE = "telemetry-only";
delete process.env.INTENT_COORDINATION_PROD_APPLY;
delete process.env.INTENT_COORDINATION_CANARY_APPLY;
const prodBlocked = isIntentCoordinationEnabled() && !isIntentCoordinationMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production coordination mutation blocked");
} else {
  console.log("OK production coordination mutation OFF by default");
}

clearIntentMemoryStore();
const telemetryRows = runCoordinationPartitions(COORDINATION_TELEMETRY_ENV);
if (telemetryRows.some((r) => r.coordination.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mutated");
} else {
  console.log("OK telemetry-only does not mutate");
}

saveLiveObservabilityRun({ suite: "intent-coordination-audit", phase: "P5.3", pass: failed === 0 }, "intent-coordination-audit");

if (failed) process.exit(1);
console.log("\nIntent coordination audit passed");
