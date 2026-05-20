/**
 * Phase 2.3 vertical taste shadow — full institutional coverage + regression snapshots.
 * Usage: npx --yes tsx scripts/evaluate-vertical-taste-shadow.mjs
 */
import { TASTE_EVAL_CASES } from "./lib/tasteEvalCases.mjs";
import {
  runTasteCase,
  aggregateTasteMetrics,
  compareTasteSnapshots,
} from "./lib/tasteEvalRunner.mjs";
import { loadPreviousRun, saveValidationRun } from "./lib/validationHistory.mjs";
import { isTasteGrammarApplyEnabled } from "../lib/taste/verticalTasteFlags.ts";
import { luxuryWatchIntent01 } from "../lib/search/luxuryWatchIntent.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";

let failed = 0;

function assert(name, ok, detail = "") {
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    console.log(`OK ${name}`);
  }
}

const results = [];
for (const c of TASTE_EVAL_CASES) {
  const row = runTasteCase(c);
  results.push(row);
  if (row.pass) {
    console.log(`OK ${c.name} lane=${row.shadow.grammarLane} fit=${row.shadow.tasteFit?.toFixed(2) ?? "n/a"} ms=${row.shadow.latencyMs}`);
  } else {
    failed += 1;
    console.error(`FAIL ${c.name}`, JSON.stringify({ lane: row.shadow.grammarLane, active: row.shadow.active, violations: row.shadow.violations }).slice(0, 200));
  }
}

const metrics = aggregateTasteMetrics(results);
const snapshots = results.map((r) => r.snapshot);

const previous = loadPreviousRun("vertical-taste-shadow");
const regression = compareTasteSnapshots({ snapshots }, previous?.report);

const report = {
  suite: "vertical-taste-shadow",
  at: new Date().toISOString(),
  ...metrics,
  snapshots,
  regression,
  results: results.map((r) => ({
    name: r.name,
    tags: r.tags,
    query: r.query,
    pass: r.pass,
    integrityOk: r.integrityOk,
    laneConfidenceOk: r.laneConfidenceOk,
  })),
};

const { file } = saveValidationRun(report, "vertical-taste-shadow");
console.log(`\nWrote ${file}`);
console.log(`cases ${metrics.cases_passed}/${metrics.cases_total} pass_rate=${metrics.pass_rate_pct}%`);
console.log(`aesthetic_intent_integrity=${metrics.aesthetic_intent_integrity_pct}%`);
console.log(`semantic_lane_confidence=${metrics.semantic_lane_confidence_pct}%`);
console.log(`gaming_pollution_in_minimal=${metrics.gaming_pollution_in_minimal}`);
console.log(`maxShadowLatencyMs=${metrics.maxShadowLatencyMs}`);

assert("apply_disabled", isTasteGrammarApplyEnabled() === false);
assert("watch_intent_parity", luxuryWatchIntent01(buildCanonicalQuery("luxury watch under 3000").semantic.envelope) >= 0.42);
assert("shadow_cpu_budget", metrics.maxShadowLatencyMs <= 12, `${metrics.maxShadowLatencyMs}ms`);
assert("cases_pass_rate", metrics.pass_rate_pct >= 90, `${metrics.pass_rate_pct}%`);
assert("aesthetic_integrity", metrics.aesthetic_intent_integrity_pct >= 88, `${metrics.aesthetic_intent_integrity_pct}%`);
assert("lane_confidence", metrics.semantic_lane_confidence_pct >= 85, `${metrics.semantic_lane_confidence_pct}%`);
assert("gaming_minimal_clean", metrics.gaming_pollution_in_minimal === 0, `${metrics.gaming_pollution_in_minimal}`);
assert("regression_snapshots", regression.regressionCount === 0 || !regression.hasBaseline, `${regression.regressionCount} snapshot regressions`);

if (failed) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}
console.log("\nVertical taste shadow eval passed");
