/**
 * P4.7 — Adaptive optimization recommendation layer (advisory meta only).
 * Usage: npm run test:intent-optimization
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  aggregateIntentOptimizations,
  isIntentOptimizationAutonomousBlocked,
} from "../lib/intent/intentOptimizationEngine.ts";
import { INTENT_OPT_MIN_CONFIDENCE } from "../lib/intent/intentOptimizationFlags.ts";
import {
  isIntentApplyBlockedInProduction,
  isIntentIntelligenceApplyEnabled,
} from "../lib/intent/intentIntelligenceFlags.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { runIntentEvaluationPartitions } from "./lib/intentEvaluationRunner.mjs";

let failed = 0;

const rows = runIntentEvaluationPartitions();
const optRows = rows.map((r) => ({ trayId: r.trayId, optimization: r.optimization }));

for (const { trayId, optimization: o } of optRows) {
  const ok =
    o.version === "intent-optimization-v1" &&
    o.advisoryOnly === true &&
    o.autonomousApplyBlocked === true &&
    o.active &&
    o.confidence >= INTENT_OPT_MIN_CONFIDENCE &&
    o.reports.qualityScore >= 50 &&
    o.recommendations.every((rec) => rec.advisoryOnly === true);

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, {
      confidence: o.confidence,
      active: o.active,
      reports: o.reports,
      skippedReason: o.skippedReason,
    });
  } else {
    console.log(
      `OK ${trayId} risk=${o.riskLevel} confidence=${o.confidence} recs=${o.recommendations.length}`
    );
  }
}

const run1 = rows[0].optimization;
const run2 = runIntentEvaluationPartitions()[0].optimization;
if (JSON.stringify(run1) !== JSON.stringify(run2)) {
  failed += 1;
  console.error("FAIL optimization not deterministic");
} else {
  console.log("OK optimization deterministic across aggregate pass");
}

const agg = aggregateIntentOptimizations(optRows);
if (agg.recommendationCount < 1) {
  failed += 1;
  console.error("FAIL no recommendations emitted");
} else {
  console.log(`OK aggregate recs=${agg.recommendationCount} top=${agg.topRecommendations.join(", ")}`);
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("intentOptimization") || !route.includes("buildIntentOptimizationMeta")) {
  failed += 1;
  console.error("FAIL meta.intentOptimization not wired");
} else {
  console.log("OK meta.intentOptimization wired");
}

const savedProd = process.env.NODE_ENV;
const savedApply = process.env.INTENT_INTELLIGENCE_APPLY_ENABLED;
const savedProdApply = process.env.INTENT_INTELLIGENCE_PROD_APPLY;
const savedCanary = process.env.INTENT_INTELLIGENCE_CANARY_APPLY;
process.env.NODE_ENV = "production";
process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
delete process.env.INTENT_INTELLIGENCE_PROD_APPLY;
delete process.env.INTENT_INTELLIGENCE_CANARY_APPLY;
const applyOff = !isIntentIntelligenceApplyEnabled() && isIntentApplyBlockedInProduction();
if (savedProd === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = savedProd;
if (savedApply === undefined) delete process.env.INTENT_INTELLIGENCE_APPLY_ENABLED;
else process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = savedApply;
if (savedProdApply === undefined) delete process.env.INTENT_INTELLIGENCE_PROD_APPLY;
else process.env.INTENT_INTELLIGENCE_PROD_APPLY = savedProdApply;
if (savedCanary === undefined) delete process.env.INTENT_INTELLIGENCE_CANARY_APPLY;
else process.env.INTENT_INTELLIGENCE_CANARY_APPLY = savedCanary;

if (!applyOff || !isIntentOptimizationAutonomousBlocked()) {
  failed += 1;
  console.error("FAIL production apply or autonomous optimization not blocked", { applyOff });
} else {
  console.log("OK production apply OFF by default; autonomous optimization blocked");
}

const disabled = process.env.INTENT_OPTIMIZATION;
process.env.INTENT_OPTIMIZATION = "false";
const { buildIntentOptimizationMeta } = await import("../lib/intent/intentOptimizationEngine.ts");
const offMeta = buildIntentOptimizationMeta({
  evaluation: rows[0].evaluation,
});
process.env.INTENT_OPTIMIZATION = disabled;
if (offMeta.skippedReason !== "optimization_disabled") {
  failed += 1;
  console.error("FAIL INTENT_OPTIMIZATION=false", offMeta.skippedReason);
} else {
  console.log("OK INTENT_OPTIMIZATION=false disables meta");
}

console.log("\n--- P4.7 AGGREGATE ---");
console.log(JSON.stringify(agg, null, 2));

saveLiveObservabilityRun(
  {
    suite: "intent-optimization",
    phase: "P4.7",
    pass: failed === 0,
    aggregate: agg,
    advisoryOnly: true,
    autonomousApplyBlocked: true,
  },
  "intent-optimization"
);

if (failed) process.exit(1);
console.log("\nIntent optimization passed");
