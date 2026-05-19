/**
 * Phase 1 exit criteria reporter — reads latest validation history.
 * Usage: node scripts/phase1-exit-check.mjs
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const HISTORY = resolve(import.meta.dirname, "../.validation/history");
const MIN_PASS_PCT = Number(process.env.PHASE1_MIN_PASS_PCT || 90);

function loadLatestRealworld() {
  if (!existsSync(HISTORY)) return null;
  const files = readdirSync(HISTORY)
    .filter((f) => f.includes("__realworld__") && f.endsWith(".json"))
    .sort();
  if (!files.length) return null;
  const path = join(HISTORY, files[files.length - 1]);
  return { path, report: JSON.parse(readFileSync(path, "utf8")) };
}

const latest = loadLatestRealworld();
if (!latest) {
  console.log("No realworld validation history found. Run: SEARCH_BASE_URL=... npm run test:realworld");
  process.exit(0);
}

const { report } = latest;
const rankable = (report.queries ?? []).filter((q) => !q.infrastructureFailure && q.pass !== null);
const passed = rankable.filter((q) => q.pass).length;
const passPct = rankable.length ? Math.round((passed / rankable.length) * 100) : 0;
const infra = (report.queries ?? []).filter((q) => q.infrastructureFailure).length;
const emptyCritical = rankable.filter(
  (q) => q.productCount === 0 && ["exact_sku", "alternative"].includes(q.intent)
).length;

const luxuryPollution = (report.queries ?? []).filter((q) =>
  (q.failures ?? []).some((f) => f.code === "luxury_watch_fitness_pollution" && f.severity === "high")
).length;

const checks = [
  { name: "pass_rate", ok: passPct >= MIN_PASS_PCT, detail: `${passPct}% (min ${MIN_PASS_PCT}%)` },
  { name: "infrastructure_skips", ok: infra === 0, detail: `${infra} skips` },
  { name: "critical_empty_trays", ok: emptyCritical === 0, detail: `${emptyCritical} empty` },
  {
    name: "luxury_watch_fitness_pollution",
    ok: luxuryPollution === 0,
    detail: `${luxuryPollution} high-severity luxury pollution queries`,
  },
  {
    name: "regression_delta",
    ok: !report.regression?.hasBaseline || (report.regression?.summary?.regressionCount ?? 0) <= 2,
    detail: report.regression?.hasBaseline
      ? `${report.regression.summary.regressionCount} regressions vs prior deploy`
      : "no baseline",
  },
];

console.log(`Phase 1 exit check — ${latest.path}\n`);
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}: ${c.detail}`);
}

const allOk = checks.every((c) => c.ok);
if (!allOk) process.exit(1);
console.log("\nPhase 1 exit criteria: READY FOR REVIEW (production sign-off still required)");
