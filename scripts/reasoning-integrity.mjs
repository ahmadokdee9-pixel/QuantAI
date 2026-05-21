/**
 * P5.5 — Trust/premium/suppression integrity under reasoning.
 * Usage: npm run test:reasoning-integrity
 */
import {
  isAdaptiveReasoningEnabled,
  isAdaptiveReasoningEnvironmentAllowed,
  isAdaptiveReasoningMutationEnabled,
} from "../lib/reasoning/adaptiveReasoning.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { REASONING_BOUNDED_ENV, runReasoningPartitions } from "./lib/reasoningRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runReasoningPartitions(REASONING_BOUNDED_ENV);

for (const { trayId, adaptiveReasoning: r } of rows) {
  const ok =
    r.trustReasoning <= 0.8 &&
    r.premiumReasoning <= 0.75 &&
    !r.monitoring.trustAmplification &&
    r.monitoring.comparisonQuality;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { trust: r.trustReasoning, premium: r.premiumReasoning });
  } else {
    console.log(`OK ${trayId} trust=${r.trustReasoning} premium=${r.premiumReasoning}`);
  }
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.ADAPTIVE_REASONING_ENABLED = "true";
process.env.ADAPTIVE_REASONING_MODE = "bounded-reasoning";
delete process.env.ADAPTIVE_REASONING_PROD_APPLY;
delete process.env.ADAPTIVE_REASONING_CANARY_APPLY;
const blocked = isAdaptiveReasoningEnabled() && !isAdaptiveReasoningMutationEnabled() && !isAdaptiveReasoningEnvironmentAllowed();
Object.assign(process.env, saved);

if (!blocked) {
  failed += 1;
  console.error("FAIL production reasoning blocked without opt-in");
} else {
  console.log("OK production reasoning blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "reasoning-integrity", phase: "P5.5", pass: failed === 0 }, "reasoning-integrity");

if (failed) process.exit(1);
console.log("\nAdaptive reasoning integrity passed");
