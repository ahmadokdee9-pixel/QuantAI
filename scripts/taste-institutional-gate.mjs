/**
 * Phase 2.3 institutional CI gate — taste eval enforcement (no ranking apply).
 * Usage: node scripts/taste-institutional-gate.mjs
 * Run after: test:vertical-taste-shadow + test:taste-pollution
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const HISTORY = resolve(import.meta.dirname, "../.validation/history");

const THRESHOLDS = {
  taste_pollution_top5: Number(process.env.TASTE_POLLUTION_TOP5_MAX ?? 0),
  false_luxury_promoted: Number(process.env.FALSE_LUXURY_PROMOTED_MAX ?? 0),
  gaming_pollution_in_minimal: Number(process.env.TASTE_GAMING_POLLUTION_MINIMAL_MAX ?? 0),
  trust_cap_respected_min: Number(process.env.TASTE_TRUST_CAP_MIN ?? 100),
  aesthetic_intent_integrity_min: Number(process.env.TASTE_AESTHETIC_INTEGRITY_MIN ?? 88),
  semantic_lane_confidence_min: Number(process.env.TASTE_SEMANTIC_LANE_CONFIDENCE_MIN ?? 85),
  shadow_cpu_max_ms: Number(process.env.TASTE_SHADOW_CPU_MAX_MS ?? 12),
  snapshot_regression_max: Number(process.env.TASTE_SNAPSHOT_REGRESSION_MAX ?? 0),
  pass_rate_min: Number(process.env.TASTE_PASS_RATE_MIN ?? 90),
};

function loadLatest(suiteName) {
  if (!existsSync(HISTORY)) return null;
  const files = readdirSync(HISTORY)
    .filter((f) => f.includes(`__${suiteName}__`) && f.endsWith(".json"))
    .sort();
  if (!files.length) return null;
  const path = join(HISTORY, files[files.length - 1]);
  return { path, report: JSON.parse(readFileSync(path, "utf8")) };
}

const shadow = loadLatest("vertical-taste-shadow");
const pollution = loadLatest("taste-pollution");
const watchCanary = loadLatest("watch-taste-canary");

if (!shadow) {
  console.error("Missing vertical-taste-shadow history. Run: npm run test:vertical-taste-shadow");
  process.exit(1);
}
if (!pollution) {
  console.error("Missing taste-pollution history. Run: npm run test:taste-pollution");
  process.exit(1);
}

const s = shadow.report;
const p = pollution.report;

const checks = [
  {
    name: "taste_pollution_top5",
    ok: (p.taste_pollution_top5 ?? 0) <= THRESHOLDS.taste_pollution_top5,
    detail: `${p.taste_pollution_top5} (max ${THRESHOLDS.taste_pollution_top5})`,
  },
  {
    name: "false_luxury_promoted",
    ok: (p.false_luxury_promoted ?? p.false_aesthetic_promoted ?? 0) <= THRESHOLDS.false_luxury_promoted,
    detail: `${p.false_luxury_promoted ?? 0} (max ${THRESHOLDS.false_luxury_promoted})`,
  },
  {
    name: "gaming_pollution_in_minimal",
    ok: (p.gaming_pollution_in_minimal ?? 0) <= THRESHOLDS.gaming_pollution_in_minimal,
    detail: `${p.gaming_pollution_in_minimal ?? 0} (max ${THRESHOLDS.gaming_pollution_in_minimal})`,
  },
  {
    name: "trust_cap_respected",
    ok: (p.trust_cap_respected_pct ?? 0) >= THRESHOLDS.trust_cap_respected_min,
    detail: `${p.trust_cap_respected_pct}% (min ${THRESHOLDS.trust_cap_respected_min}%)`,
  },
  {
    name: "aesthetic_intent_integrity",
    ok: (s.aesthetic_intent_integrity_pct ?? 0) >= THRESHOLDS.aesthetic_intent_integrity_min,
    detail: `${s.aesthetic_intent_integrity_pct}% (min ${THRESHOLDS.aesthetic_intent_integrity_min}%)`,
  },
  {
    name: "semantic_lane_confidence",
    ok: (s.semantic_lane_confidence_pct ?? 0) >= THRESHOLDS.semantic_lane_confidence_min,
    detail: `${s.semantic_lane_confidence_pct}% (min ${THRESHOLDS.semantic_lane_confidence_min}%)`,
  },
  {
    name: "shadow_pass_rate",
    ok: (s.pass_rate_pct ?? 0) >= THRESHOLDS.pass_rate_min,
    detail: `${s.pass_rate_pct}% (min ${THRESHOLDS.pass_rate_min}%)`,
  },
  {
    name: "vertical_taste_shadow_cpu",
    ok: (s.maxShadowLatencyMs ?? 0) <= THRESHOLDS.shadow_cpu_max_ms,
    detail: `${s.maxShadowLatencyMs}ms (max ${THRESHOLDS.shadow_cpu_max_ms}ms)`,
  },
  {
    name: "apply_disabled_or_watch_only",
    ok:
      process.env.TASTE_GRAMMAR_ENABLED !== "true"
        ? s.applyEnabled !== true && p.trust_cap_respected_pct === 100
        : watchCanary
          ? (watchCanary.report.pollution_top5 ?? 0) === 0 &&
            (watchCanary.report.max_apply_delta ?? 99) <= 12
          : false,
    detail:
      process.env.TASTE_GRAMMAR_ENABLED === "true"
        ? watchCanary
          ? `canary pollution=${watchCanary.report.pollution_top5} maxDelta=${watchCanary.report.max_apply_delta}`
          : "TASTE_GRAMMAR_ENABLED but no watch-taste-canary history"
        : `shadow.apply=${s.applyEnabled}`,
  },
  {
    name: "snapshot_regression",
    ok: (s.regression?.regressionCount ?? 0) <= THRESHOLDS.snapshot_regression_max,
    detail: s.regression?.hasBaseline
      ? `${s.regression.regressionCount} regressions (max ${THRESHOLDS.snapshot_regression_max})`
      : "no baseline (first run)",
  },
];

console.log("Taste institutional gate (Phase 2.3)\n");
console.log(`shadow: ${shadow.path}`);
console.log(`pollution: ${pollution.path}\n`);

for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}: ${c.detail}`);
}

const allOk = checks.every((c) => c.ok);
if (!allOk) process.exit(1);
console.log("\nTaste institutional gate: PASS");
