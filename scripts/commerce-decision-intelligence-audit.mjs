/**
 * P6.6 — Commerce decision intelligence audit.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COMMERCE_DECISION_MAX_DELTA } from "../lib/commerceDecision/commerceDecisionFlags.ts";
import { COMMERCE_DECISION_INTELLIGENCE_PROFILES } from "../lib/commerceDecision/commerceDecisionProfiles.ts";
import {
  isCommerceDecisionIntelligenceEnabled,
  isCommerceDecisionIntelligenceMutationEnabled,
} from "../lib/commerceDecision/commerceDecisionIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import {
  COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV,
  COMMERCE_DECISION_INTELLIGENCE_TELEMETRY_ENV,
  runCommerceDecisionPartitions,
} from "./lib/commerceDecisionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, commerceDecisionIntelligence: m } of runCommerceDecisionPartitions(COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV)) {
  const ok =
    m.version === "commerce-decision-intelligence-v1" &&
    m.decisionDelta <= COMMERCE_DECISION_MAX_DELTA &&
    m.decisionScore >= 30 &&
    typeof m.mutationApplied === "boolean";
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, m);
  } else {
    console.log(`OK ${trayId} score=${m.decisionScore} delta=${m.decisionDelta} mutation=${m.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("commerceDecisionIntelligence") || !route.includes("applyControlledCommerceDecisionIntelligence")) {
  failed += 1;
  console.error("FAIL meta.commerceDecisionIntelligence not wired");
} else {
  console.log("OK meta.commerceDecisionIntelligence wired");
}

if (COMMERCE_DECISION_INTELLIGENCE_PROFILES.length !== 6) {
  failed += 1;
  console.error("FAIL commerce decision profiles count");
} else {
  console.log(`OK commerce decision profiles: ${COMMERCE_DECISION_INTELLIGENCE_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.COMMERCE_DECISION_INTELLIGENCE_ENABLED = "true";
process.env.COMMERCE_DECISION_INTELLIGENCE_MODE = "telemetry-only";
delete process.env.COMMERCE_DECISION_INTELLIGENCE_PROD_APPLY;
delete process.env.COMMERCE_DECISION_INTELLIGENCE_CANARY_APPLY;
const prodBlocked = isCommerceDecisionIntelligenceEnabled() && !isCommerceDecisionIntelligenceMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production commerce decision mutation blocked");
} else {
  console.log("OK production commerce decision OFF by default");
}

clearIntentMemoryStore();
if (runCommerceDecisionPartitions(COMMERCE_DECISION_INTELLIGENCE_TELEMETRY_ENV).some((r) => r.commerceDecisionIntelligence.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mutated");
} else {
  console.log("OK telemetry-only does not mutate");
}

if (/userProfile|personalizationMemory|userTasteProfile|embeddingDecision/.test(route)) {
  failed += 1;
  console.error("FAIL personalization patterns in search route");
} else {
  console.log("OK no personalization in route");
}

saveLiveObservabilityRun({ suite: "commerce-decision-intelligence-audit", phase: "P6.6", pass: failed === 0 }, "commerce-decision-intelligence-audit");
if (failed) process.exit(1);
console.log("\nCommerce decision intelligence audit passed");
