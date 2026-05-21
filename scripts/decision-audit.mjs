/**
 * P5.6 — Decision audit (telemetry, production OFF, caps).
 * Usage: npm run test:decision-audit
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DECISION_MAX_DELTA } from "../lib/decision/decisionFlags.ts";
import { DECISION_PROFILES } from "../lib/decision/decisionProfiles.ts";
import {
  isDecisionIntelligenceEnabled,
  isDecisionIntelligenceMutationEnabled,
} from "../lib/decision/decisionIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { DECISION_BOUNDED_ENV, DECISION_TELEMETRY_ENV, runDecisionPartitions } from "./lib/decisionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runDecisionPartitions(DECISION_BOUNDED_ENV);

for (const { trayId, decisionIntelligence: d } of rows) {
  const ok =
    d.version === "decision-intelligence-v1" &&
    d.decisionDelta <= DECISION_MAX_DELTA &&
    d.decisionScore >= 30 &&
    typeof d.mutationApplied === "boolean";

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, d);
  } else {
    console.log(`OK ${trayId} score=${d.decisionScore} delta=${d.decisionDelta} mutation=${d.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("decisionIntelligence") || !route.includes("applyControlledDecisionIntelligence")) {
  failed += 1;
  console.error("FAIL meta.decisionIntelligence not wired");
} else {
  console.log("OK meta.decisionIntelligence wired");
}

if (DECISION_PROFILES.length !== 6) {
  failed += 1;
  console.error("FAIL decision profiles count");
} else {
  console.log(`OK decision profiles: ${DECISION_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.DECISION_INTELLIGENCE_ENABLED = "true";
process.env.DECISION_INTELLIGENCE_MODE = "telemetry-only";
delete process.env.DECISION_INTELLIGENCE_PROD_APPLY;
delete process.env.DECISION_INTELLIGENCE_CANARY_APPLY;
const prodBlocked = isDecisionIntelligenceEnabled() && !isDecisionIntelligenceMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production decision mutation blocked");
} else {
  console.log("OK production decision mutation OFF by default");
}

clearIntentMemoryStore();
const telemetryRows = runDecisionPartitions(DECISION_TELEMETRY_ENV);
if (telemetryRows.some((r) => r.decisionIntelligence.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mutated");
} else {
  console.log("OK telemetry-only does not mutate");
}

saveLiveObservabilityRun({ suite: "decision-audit", phase: "P5.6", pass: failed === 0 }, "decision-audit");

if (failed) process.exit(1);
console.log("\nDecision intelligence audit passed");
