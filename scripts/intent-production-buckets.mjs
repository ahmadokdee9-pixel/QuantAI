/**
 * P4.5 — Deterministic production bucket stability.
 * Usage: npm run test:intent-production-buckets
 */
import {
  hashSessionToBucket,
  isSessionInCanaryBucket,
  resolveCanaryPercentage,
  buildActivationBuckets,
} from "../lib/intent/intentCanaryController.ts";
import { INTENT_CANARY_STAGES } from "../lib/intent/intentCanaryFlags.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { applyCanaryEnv, restoreCanaryEnv, snapshotCanaryEnv } from "./lib/intentCanaryTestEnv.mjs";

const saved = snapshotCanaryEnv();
let failed = 0;

try {
  applyCanaryEnv({ INTENT_CANARY_ROLLOUT_STAGE: "10" });

  const sessions = Array.from({ length: 200 }, (_, i) => `user:stability-test-${i}`);
  const buckets = sessions.map((s) => hashSessionToBucket(s));
  const rerun = sessions.map((s) => hashSessionToBucket(s));

  for (let i = 0; i < sessions.length; i += 1) {
    if (buckets[i] !== rerun[i]) {
      failed += 1;
      console.error(`FAIL bucket unstable ${sessions[i]}`);
      break;
    }
  }
  if (failed === 0) console.log("OK bucket hashing stable across 200 sessions");

  const pct = resolveCanaryPercentage();
  if (pct !== 10) {
    failed += 1;
    console.error(`FAIL stage 10 resolved to ${pct}`);
  } else {
    console.log("OK rollout stage 10 → 10%");
  }

  const inCanary = sessions.filter((s) => isSessionInCanaryBucket(s)).length;
  const expectedApprox = Math.round(sessions.length * 0.1);
  const tolerance = 12;
  if (Math.abs(inCanary - expectedApprox) > tolerance) {
    failed += 1;
    console.error(`FAIL bucket distribution ${inCanary}/200 expected ~${expectedApprox}`);
  } else {
    console.log(`OK ~10% bucket assignment ${inCanary}/200`);
  }

  const stageChecks = [];
  for (const stage of INTENT_CANARY_STAGES) {
    applyCanaryEnv({ INTENT_CANARY_ROLLOUT_STAGE: String(stage) });
    const active = buildActivationBuckets("user:stage-probe").activeBuckets;
    stageChecks.push({ stage, active, pass: active === stage });
    if (active !== stage) {
      failed += 1;
      console.error(`FAIL stage ${stage}% activeBuckets=${active}`);
    } else {
      console.log(`OK stage ${stage}% → activeBuckets=${active}`);
    }
  }

  const report = {
    suite: "intent-production-buckets",
    phase: "P4.5",
    at: new Date().toISOString(),
    bucket_stable: failed === 0,
    in_canary_count: inCanary,
    stage_checks: stageChecks,
    recommendation: failed === 0 ? "buckets_deterministic" : "bucket_regression",
  };

  saveLiveObservabilityRun(report, "intent-production-buckets");
} finally {
  restoreCanaryEnv(saved);
}

if (failed) process.exit(1);
console.log("\nIntent production buckets passed");
