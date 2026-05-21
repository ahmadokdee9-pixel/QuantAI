/**
 * P5.3 — Trust/suppression/diversity integrity under coordination.
 * Usage: npm run test:intent-coordination-integrity
 */
import {
  isIntentCoordinationEnabled,
  isIntentCoordinationEnvironmentAllowed,
  isIntentCoordinationMutationEnabled,
} from "../lib/intent/intentCoordination.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COORDINATION_BOUNDED_ENV, runCoordinationPartitions } from "./lib/intentCoordinationRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runCoordinationPartitions(COORDINATION_BOUNDED_ENV);

for (const { trayId, coordination: c } of rows) {
  const ok =
    c.trustPropagation <= 1 &&
    c.suppressionCoordination <= 1 &&
    c.diversityCoordination <= 1 &&
    c.monitoring.graphIntegrityValid;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, {
      trust: c.trustPropagation,
      suppression: c.suppressionCoordination,
      diversity: c.diversityCoordination,
    });
  } else {
    console.log(`OK ${trayId} trust=${c.trustPropagation} suppression=${c.suppressionCoordination} diversity=${c.diversityCoordination}`);
  }
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.INTENT_COORDINATION_ENABLED = "true";
process.env.INTENT_COORDINATION_MODE = "bounded-coordination";
delete process.env.INTENT_COORDINATION_PROD_APPLY;
delete process.env.INTENT_COORDINATION_CANARY_APPLY;
const blocked = isIntentCoordinationEnabled() && !isIntentCoordinationMutationEnabled() && !isIntentCoordinationEnvironmentAllowed();
Object.assign(process.env, saved);

if (!blocked) {
  failed += 1;
  console.error("FAIL production coordination blocked without opt-in");
} else {
  console.log("OK production coordination blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "intent-coordination-integrity", phase: "P5.3", pass: failed === 0 }, "intent-coordination-integrity");

if (failed) process.exit(1);
console.log("\nIntent coordination integrity passed");
