/**
 * Institutional production validation gate — fails CI on infra, empty trays, luxury pollution.
 * Usage: node scripts/production-validation-gate.mjs
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const HISTORY = resolve(import.meta.dirname, "../.validation/history");
const MIN_PASS_PCT = Number(process.env.PHASE1_MIN_PASS_PCT || 90);
const MAX_LATENCY_MS = Number(process.env.PHASE1_MAX_LATENCY_MS || 22000);
const FITNESS_RX =
  /\b(galaxy\s+fit|fitbit|mi\s+band|smart\s+band|fitness\s+tracker|activity\s+tracker|amazfit\s+band)\b|galaxy\s+fit\d+/i;
const LUXURY_QUERY_RX =
  /\b(luxury|elegant|swiss|mechanical|prestige|rolex|omega|tag heuer|فخم|فاخر|شكلها\s*luxury)\b/i;

function loadLatest(suiteName) {
  if (!existsSync(HISTORY)) return null;
  const files = readdirSync(HISTORY)
    .filter((f) => f.includes(`__${suiteName}__`) && f.endsWith(".json"))
    .sort();
  if (!files.length) return null;
  const path = join(HISTORY, files[files.length - 1]);
  return { path, report: JSON.parse(readFileSync(path, "utf8")) };
}

const realworld = loadLatest("realworld");
const searchEval = loadLatest("search-eval");
const tastePollution = loadLatest("taste-pollution");
const tasteShadow = loadLatest("vertical-taste-shadow");

const TASTE_LATENCY_REGRESSION_MS = Number(process.env.TASTE_GATE_LATENCY_REGRESSION_MS || 200);

if (!realworld) {
  console.error("Missing realworld history. Run test:realworld first.");
  process.exit(1);
}

const report = realworld.report;
const rankable = (report.queries ?? []).filter((q) => !q.infrastructureFailure && q.pass !== null);
const passed = rankable.filter((q) => q.pass).length;
const passPct = rankable.length ? Math.round((passed / rankable.length) * 100) : 0;
const infra = (report.queries ?? []).filter((q) => q.infrastructureFailure).length;
const emptyCritical = rankable.filter(
  (q) => q.productCount === 0 && ["exact_sku", "alternative"].includes(q.intent)
).length;

const luxuryHighFailures = (report.queries ?? []).filter((q) =>
  (q.failures ?? []).some(
    (f) => f.code === "luxury_watch_fitness_pollution" && (f.severity === "high" || f.severity === "critical")
  )
).length;

const latencies = (report.queries ?? [])
  .filter((q) => !q.infrastructureFailure && typeof q.latencyMs === "number")
  .map((q) => q.latencyMs);
const maxLatency = latencies.length ? Math.max(...latencies) : 0;
const p95Latency =
  latencies.length > 0
    ? [...latencies].sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)] ?? maxLatency
    : 0;

let searchEvalLuxuryFails = 0;
if (searchEval) {
  for (const row of searchEval.report.queries ?? []) {
    if (row.issues?.includes("fitness_pollution_top5") || row.issues?.includes("weak_luxury_watch_alignment")) {
      searchEvalLuxuryFails += 1;
    }
  }
}

let falseAesthetic = 0;
let trustCapPct = 100;
let tastePollutionTop5 = 0;
if (tastePollution) {
  falseAesthetic = tastePollution.report.false_aesthetic_promoted ?? 0;
  trustCapPct = tastePollution.report.trust_cap_respected_pct ?? 100;
  tastePollutionTop5 = tastePollution.report.taste_pollution_top5 ?? 0;
}

const priorRealworld = existsSync(HISTORY)
  ? readdirSync(HISTORY)
      .filter((f) => f.includes("__realworld__") && f.endsWith(".json"))
      .sort()
  : [];
let baselineP95 = null;
if (priorRealworld.length >= 2) {
  const prev = JSON.parse(readFileSync(join(HISTORY, priorRealworld[priorRealworld.length - 2]), "utf8"));
  const lat = (prev.queries ?? [])
    .filter((q) => !q.infrastructureFailure && typeof q.latencyMs === "number")
    .map((q) => q.latencyMs);
  if (lat.length) baselineP95 = [...lat].sort((a, b) => a - b)[Math.floor(lat.length * 0.95)];
}

const latencyRegressionOk =
  baselineP95 == null ? true : p95Latency <= baselineP95 + TASTE_LATENCY_REGRESSION_MS;

const checks = [
  { name: "pass_rate", ok: passPct >= MIN_PASS_PCT, detail: `${passPct}% (min ${MIN_PASS_PCT}%)` },
  { name: "infrastructure_skips", ok: infra === 0, detail: `${infra} skips` },
  { name: "critical_empty_trays", ok: emptyCritical === 0, detail: `${emptyCritical} empty` },
  {
    name: "luxury_watch_fitness_pollution",
    ok: luxuryHighFailures === 0,
    detail: `${luxuryHighFailures} high-severity luxury pollution queries`,
  },
  {
    name: "search_eval_luxury_lane",
    ok: searchEvalLuxuryFails === 0,
    detail: searchEval ? `${searchEvalLuxuryFails} failing luxury eval cases` : "no search-eval history (skipped)",
  },
  {
    name: "latency_p95_budget",
    ok: p95Latency <= MAX_LATENCY_MS,
    detail: `p95=${p95Latency}ms max=${maxLatency}ms (budget ${MAX_LATENCY_MS}ms)`,
  },
  {
    name: "taste_latency_regression",
    ok: latencyRegressionOk,
    detail:
      baselineP95 != null
        ? `p95=${p95Latency}ms baseline=${baselineP95}ms (+${TASTE_LATENCY_REGRESSION_MS}ms max)`
        : "no baseline",
  },
  {
    name: "false_aesthetic_promoted",
    ok: tastePollution ? falseAesthetic === 0 : true,
    detail: tastePollution ? `${falseAesthetic} promoted (alias)` : "no taste-pollution history (run test:taste-pollution)",
  },
  {
    name: "trust_cap_respected",
    ok: tastePollution ? trustCapPct >= 100 : true,
    detail: tastePollution ? `${trustCapPct}%` : "no taste-pollution history",
  },
  {
    name: "taste_pollution_top5",
    ok: tastePollution ? tastePollutionTop5 === 0 : true,
    detail: tastePollution ? `${tastePollutionTop5} unflagged pollution rows` : "no taste-pollution history",
  },
  {
    name: "vertical_taste_shadow_cpu",
    ok: !tasteShadow || (tasteShadow.report.maxShadowLatencyMs ?? 0) <= 12,
    detail: tasteShadow
      ? `maxShadow=${tasteShadow.report.maxShadowLatencyMs}ms`
      : "no shadow history (run test:vertical-taste-shadow)",
  },
  {
    name: "aesthetic_intent_integrity",
    ok: !tasteShadow || (tasteShadow.report.aesthetic_intent_integrity_pct ?? 0) >= 88,
    detail: tasteShadow
      ? `${tasteShadow.report.aesthetic_intent_integrity_pct}%`
      : "no shadow history",
  },
  {
    name: "semantic_lane_confidence",
    ok: !tasteShadow || (tasteShadow.report.semantic_lane_confidence_pct ?? 0) >= 85,
    detail: tasteShadow
      ? `${tasteShadow.report.semantic_lane_confidence_pct}%`
      : "no shadow history",
  },
  {
    name: "gaming_pollution_in_minimal",
    ok: !tastePollution || (tastePollution.report.gaming_pollution_in_minimal ?? 0) === 0,
    detail: tastePollution
      ? `${tastePollution.report.gaming_pollution_in_minimal} in minimal lanes`
      : "no taste-pollution history",
  },
  {
    name: "false_luxury_promoted",
    ok: tastePollution ? (tastePollution.report.false_luxury_promoted ?? 0) === 0 : true,
    detail: tastePollution
      ? `${tastePollution.report.false_luxury_promoted ?? 0} promoted`
      : "no taste-pollution history",
  },
  {
    name: "regression_delta",
    ok: !report.regression?.hasBaseline || (report.regression?.summary?.regressionCount ?? 0) <= 3,
    detail: report.regression?.hasBaseline
      ? `${report.regression.summary.regressionCount} regressions`
      : "no baseline",
  },
];

console.log(`Production validation gate — ${realworld.path}\n`);
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}: ${c.detail}`);
}

const luxurySpot = (report.queries ?? []).filter((q) => LUXURY_QUERY_RX.test(q.query));
console.log("\n--- Luxury watch spot check (top 5) ---");
for (const q of luxurySpot) {
  const top = (q.topTitles ?? []).slice(0, 5);
  const fitness = top.filter((t) => FITNESS_RX.test(t.title ?? "")).length;
  console.log(`${q.query}: products=${q.productCount} fitness_in_top5=${fitness} pass=${q.pass}`);
  for (const t of top.slice(0, 3)) console.log(`  → ${t.title}`);
}

const allOk = checks.every((c) => c.ok);
if (!allOk) process.exit(1);
console.log("\nProduction validation gate: PASS");
