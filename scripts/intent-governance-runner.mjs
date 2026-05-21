/**
 * P4.8 — Governance validation runner entry (re-exports partition runner).
 * Usage: npx tsx scripts/intent-governance-runner.mjs
 */
import { runGovernancePartitions } from "./lib/intentGovernanceRunner.mjs";

const rows = runGovernancePartitions();
console.log(JSON.stringify(rows.map((r) => ({
  trayId: r.trayId,
  governanceScore: r.governance.governanceScore,
  blocked: r.governance.blockedPolicies,
})), null, 2));
