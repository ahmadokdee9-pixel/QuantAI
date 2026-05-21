/**
 * P4.5 — Canary health, isolation, observability continuity.
 * Usage: npm run test:intent-canary-health
 */
import {
  buildIntentCanaryMeta,
  setIntentCanarySessionKey,
} from "../lib/intent/intentCanaryController.ts";
import {
  INTENT_LIVE_PARTITIONS,
  observeIntentPartition,
} from "./lib/intentLiveObservabilityPartitions.mjs";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { applyCanaryEnv, restoreCanaryEnv, snapshotCanaryEnv } from "./lib/intentCanaryTestEnv.mjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const saved = snapshotCanaryEnv();
let failed = 0;
const rows = [];

try {
  applyCanaryEnv({ INTENT_CANARY_ROLLOUT_STAGE: "100" });

  for (const part of INTENT_LIVE_PARTITIONS) {
    const sessionKey = `user:canary-health-${part.id}`;
    setIntentCanarySessionKey(sessionKey);
    const row = observeIntentPartition(part, {
      NODE_ENV: "production",
      INTENT_INTELLIGENCE_APPLY_ENABLED: "true",
      INTENT_INTELLIGENCE_CANARY_APPLY: "true",
      INTENT_CANARY_ROLLOUT_STAGE: "100",
      TASTE_UNIFIED_APPLY_ENABLED: "false",
      TASTE_GRAMMAR_ENABLED: "false",
      TASTE_FRAGRANCE_GRAMMAR_ENABLED: "false",
      TASTE_FURNITURE_GRAMMAR_ENABLED: "false",
    });

    const canary = buildIntentCanaryMeta({
      sessionKey,
      observability: row.observability,
    });

    const ok =
      canary.version === "intent-canary-v1" &&
      canary.canaryPercentage === 100 &&
      canary.activationBuckets.inCanary &&
      canary.applyEligible &&
      canary.canaryHealthScore >= 60 &&
      canary.rollbackReadinessScore >= 50 &&
      row.observability.version === "intent-observability-v1" &&
      row.shadow.applyEnabled === false &&
      row.unified.meta.applyEnabled === false &&
      row.observability.driftCount <= 3;

    if (!ok) {
      failed += 1;
      console.error(`FAIL ${part.id}`, { canary, observability: row.observability });
    } else {
      console.log(
        `OK ${part.id} health=${canary.canaryHealthScore} quality=${canary.activationQualityScore} rollback=${canary.rollbackReadinessScore}`
      );
    }

    rows.push({ id: part.id, pass: ok, canary, observabilityIntegrity: row.observability.integrityPass });
  }

  const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
  if (!route.includes("intentCanary") || !route.includes("buildIntentCanaryMeta")) {
    failed += 1;
    console.error("FAIL intentCanary not wired in route");
  } else {
    console.log("OK meta.intentCanary wired");
  }

  applyCanaryEnv({ INTENT_CANARY_ROLLOUT_STAGE: "5" });
  const lowPct = buildIntentCanaryMeta({
    sessionKey: "user:canary-health-low",
    observability: rows[0]?.observability,
  });
  if (lowPct.canaryPercentage !== 5) {
    failed += 1;
    console.error("FAIL stage 5 percentage", lowPct.canaryPercentage);
  } else {
    console.log("OK staged 5% rollout metadata");
  }

  const report = {
    suite: "intent-canary-health",
    phase: "P4.5",
    at: new Date().toISOString(),
    pass_rate_pct: Math.round((rows.filter((r) => r.pass).length / rows.length) * 100),
    avg_health: Math.round(rows.reduce((s, r) => s + r.canary.canaryHealthScore, 0) / rows.length),
    rows,
    recommendation: failed === 0 ? "canary_health_operational" : "canary_health_degraded",
  };

  saveLiveObservabilityRun(report, "intent-canary-health");
} finally {
  setIntentCanarySessionKey(null);
  restoreCanaryEnv(saved);
}

if (failed) process.exit(1);
console.log("\nIntent canary health passed");
