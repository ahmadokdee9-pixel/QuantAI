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
