/**
 * P6.1 — Intent cognition integrity validation.
 */
import {
  isIntentCognitionEnabled,
  isIntentCognitionEnvironmentAllowed,
  isIntentCognitionMutationEnabled,
} from "../lib/intent/intentIntelligence.ts";
import { INTENT_COGNITION_MAX_DELTA } from "../lib/intent/intentFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { INTENT_COGNITION_BOUNDED_ENV, runIntentCognitionPartitions } from "./lib/intentRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, intentCognition: i } of runIntentCognitionPartitions(INTENT_COGNITION_BOUNDED_ENV)) {
  const ok = i.intentDelta <= INTENT_COGNITION_MAX_DELTA && i.monitoring.crossIntentBalanceValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: i.intentDelta });
  } else {
    console.log(`OK ${trayId} delta=${i.intentDelta}`);
  }
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.INTENT_COGNITION_ENABLED = "true";
process.env.INTENT_COGNITION_MODE = "bounded-intent";
delete process.env.INTENT_COGNITION_PROD_APPLY;
delete process.env.INTENT_COGNITION_CANARY_APPLY;
const blocked = isIntentCognitionEnabled() && !isIntentCognitionMutationEnabled() && !isIntentCognitionEnvironmentAllowed();
Object.assign(process.env, saved);
if (!blocked) {
  failed += 1;
  console.error("FAIL production blocked without opt-in");
} else {
  console.log("OK production blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "intent-cognition-integrity", phase: "P6.1", pass: failed === 0 }, "intent-cognition-integrity");
if (failed) process.exit(1);
console.log("\nIntent cognition integrity passed");
