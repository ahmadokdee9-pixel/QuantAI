/**
 * P4.6 — Integrity, trust preservation, suppression precision.
 * Usage: npm run test:intent-eval-integrity
 */
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { EVAL_CANARY_ENV, INTENT_LIVE_PARTITIONS, runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { isUnifiedTasteApplyEnabled } from "../lib/taste/unifiedTasteFlags.ts";

let failed = 0;
const rows = [];

if (isUnifiedTasteApplyEnabled()) {
  console.error("FAIL P3 apply must be OFF");
  process.exit(1);
}

for (const part of INTENT_LIVE_PARTITIONS) {
  const row = runIntentEvaluationPartition(part, EVAL_CANARY_ENV);
  const e = row.evaluation;
  const topLinks = row.onLinks.split("|").slice(0, 2);
  const pollutionTop2 = topLinks.some((link) => {
    const p = part.products.find((x) => x.link === link);
    return p && /\b(inspired|clone|hurry|temu)\b/i.test(`${p.title} ${p.store}`);
  });

  const ok =
    e.integrityScore >= 60 &&
    e.analytics.suppressionPrecision >= 50 &&
    e.analytics.trustedMerchantRetention >= 0 &&
    !pollutionTop2 &&
    row.observability.crossLayerContamination === false;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${part.id}`, {
      integrityScore: e.integrityScore,
      suppressionPrecision: e.analytics.suppressionPrecision,
      pollutionTop2,
    });
  } else {
    console.log(`OK ${part.id} integrity=${e.integrityScore} suppressionPrec=${e.analytics.suppressionPrecision}`);
  }
  rows.push({ id: part.id, pass: ok, evaluation: e });
}

saveLiveObservabilityRun(
  {
    suite: "intent-eval-integrity",
    phase: "P4.6",
    pass_rate_pct: Math.round((rows.filter((r) => r.pass).length / rows.length) * 100),
    results: rows,
  },
  "intent-eval-integrity"
);

if (failed) process.exit(1);
console.log("\nIntent eval integrity passed");
