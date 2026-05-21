/**
 * P5.9 — Behavioral audit (telemetry, production OFF, caps).
 * Usage: npm run test:behavioral-audit
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BEHAVIORAL_MAX_DELTA } from "../lib/behavioral/behavioralFlags.ts";
import { BEHAVIORAL_PROFILES } from "../lib/behavioral/behavioralProfiles.ts";
import {
  isBehavioralCommerceEnabled,
  isBehavioralCommerceMutationEnabled,
} from "../lib/behavioral/behavioralCommerce.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { BEHAVIORAL_BOUNDED_ENV, BEHAVIORAL_TELEMETRY_ENV, runBehavioralPartitions } from "./lib/behavioralRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runBehavioralPartitions(BEHAVIORAL_BOUNDED_ENV);

for (const { trayId, behavioralCommerce: b } of rows) {
  const ok =
    b.version === "behavioral-commerce-v1" &&
    b.behavioralDelta <= BEHAVIORAL_MAX_DELTA &&
    b.behavioralScore >= 30 &&
    typeof b.mutationApplied === "boolean";

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, b);
  } else {
    console.log(`OK ${trayId} score=${b.behavioralScore} delta=${b.behavioralDelta} mutation=${b.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("behavioralCommerce") || !route.includes("applyControlledBehavioralCommerce")) {
  failed += 1;
  console.error("FAIL meta.behavioralCommerce not wired");
} else {
  console.log("OK meta.behavioralCommerce wired");
}

if (BEHAVIORAL_PROFILES.length !== 6) {
  failed += 1;
  console.error("FAIL behavioral profiles count");
} else {
  console.log(`OK behavioral profiles: ${BEHAVIORAL_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.BEHAVIORAL_COMMERCE_ENABLED = "true";
process.env.BEHAVIORAL_COMMERCE_MODE = "telemetry-only";
delete process.env.BEHAVIORAL_COMMERCE_PROD_APPLY;
delete process.env.BEHAVIORAL_COMMERCE_CANARY_APPLY;
const prodBlocked = isBehavioralCommerceEnabled() && !isBehavioralCommerceMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production behavioral mutation blocked");
} else {
  console.log("OK production behavioral mutation OFF by default");
}

clearIntentMemoryStore();
const telemetryRows = runBehavioralPartitions(BEHAVIORAL_TELEMETRY_ENV);
if (telemetryRows.some((r) => r.behavioralCommerce.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mutated");
} else {
  console.log("OK telemetry-only does not mutate");
}

saveLiveObservabilityRun({ suite: "behavioral-audit", phase: "P5.9", pass: failed === 0 }, "behavioral-audit");

if (failed) process.exit(1);
console.log("\nBehavioral commerce audit passed");
