/**
 * P5.9 — Friction/readiness integrity under behavioral layer.
 * Usage: npm run test:behavioral-integrity
 */
import {
  isBehavioralCommerceEnabled,
  isBehavioralCommerceEnvironmentAllowed,
  isBehavioralCommerceMutationEnabled,
} from "../lib/behavioral/behavioralCommerce.ts";
import {
  BEHAVIORAL_MAX_FRICTION_AMPLIFICATION,
  BEHAVIORAL_MAX_READINESS_AMPLIFICATION,
} from "../lib/behavioral/behavioralFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { BEHAVIORAL_BOUNDED_ENV, runBehavioralPartitions } from "./lib/behavioralRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runBehavioralPartitions(BEHAVIORAL_BOUNDED_ENV);

for (const { trayId, behavioralCommerce: b } of rows) {
  const ok =
    b.buyingFriction <= BEHAVIORAL_MAX_FRICTION_AMPLIFICATION &&
    b.conversionReadiness <= BEHAVIORAL_MAX_READINESS_AMPLIFICATION &&
    b.analytics.readinessAnalytics >= 0 &&
    b.monitoring.readinessAmplificationValid;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { friction: b.buyingFriction, readiness: b.conversionReadiness });
  } else {
    console.log(`OK ${trayId} friction=${b.buyingFriction} readiness=${b.conversionReadiness}`);
  }
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.BEHAVIORAL_COMMERCE_ENABLED = "true";
process.env.BEHAVIORAL_COMMERCE_MODE = "bounded-behavioral";
delete process.env.BEHAVIORAL_COMMERCE_PROD_APPLY;
delete process.env.BEHAVIORAL_COMMERCE_CANARY_APPLY;
const blocked = isBehavioralCommerceEnabled() && !isBehavioralCommerceMutationEnabled() && !isBehavioralCommerceEnvironmentAllowed();
Object.assign(process.env, saved);

if (!blocked) {
  failed += 1;
  console.error("FAIL production behavioral blocked without opt-in");
} else {
  console.log("OK production behavioral blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "behavioral-integrity", phase: "P5.9", pass: failed === 0 }, "behavioral-integrity");

if (failed) process.exit(1);
console.log("\nBehavioral commerce integrity passed");
