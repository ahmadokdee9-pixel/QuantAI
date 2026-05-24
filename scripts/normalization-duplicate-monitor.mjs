#!/usr/bin/env node
/**
 * Live duplicate-collapse monitor — alerts when shadow metrics breach thresholds.
 * Usage: SEARCH_BASE_URL=... npm run normalization-duplicate-monitor
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { LIVE_GOLDEN_QUERIES } from "./lib/normalizationGoldenFixtures.mjs";

const BASE_URL = process.env.SEARCH_BASE_URL || "https://quant-ai-app.vercel.app";
const OUT_DIR = join(process.cwd(), "docs", "architecture-audit", "phase2-apply", "monitor");
const MAX_FALSE_COLLAPSE = Number(process.env.PHASE2_MAX_FALSE_COLLAPSE || 0);
const MIN_COVERAGE = Number(process.env.PHASE2_MIN_CANONICAL_COVERAGE || 0.85);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function probe(spec) {
  const url = `${BASE_URL.replace(/\/$/, "")}/api/search?q=${encodeURIComponent(spec.query)}`;
  const res = await fetch(url);
  const body = await res.json();
  const meta = body?.data?.meta ?? {};
  const prod = meta.normalizationProduction ?? {};
  const shadow = meta.normalizationShadowPostControlled ?? {};
  return {
    id: spec.id,
    ok: body?.success && prod.enabled,
    apply: prod.apply,
    falseCollapseIncidents: prod.falseCollapseIncidents ?? shadow.falseCollapseIncidents ?? 0,
    top3DuplicateReduction: prod.top3DuplicateReduction ?? 0,
    canonicalIdentityCoverage: prod.canonicalIdentityCoverage ?? 0,
    merchantDiversityDelta: prod.merchantDiversityDelta ?? 0,
    trayInvariant: (shadow.inputCount ?? 0) === (shadow.outputCount ?? 0),
    rankingMutation: meta.normalizationStage1?.rankingMutation === true,
  };
}

const alerts = [];
const rows = [];
for (let i = 0; i < LIVE_GOLDEN_QUERIES.length; i++) {
  const spec = LIVE_GOLDEN_QUERIES[i];
  const row = await probe(spec);
  rows.push(row);
  if (!row.ok) alerts.push({ id: spec.id, type: "shadow_disabled" });
  if (row.apply === true) alerts.push({ id: spec.id, type: "apply_enabled_unexpected" });
  if (row.rankingMutation) alerts.push({ id: spec.id, type: "ranking_mutation_detected" });
  if (!row.trayInvariant) alerts.push({ id: spec.id, type: "tray_size_changed" });
  if (row.falseCollapseIncidents > MAX_FALSE_COLLAPSE)
    alerts.push({ id: spec.id, type: "false_collapse", count: row.falseCollapseIncidents });
  if (row.canonicalIdentityCoverage < MIN_COVERAGE)
    alerts.push({ id: spec.id, type: "low_canonical_coverage", value: row.canonicalIdentityCoverage });
  if (i < LIVE_GOLDEN_QUERIES.length - 1) await sleep(1200);
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  alerts,
  rows,
  healthy: alerts.length === 0,
};

mkdirSync(OUT_DIR, { recursive: true });
const path = join(OUT_DIR, `duplicate-monitor-${Date.now()}.json`);
writeFileSync(path, JSON.stringify(report, null, 2));

for (const row of rows) {
  const status = alerts.some((a) => a.id === row.id) ? "ALERT" : "OK";
  console.log(
    `[${status}] ${row.id} falseCollapse=${row.falseCollapseIncidents} dupReduction=${row.top3DuplicateReduction} coverage=${row.canonicalIdentityCoverage}`
  );
}

console.log(`\nAlerts: ${alerts.length}`);
console.log(`Report: ${path}`);
if (alerts.length) process.exitCode = 1;
