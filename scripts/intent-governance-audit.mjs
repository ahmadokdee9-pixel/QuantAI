/**
 * P4.8 — Full governance audit (telemetry, advisory-only, production apply off).
 * Usage: npm run test:intent-governance-audit
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  aggregateIntentGovernance,
  isIntentGovernanceAutonomousBlocked,
} from "../lib/intent/intentGovernanceEngine.ts";
import { INTENT_GOV_MIN_GOVERNANCE_SCORE } from "../lib/intent/intentGovernanceFlags.ts";
import {
  isIntentApplyBlockedInProduction,
  isIntentIntelligenceApplyEnabled,
} from "../lib/intent/intentIntelligenceFlags.ts";
import { INTENT_GOVERNANCE_POLICIES } from "../lib/intent/intentPolicyRegistry.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { runGovernancePartitions } from "./lib/intentGovernanceRunner.mjs";

let failed = 0;
const rows = runGovernancePartitions();
const govRows = rows.map((r) => ({ trayId: r.trayId, governance: r.governance }));

for (const { trayId, governance: g } of govRows) {
  const dims = Object.values(g.dimensions);
  const ok =
    g.version === "intent-governance-v1" &&
    g.advisoryOnly === true &&
    g.autonomousBlocked === true &&
    g.active &&
    g.governanceScore >= INTENT_GOV_MIN_GOVERNANCE_SCORE &&
    dims.every((v) => v >= 40 && v <= 100) &&
    typeof g.integrityScore === "number" &&
    typeof g.suppressionSafety === "number" &&
    typeof g.trustSafety === "number" &&
    typeof g.merchantBalanceScore === "number" &&
    Array.isArray(g.governanceWarnings) &&
    Array.isArray(g.blockedPolicies);

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, g);
  } else {
    console.log(
      `OK ${trayId} score=${g.governanceScore} integrity=${g.integrityScore} anomaly=${g.anomalyDetected}`
    );
  }
}

const run1 = govRows[0].governance;
const run2 = runGovernancePartitions()[0].governance;
if (JSON.stringify(run1) !== JSON.stringify(run2)) {
  failed += 1;
  console.error("FAIL governance not deterministic");
} else {
  console.log("OK governance deterministic");
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("intentGovernance") || !route.includes("buildIntentGovernanceMeta")) {
  failed += 1;
  console.error("FAIL meta.intentGovernance not wired");
} else {
  console.log("OK meta.intentGovernance wired");
}

if (INTENT_GOVERNANCE_POLICIES.length !== 6) {
  failed += 1;
  console.error("FAIL policy registry count", INTENT_GOVERNANCE_POLICIES.length);
} else {
  console.log(`OK policy registry: ${INTENT_GOVERNANCE_POLICIES.length} policies`);
}

const savedProd = process.env.NODE_ENV;
const savedApply = process.env.INTENT_INTELLIGENCE_APPLY_ENABLED;
process.env.NODE_ENV = "production";
process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
delete process.env.INTENT_INTELLIGENCE_PROD_APPLY;
delete process.env.INTENT_INTELLIGENCE_CANARY_APPLY;
const applyOff = !isIntentIntelligenceApplyEnabled() && isIntentApplyBlockedInProduction();
if (savedProd === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = savedProd;
if (savedApply === undefined) delete process.env.INTENT_INTELLIGENCE_APPLY_ENABLED;
else process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = savedApply;

if (!applyOff || !isIntentGovernanceAutonomousBlocked()) {
  failed += 1;
  console.error("FAIL production safety", { applyOff });
} else {
  console.log("OK production apply OFF; governance autonomous blocked");
}

const agg = aggregateIntentGovernance(govRows);
console.log("\n--- P4.8 AGGREGATE ---");
console.log(JSON.stringify(agg, null, 2));

saveLiveObservabilityRun({ suite: "intent-governance-audit", phase: "P4.8", pass: failed === 0, aggregate: agg }, "intent-governance-audit");

if (failed) process.exit(1);
console.log("\nIntent governance audit passed");
