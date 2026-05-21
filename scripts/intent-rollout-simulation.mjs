/**
 * P4.5 — Staged rollout simulation (1% → 100%).
 * Usage: npm run test:intent-rollout-simulation
 */
import {
  hashSessionToBucket,
  isSessionInCanaryBucket,
  setIntentCanarySessionKey,
} from "../lib/intent/intentCanaryController.ts";
import { isIntentIntelligenceApplyEnabled } from "../lib/intent/intentIntelligenceFlags.ts";
import { INTENT_CANARY_STAGES } from "../lib/intent/intentCanaryFlags.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { applyCanaryEnv, restoreCanaryEnv, snapshotCanaryEnv } from "./lib/intentCanaryTestEnv.mjs";

const SESSIONS = Array.from({ length: 500 }, (_, i) => `user:rollout-sim-${i}`);
const saved = snapshotCanaryEnv();
let failed = 0;
const stages = [];

try {
  applyCanaryEnv();

  let monotonicOk = true;
  let prevCount = -1;

  for (const stage of INTENT_CANARY_STAGES) {
    applyCanaryEnv({ INTENT_CANARY_ROLLOUT_STAGE: String(stage) });
    const inCanary = SESSIONS.filter((s) => isSessionInCanaryBucket(s)).length;
    const enabled = SESSIONS.filter((s) => {
      setIntentCanarySessionKey(s);
      return isIntentIntelligenceApplyEnabled(s);
    }).length;

    if (inCanary < prevCount) monotonicOk = false;
    prevCount = inCanary;

    const pass = enabled === inCanary;
    if (!pass) {
      failed += 1;
      console.error(`FAIL stage ${stage}% enabled=${enabled} inCanary=${inCanary}`);
    } else {
      console.log(`OK stage ${stage}% enabled=${enabled}/${SESSIONS.length}`);
    }

    stages.push({ stage, inCanary, enabled, pass });
  }

  if (!monotonicOk) {
    failed += 1;
    console.error("FAIL rollout not monotonic across stages");
  } else {
    console.log("OK monotonic bucket growth across stages");
  }

  applyCanaryEnv({ INTENT_CANARY_ROLLOUT_STAGE: "100" });
  const allIn = SESSIONS.every((s) => isSessionInCanaryBucket(s));
  if (!allIn) {
    failed += 1;
    console.error("FAIL 100% stage should include all buckets");
  } else {
    console.log("OK 100% stage full activation");
  }

  const report = {
    suite: "intent-rollout-simulation",
    phase: "P4.5",
    at: new Date().toISOString(),
    session_count: SESSIONS.length,
    monotonic_ok: monotonicOk,
    stages,
    recommendation: failed === 0 ? "rollout_simulation_pass" : "rollout_simulation_fail",
  };

  saveLiveObservabilityRun(report, "intent-rollout-simulation");
} finally {
  setIntentCanarySessionKey(null);
  restoreCanaryEnv(saved);
}

if (failed) process.exit(1);
console.log("\nIntent rollout simulation passed");
