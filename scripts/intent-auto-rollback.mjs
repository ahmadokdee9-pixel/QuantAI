/**
 * P4.5 — Automatic rollback trigger verification.
 * Usage: npm run test:intent-auto-rollback
 */
import {
  buildIntentCanaryMeta,
  evaluateCanarySafeguards,
  isIntentIntelligenceApplyEnabled,
  setIntentCanarySessionKey,
} from "../lib/intent/intentCanaryController.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { applyCanaryEnv, restoreCanaryEnv, snapshotCanaryEnv } from "./lib/intentCanaryTestEnv.mjs";

const saved = snapshotCanaryEnv();
let failed = 0;

try {
  applyCanaryEnv({ INTENT_CANARY_ROLLOUT_STAGE: "100" });

  const driftBlock = evaluateCanarySafeguards({
    driftCount: 4,
    instabilityWarnings: [],
    suppressionRate: 0.2,
    integrityPass: true,
    rollbackWarning: false,
    overSuppression: false,
  });
  if (!driftBlock.autoRollbackTriggered || !driftBlock.blocked) {
    failed += 1;
    console.error("FAIL drift ceiling auto-rollback", driftBlock);
  } else {
    console.log("OK drift ceiling triggers auto-rollback");
  }

  const instabilityBlock = evaluateCanarySafeguards({
    driftCount: 1,
    instabilityWarnings: ["a", "b", "c", "d", "e"],
    suppressionRate: 0.2,
    integrityPass: false,
    rollbackWarning: false,
    overSuppression: false,
  });
  if (!instabilityBlock.instabilityAutoDisable || !instabilityBlock.blocked) {
    failed += 1;
    console.error("FAIL instability auto-disable", instabilityBlock);
  } else {
    console.log("OK instability auto-disable");
  }

  const suppressionWarn = evaluateCanarySafeguards({
    driftCount: 0,
    instabilityWarnings: [],
    suppressionRate: 0.9,
    integrityPass: true,
    rollbackWarning: false,
    overSuppression: true,
  });
  if (!suppressionWarn.suppressionAnomalyWarning) {
    failed += 1;
    console.error("FAIL suppression anomaly warning");
  } else {
    console.log("OK suppression anomaly warning");
  }

  applyCanaryEnv({ INTENT_CANARY_EMERGENCY_DISABLE: "true", INTENT_CANARY_ROLLOUT_STAGE: "100" });
  setIntentCanarySessionKey("user:emergency-test");
  if (isIntentIntelligenceApplyEnabled()) {
    failed += 1;
    console.error("FAIL emergency disable should block apply");
  } else {
    console.log("OK emergency disable blocks apply");
  }

  const meta = buildIntentCanaryMeta({
    sessionKey: "user:emergency-test",
    observability: {
      driftCount: 0,
      instabilityWarnings: [],
      suppressionRate: 0.2,
      integrityPass: true,
      rollbackWarning: false,
      overSuppression: false,
      confidenceDistribution: { low: 0, medium: 0, high: 1 },
      avgDelta: 2,
    },
  });
  if (!meta.emergencyDisable) {
    failed += 1;
    console.error("FAIL canary meta emergencyDisable");
  } else {
    console.log("OK meta.intentCanary emergencyDisable");
  }

  applyCanaryEnv({ INTENT_INTELLIGENCE_APPLY_ENABLED: "false", INTENT_CANARY_EMERGENCY_DISABLE: "false" });
  setIntentCanarySessionKey("user:hard-rollback");
  if (isIntentIntelligenceApplyEnabled()) {
    failed += 1;
    console.error("FAIL hard rollback");
  } else {
    console.log("OK INTENT_INTELLIGENCE_APPLY_ENABLED=false rollback");
  }

  saveLiveObservabilityRun(
    {
      suite: "intent-auto-rollback",
      phase: "P4.5",
      pass: failed === 0,
      drift_block: driftBlock,
      instability_block: instabilityBlock,
      suppression_warn: suppressionWarn,
      recommendation: failed === 0 ? "auto_rollback_operational" : "auto_rollback_fail",
    },
    "intent-auto-rollback"
  );
} finally {
  setIntentCanarySessionKey(null);
  restoreCanaryEnv(saved);
}

if (failed) process.exit(1);
console.log("\nIntent auto-rollback passed");
