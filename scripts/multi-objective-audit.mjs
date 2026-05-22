/**
 * P6.2 — Multi-objective commerce audit.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MULTI_OBJECTIVE_MAX_DELTA } from "../lib/multiObjective/multiObjectiveFlags.ts";
import { MULTI_OBJECTIVE_COMMERCE_PROFILES } from "../lib/multiObjective/multiObjectiveProfiles.ts";
import {
  isMultiObjectiveCommerceEnabled,
  isMultiObjectiveCommerceMutationEnabled,
} from "../lib/multiObjective/multiObjectiveIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import {
  MULTI_OBJECTIVE_BOUNDED_ENV,
  MULTI_OBJECTIVE_TELEMETRY_ENV,
  runMultiObjectivePartitions,
} from "./lib/multiObjectiveRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runMultiObjectivePartitions(MULTI_OBJECTIVE_BOUNDED_ENV);

for (const { trayId, multiObjectiveCommerce: m } of rows) {
  const ok =
    m.version === "multi-objective-commerce-v1" &&
    m.multiObjectiveDelta <= MULTI_OBJECTIVE_MAX_DELTA &&
    m.multiObjectiveScore >= 30 &&
    typeof m.mutationApplied === "boolean";

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, m);
  } else {
    console.log(`OK ${trayId} score=${m.multiObjectiveScore} delta=${m.multiObjectiveDelta} mutation=${m.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("multiObjectiveCommerce") || !route.includes("applyControlledMultiObjectiveCommerce")) {
  failed += 1;
  console.error("FAIL meta.multiObjectiveCommerce not wired");
} else {
  console.log("OK meta.multiObjectiveCommerce wired");
}

if (MULTI_OBJECTIVE_COMMERCE_PROFILES.length !== 6) {
  failed += 1;
  console.error("FAIL multi-objective profiles count");
} else {
  console.log(`OK multi-objective profiles: ${MULTI_OBJECTIVE_COMMERCE_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.MULTI_OBJECTIVE_COMMERCE_ENABLED = "true";
process.env.MULTI_OBJECTIVE_COMMERCE_MODE = "telemetry-only";
delete process.env.MULTI_OBJECTIVE_COMMERCE_PROD_APPLY;
delete process.env.MULTI_OBJECTIVE_COMMERCE_CANARY_APPLY;
const prodBlocked = isMultiObjectiveCommerceEnabled() && !isMultiObjectiveCommerceMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production multi-objective mutation blocked");
} else {
  console.log("OK production multi-objective OFF by default");
}

clearIntentMemoryStore();
const telemetryRows = runMultiObjectivePartitions(MULTI_OBJECTIVE_TELEMETRY_ENV);
if (telemetryRows.some((r) => r.multiObjectiveCommerce.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mutated");
} else {
  console.log("OK telemetry-only does not mutate");
}

saveLiveObservabilityRun({ suite: "multi-objective-audit", phase: "P6.2", pass: failed === 0 }, "multi-objective-audit");
if (failed) process.exit(1);
console.log("\nMulti-objective commerce audit passed");
