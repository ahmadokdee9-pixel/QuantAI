/**
 * P4.8 — Governance integrity, suppression safety, trust safety.
 * Usage: npm run test:intent-governance-integrity
 */
import {
  INTENT_GOV_MIN_SUPPRESSION_SAFETY,
  INTENT_GOV_MIN_TRUST_SAFETY,
} from "../lib/intent/intentGovernanceFlags.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { runGovernancePartitions } from "./lib/intentGovernanceRunner.mjs";

let failed = 0;
const rows = runGovernancePartitions();

for (const { trayId, governance: g } of rows) {
  const ok =
    g.integrityScore >= 55 &&
    g.suppressionSafety >= INTENT_GOV_MIN_SUPPRESSION_SAFETY &&
    g.trustSafety >= INTENT_GOV_MIN_TRUST_SAFETY &&
    g.merchantBalanceScore >= 45;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, {
      integrity: g.integrityScore,
      suppression: g.suppressionSafety,
      trust: g.trustSafety,
      merchant: g.merchantBalanceScore,
    });
  } else {
    console.log(
      `OK ${trayId} integrity=${g.integrityScore} suppression=${g.suppressionSafety} trust=${g.trustSafety}`
    );
  }
}

const prod = runGovernancePartitions({
  NODE_ENV: "production",
  INTENT_INTELLIGENCE_APPLY_ENABLED: "true",
  INTENT_INTELLIGENCE_CANARY_APPLY: undefined,
  INTENT_INTELLIGENCE_PROD_APPLY: undefined,
  INTENT_CANARY_ROLLOUT_STAGE: undefined,
  TASTE_UNIFIED_APPLY_ENABLED: "false",
});
const rollbackOk = prod[0].governance.rollbackGovernanceReason?.includes("production_blocked");
if (!rollbackOk) {
  failed += 1;
  console.error("FAIL rollback governance", prod[0].governance.rollbackGovernanceReason);
} else {
  console.log(`OK rollback governance: ${prod[0].governance.rollbackGovernanceReason}`);
}

saveLiveObservabilityRun({ suite: "intent-governance-integrity", phase: "P4.8", pass: failed === 0 }, "intent-governance-integrity");

if (failed) process.exit(1);
console.log("\nIntent governance integrity passed");
