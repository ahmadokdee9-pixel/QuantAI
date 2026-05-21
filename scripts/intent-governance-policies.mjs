/**
 * P4.8 — Policy registry enforcement coverage.
 * Usage: npm run test:intent-governance-policies
 */
import {
  INTENT_GOVERNANCE_POLICIES,
  evaluateGovernancePolicy,
} from "../lib/intent/intentPolicyRegistry.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { runGovernancePartitions } from "./lib/intentGovernanceRunner.mjs";

let failed = 0;
const rows = runGovernancePartitions();

const expectedIds = new Set(INTENT_GOVERNANCE_POLICIES.map((p) => p.id));
for (const { trayId, governance: g, row } of rows) {
  for (const policy of INTENT_GOVERNANCE_POLICIES) {
    if (!policy.advisoryOnly) {
      failed += 1;
      console.error(`FAIL ${policy.id} not advisoryOnly`);
    }
  }

  const ctx = {
    evaluation: row.evaluation,
    optimization: row.optimization,
    observability: row.observability,
    intentApply: row.intentApply,
    productionApply: row.intentProductionApply,
    canary: row.canary,
    products: row.products,
    rankingStable: row.rankingStable,
  };

  for (const id of expectedIds) {
    const result = evaluateGovernancePolicy(id, ctx);
    if (result.policyId !== id) {
      failed += 1;
      console.error(`FAIL ${trayId} policy eval ${id}`);
    }
  }

  const blockedOk = g.blockedPolicies.every((id) => expectedIds.has(id));
  if (!blockedOk) {
    failed += 1;
    console.error(`FAIL ${trayId} unknown blocked policy`, g.blockedPolicies);
  } else {
    console.log(`OK ${trayId} policies=${INTENT_GOVERNANCE_POLICIES.length} blocked=${g.blockedPolicies.join(",") || "none"}`);
  }
}

const policyIds = [
  "unsafe_suppression_block",
  "over_optimization_prevention",
  "trust_manipulation_prevention",
  "merchant_domination_prevention",
  "hidden_activation_detection",
  "unstable_rerank_prevention",
];
for (const id of policyIds) {
  if (!expectedIds.has(id)) {
    failed += 1;
    console.error(`FAIL missing policy ${id}`);
  }
}
if (!failed) console.log("OK all six enforcement policies registered");

process.env.INTENT_GOVERNANCE = "false";
const { buildIntentGovernanceMeta } = await import("../lib/intent/intentGovernanceEngine.ts");
const off = buildIntentGovernanceMeta({
  evaluation: rows[0].evaluation,
  optimization: rows[0].optimization,
  observability: rows[0].row.observability,
  intentApply: rows[0].row.intentApply,
  productionApply: rows[0].row.intentProductionApply,
  canary: rows[0].row.canary,
  products: rows[0].row.products,
  rankingStable: rows[0].row.rankingStable,
});
delete process.env.INTENT_GOVERNANCE;
if (off.rollbackGovernanceReason !== "governance_disabled") {
  failed += 1;
  console.error("FAIL INTENT_GOVERNANCE=false", off.rollbackGovernanceReason);
} else {
  console.log("OK INTENT_GOVERNANCE=false disables meta");
}

saveLiveObservabilityRun({ suite: "intent-governance-policies", phase: "P4.8", pass: failed === 0 }, "intent-governance-policies");

if (failed) process.exit(1);
console.log("\nIntent governance policies passed");
