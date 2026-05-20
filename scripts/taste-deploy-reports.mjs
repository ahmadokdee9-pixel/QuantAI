/**
 * Phase 2.3 deploy-safe taste reports (markdown + JSON).
 * Usage: node scripts/taste-deploy-reports.mjs
 */
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

const HISTORY = resolve(import.meta.dirname, "../.validation/history");
const REPORTS = resolve(import.meta.dirname, "../.validation/reports");

function loadLatest(suiteName) {
  if (!existsSync(HISTORY)) return null;
  const files = readdirSync(HISTORY)
    .filter((f) => f.includes(`__${suiteName}__`) && f.endsWith(".json"))
    .sort();
  if (!files.length) return null;
  return JSON.parse(readFileSync(join(HISTORY, files[files.length - 1]), "utf8"));
}

const shadow = loadLatest("vertical-taste-shadow");
const pollution = loadLatest("taste-pollution");

if (!shadow || !pollution) {
  console.error("Run test:vertical-taste-shadow and test:taste-pollution first.");
  process.exit(1);
}

mkdirSync(REPORTS, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

const semanticPollution = {
  title: "Semantic Pollution Report",
  at: shadow.at,
  taste_pollution_top5: pollution.taste_pollution_top5,
  gaming_pollution_in_minimal: pollution.gaming_pollution_in_minimal,
  false_luxury_promoted: pollution.false_luxury_promoted,
  failing_queries: (pollution.rows ?? []).filter((r) => !r.flagged).map((r) => r.query),
  snapshot_regressions: shadow.regression?.regressions ?? [],
};

const tasteIntegrity = {
  title: "Taste Integrity Report",
  at: shadow.at,
  aesthetic_intent_integrity_pct: shadow.aesthetic_intent_integrity_pct,
  semantic_lane_confidence_pct: shadow.semantic_lane_confidence_pct,
  trust_cap_respected_pct: pollution.trust_cap_respected_pct,
  apply_enabled: shadow.applyEnabled,
  cases_passed: shadow.cases_passed,
  cases_total: shadow.cases_total,
  failed_cases: (shadow.results ?? []).filter((r) => !r.pass).map((r) => r.name),
};

const verticalStability = {
  title: "Vertical Stability Report",
  at: shadow.at,
  by_vertical: {},
  snapshots_count: (shadow.snapshots ?? []).length,
};

for (const snap of shadow.snapshots ?? []) {
  const v = snap.vertical ?? "unknown";
  if (!verticalStability.by_vertical[v]) {
    verticalStability.by_vertical[v] = { count: 0, lanes: new Set(), avgFit: [] };
  }
  verticalStability.by_vertical[v].count += 1;
  if (snap.grammarLane) verticalStability.by_vertical[v].lanes.add(snap.grammarLane);
  if (snap.tasteTelemetry?.tasteFit != null) {
    verticalStability.by_vertical[v].avgFit.push(snap.tasteTelemetry.tasteFit);
  }
}
for (const v of Object.keys(verticalStability.by_vertical)) {
  const row = verticalStability.by_vertical[v];
  row.lanes = [...row.lanes];
  row.avgTasteFit =
    row.avgFit.length > 0
      ? Math.round((row.avgFit.reduce((a, b) => a + b, 0) / row.avgFit.length) * 100) / 100
      : null;
  delete row.avgFit;
}

const latencyImpact = {
  title: "Latency Impact Report",
  at: shadow.at,
  maxShadowCpuMs: shadow.maxShadowLatencyMs,
  shadow_budget_ms: 12,
  within_budget: (shadow.maxShadowLatencyMs ?? 0) <= 12,
  ranking_apply_enabled: shadow.applyEnabled === true,
  note: "Shadow pass only — no full-search latency coupling in P2.3",
};

const bundle = {
  generatedAt: new Date().toISOString(),
  semanticPollution,
  tasteIntegrity,
  verticalStability,
  latencyImpact,
};

const jsonPath = join(REPORTS, `${stamp}__taste-deploy-bundle.json`);
writeFileSync(jsonPath, JSON.stringify(bundle, null, 2));

const md = [
  "# QuantAI Taste Deploy Reports (P2.3)",
  "",
  `Generated: ${bundle.generatedAt}`,
  "",
  "## Semantic Pollution",
  `- taste_pollution_top5: **${semanticPollution.taste_pollution_top5}**`,
  `- gaming_pollution_in_minimal: **${semanticPollution.gaming_pollution_in_minimal}**`,
  `- false_luxury_promoted: **${semanticPollution.false_luxury_promoted}**`,
  `- snapshot regressions: **${semanticPollution.snapshot_regressions.length}**`,
  "",
  "## Taste Integrity",
  `- aesthetic_intent_integrity: **${tasteIntegrity.aesthetic_intent_integrity_pct}%**`,
  `- semantic_lane_confidence: **${tasteIntegrity.semantic_lane_confidence_pct}%**`,
  `- trust_cap_respected: **${tasteIntegrity.trust_cap_respected_pct}%**`,
  `- apply_enabled: **${tasteIntegrity.apply_enabled}**`,
  `- cases: **${tasteIntegrity.cases_passed}/${tasteIntegrity.cases_total}**`,
  "",
  "## Vertical Stability",
  ...Object.entries(verticalStability.by_vertical).map(
    ([v, row]) => `- **${v}**: ${row.count} snapshots, lanes=${row.lanes.join(", ")}, avgFit=${row.avgTasteFit}`
  ),
  "",
  "## Latency Impact",
  `- max shadow CPU: **${latencyImpact.maxShadowCpuMs}ms** (budget ${latencyImpact.shadow_budget_ms}ms)`,
  `- within_budget: **${latencyImpact.within_budget}**`,
  "",
].join("\n");

const mdPath = join(REPORTS, `${stamp}__taste-deploy-reports.md`);
writeFileSync(mdPath, md);

console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${mdPath}`);
