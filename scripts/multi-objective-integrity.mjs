/**
 * P6.2 — Multi-objective commerce integrity validation.
 */
import {
  isMultiObjectiveCommerceEnabled,
  isMultiObjectiveCommerceEnvironmentAllowed,
  isMultiObjectiveCommerceMutationEnabled,
} from "../lib/multiObjective/multiObjectiveIntelligence.ts";
import { MULTI_OBJECTIVE_MAX_DELTA } from "../lib/multiObjective/multiObjectiveFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MULTI_OBJECTIVE_BOUNDED_ENV, runMultiObjectivePartitions } from "./lib/multiObjectiveRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, multiObjectiveCommerce: m } of runMultiObjectivePartitions(MULTI_OBJECTIVE_BOUNDED_ENV)) {
  const ok = m.multiObjectiveDelta <= MULTI_OBJECTIVE_MAX_DELTA && m.monitoring.crossObjectiveBalanceValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: m.multiObjectiveDelta });
  } else {
    console.log(`OK ${trayId} delta=${m.multiObjectiveDelta}`);
  }
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.MULTI_OBJECTIVE_COMMERCE_ENABLED = "true";
process.env.MULTI_OBJECTIVE_COMMERCE_MODE = "bounded-multi-objective";
delete process.env.MULTI_OBJECTIVE_COMMERCE_PROD_APPLY;
delete process.env.MULTI_OBJECTIVE_COMMERCE_CANARY_APPLY;
const blocked = isMultiObjectiveCommerceEnabled() && !isMultiObjectiveCommerceMutationEnabled() && !isMultiObjectiveCommerceEnvironmentAllowed();
Object.assign(process.env, saved);
if (!blocked) {
  failed += 1;
  console.error("FAIL production blocked without opt-in");
} else {
  console.log("OK production blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "multi-objective-integrity", phase: "P6.2", pass: failed === 0 }, "multi-objective-integrity");
if (failed) process.exit(1);
console.log("\nMulti-objective commerce integrity passed");
