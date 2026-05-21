/**
 * P5.4 — Trust/suppression/diversity integrity under fusion.
 * Usage: npm run test:intent-fusion-integrity
 */
import {
  isIntentFusionEnabled,
  isIntentFusionEnvironmentAllowed,
  isIntentFusionMutationEnabled,
} from "../lib/intent/intentFusion.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { FUSION_BOUNDED_ENV, runFusionPartitions } from "./lib/intentFusionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runFusionPartitions(FUSION_BOUNDED_ENV);

for (const { trayId, fusion: f } of rows) {
  const ok =
    f.trustFusion <= 0.85 &&
    f.suppressionRecovery <= 0.8 &&
    f.diversityBalance <= 0.8 &&
    !f.monitoring.trustAmplification &&
    !f.monitoring.suppressionImbalance;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, {
      trust: f.trustFusion,
      suppression: f.suppressionRecovery,
      diversity: f.diversityBalance,
    });
  } else {
    console.log(`OK ${trayId} trust=${f.trustFusion} suppression=${f.suppressionRecovery} diversity=${f.diversityBalance}`);
  }
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.INTENT_FUSION_ENABLED = "true";
process.env.INTENT_FUSION_MODE = "bounded-fusion";
delete process.env.INTENT_FUSION_PROD_APPLY;
delete process.env.INTENT_FUSION_CANARY_APPLY;
const blocked = isIntentFusionEnabled() && !isIntentFusionMutationEnabled() && !isIntentFusionEnvironmentAllowed();
Object.assign(process.env, saved);

if (!blocked) {
  failed += 1;
  console.error("FAIL production fusion blocked without opt-in");
} else {
  console.log("OK production fusion blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "intent-fusion-integrity", phase: "P5.4", pass: failed === 0 }, "intent-fusion-integrity");

if (failed) process.exit(1);
console.log("\nIntent fusion integrity passed");
