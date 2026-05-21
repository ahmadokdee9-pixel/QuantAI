/**
 * P6.0 — Cross-layer integrity under cognition engine.
 * Usage: npm run test:cognition-integrity
 */
import {
  isCognitionEngineEnabled,
  isCognitionEngineEnvironmentAllowed,
  isCognitionEngineMutationEnabled,
} from "../lib/cognition/cognitionIntelligence.ts";
import { COGNITION_MAX_DELTA } from "../lib/cognition/cognitionFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COGNITION_BOUNDED_ENV, runCognitionPartitions } from "./lib/cognitionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runCognitionPartitions(COGNITION_BOUNDED_ENV);

for (const { trayId, cognitionEngine: c } of rows) {
  const ok =
    c.cognitionDelta <= COGNITION_MAX_DELTA &&
    c.conversionProbability <= 1 &&
    c.trustValueBalance <= 1 &&
    c.monitoring.crossLayerBalanceValid &&
    c.monitoring.graphIntegrityValid;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: c.cognitionDelta, conversion: c.conversionProbability });
  } else {
    console.log(`OK ${trayId} delta=${c.cognitionDelta} conversion=${c.conversionProbability}`);
  }
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.COGNITION_ENGINE_ENABLED = "true";
process.env.COGNITION_ENGINE_MODE = "bounded-cognition";
delete process.env.COGNITION_ENGINE_PROD_APPLY;
delete process.env.COGNITION_ENGINE_CANARY_APPLY;
const blocked = isCognitionEngineEnabled() && !isCognitionEngineMutationEnabled() && !isCognitionEngineEnvironmentAllowed();
Object.assign(process.env, saved);

if (!blocked) {
  failed += 1;
  console.error("FAIL production cognition blocked without opt-in");
} else {
  console.log("OK production cognition blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "cognition-integrity", phase: "P6.0", pass: failed === 0 }, "cognition-integrity");

if (failed) process.exit(1);
console.log("\nCognition engine integrity passed");
