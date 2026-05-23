#!/usr/bin/env node
/**
 * Generate Stage 1 golden-query benchmark dashboard (HTML) from latest probe + offline benchmark.
 * Usage: npm run stage1-shadow-dashboard
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { GOLDEN_CASES } from "./lib/normalizationGoldenFixtures.mjs";

const ROOT = process.cwd();
const SAMPLE_DIR = join(ROOT, "docs", "architecture-audit", "stage1-shadow", "samples");
const BENCH_DIR = join(ROOT, "docs", "architecture-audit", "benchmarks");
const OUT_DIR = join(ROOT, "docs", "architecture-audit", "stage1-shadow", "dashboard");

function latestJson(dir, prefix) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
    .sort();
  if (!files.length) return null;
  return JSON.parse(readFileSync(join(dir, files[files.length - 1]), "utf8"));
}

const liveProbe = latestJson(SAMPLE_DIR, "stage1-live-probe-");
const offlineBench = latestJson(BENCH_DIR, "normalization-ranking-");

const aggregate = liveProbe?.aggregate ?? {
  generatedAt: null,
  avgRolloutReadinessScore: 0,
  avgTop3DuplicateRateBefore: 0,
  avgProjectedRankingLift: 0,
  avgCanonicalIdentityCoverage: 0,
  avgSemanticCoherenceScore: 0,
  latency: { p50: 0, p95: 0, p99: 0 },
  normalizationLatency: { p50: 0, p95: 0, p99: 0 },
};

const liveRows = liveProbe?.results ?? [];
const offlineRows = offlineBench?.offlineResults ?? [];

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function metricCard(title, value, sub = "") {
  return `<div class="card"><div class="label">${esc(title)}</div><div class="value">${esc(value)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}</div>`;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>QuantAI Stage 1 — Normalization Shadow Dashboard</title>
  <style>
    :root { --bg:#f8fafc; --ink:#0f172a; --muted:#64748b; --accent:#1e40af; --ok:#166534; --warn:#b45309; }
    * { box-sizing:border-box; }
    body { font-family: "Segoe UI", system-ui, sans-serif; margin:0; background:var(--bg); color:var(--ink); }
    header { background:linear-gradient(180deg,#fff,#f1f5f9); border-bottom:3px solid var(--accent); padding:28px 32px; }
    h1 { margin:0 0 6px; font-size:24px; }
    .meta { color:var(--muted); font-size:13px; }
    main { padding:24px 32px 48px; max-width:1200px; margin:0 auto; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px; margin:20px 0; }
    .card { background:#fff; border:1px solid #cbd5e1; border-radius:8px; padding:14px 16px; }
    .label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
    .value { font-size:22px; font-weight:700; margin-top:6px; }
    .sub { font-size:12px; color:var(--muted); margin-top:4px; }
    table { width:100%; border-collapse:collapse; background:#fff; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden; margin:16px 0 28px; font-size:13px; }
    th { background:var(--accent); color:#fff; text-align:left; padding:10px 12px; }
    td { border-top:1px solid #e2e8f0; padding:9px 12px; vertical-align:top; }
    tr:nth-child(even) td { background:#f8fafc; }
    h2 { font-size:17px; border-bottom:1px solid #cbd5e1; padding-bottom:6px; margin-top:28px; }
    .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:600; }
    .badge-ok { background:#dcfce7; color:var(--ok); }
    .badge-warn { background:#fef3c7; color:var(--warn); }
    footer { color:var(--muted); font-size:12px; margin-top:32px; }
  </style>
</head>
<body>
  <header>
    <h1>QuantAI Stage 1 — Normalization Shadow Dashboard</h1>
    <div class="meta">Commerce Intelligence OS · Shadow telemetry only (APPLY=false) · Generated ${esc(new Date().toISOString())}</div>
  </header>
  <main>
    <section>
      <h2>Rollout readiness (aggregate)</h2>
      <div class="grid">
        ${metricCard("Readiness score", `${round2(aggregate.avgRolloutReadinessScore)}/100`, "Target ≥85 for APPLY review")}
        ${metricCard("Top-3 dup rate (avg)", round4(aggregate.avgTop3DuplicateRateBefore), "Before normalization projection")}
        ${metricCard("Projected ranking lift", round4(aggregate.avgProjectedRankingLift), "If APPLY=true")}
        ${metricCard("Canonical ID coverage", pct(aggregate.avgCanonicalIdentityCoverage), "Target ≥85%")}
        ${metricCard("Semantic coherence", pct(aggregate.avgSemanticCoherenceScore), "Top-5 identity diversity")}
        ${metricCard("Search latency p95", `${aggregate.latency?.p95 ?? 0}ms`, `p99 ${aggregate.latency?.p99 ?? 0}ms`)}
        ${metricCard("Norm latency p95", `${aggregate.normalizationLatency?.p95 ?? 0}ms`, `p99 ${aggregate.normalizationLatency?.p99 ?? 0}ms`)}
        ${metricCard("False collapse incidents", aggregate.totalFalseCollapseIncidents ?? 0, "Target 0")}
      </div>
    </section>

    <section>
      <h2>Live golden queries (${liveRows.length})</h2>
      <table>
        <thead><tr>
          <th>Query</th><th>Shadow</th><th>Top3 Dup</th><th>Projected Lift</th><th>Eq Groups</th><th>Coverage</th><th>Semantic</th><th>Readiness</th><th>Latency</th>
        </tr></thead>
        <tbody>
          ${liveRows.map(rowHtml).join("") || "<tr><td colspan='9'>No live probe data — run npm run test:stage1-shadow-probe</td></tr>"}
        </tbody>
      </table>
    </section>

    <section>
      <h2>Offline golden fixtures (${offlineRows.length})</h2>
      <table>
        <thead><tr><th>Case</th><th>Status</th><th>Shadow top3Dup</th><th>Apply top3Dup</th><th>Projected lift</th></tr></thead>
        <tbody>
          ${offlineRows.map(offlineRowHtml).join("") || "<tr><td colspan='5'>No offline benchmark — run npm run test:normalization-ranking</td></tr>"}
        </tbody>
      </table>
    </section>

    <footer>
      Stage 1 config: QUANTAI_NORMALIZATION_ENABLED=true · MODE=shadow · APPLY=false · SHADOW_TELEMETRY=true<br/>
      Offline fixtures: ${GOLDEN_CASES.length} · Live queries: ${liveRows.length}
    </footer>
  </main>
</body>
</html>`;

mkdirSync(OUT_DIR, { recursive: true });
const outPath = join(OUT_DIR, "index.html");
writeFileSync(outPath, html, "utf8");
console.log(`Dashboard written: ${outPath}`);

function rowHtml(r) {
  if (r.error) return `<tr><td>${esc(r.query)}</td><td colspan="8">${esc(r.error)}</td></tr>`;
  const shadowOk = r.mode === "shadow" && r.apply === false;
  return `<tr>
    <td>${esc(r.query)}</td>
    <td><span class="badge ${shadowOk ? "badge-ok" : "badge-warn"}">${shadowOk ? "shadow" : esc(r.mode)}</span></td>
    <td>${round4(r.top3DuplicateRateBefore)}</td>
    <td>${round4(r.projectedRankingLift)}</td>
    <td>${r.equivalenceGroupCount ?? 0}</td>
    <td>${pct(r.canonicalIdentityCoverage)}</td>
    <td>${pct(r.semanticCoherenceScore)}</td>
    <td>${r.rolloutReadinessScore ?? "—"} (${esc(r.rolloutReadinessGrade ?? "")})</td>
    <td>${r.latencyMs ?? "—"}ms</td>
  </tr>`;
}

function offlineRowHtml(r) {
  return `<tr>
    <td>${esc(r.id)}</td>
    <td><span class="badge ${r.ok ? "badge-ok" : "badge-warn"}">${r.ok ? "PASS" : "FAIL"}</span></td>
    <td>${round4(r.metrics?.shadow?.top3DuplicateRate)}</td>
    <td>${round4(r.metrics?.apply?.top3DuplicateRate)}</td>
    <td>${round4(r.metrics?.apply?.rankingLiftEstimate)}</td>
  </tr>`;
}

function round2(n) { return Math.round((n ?? 0) * 100) / 100; }
function round4(n) { return Math.round((n ?? 0) * 10000) / 10000; }
function pct(n) { return n == null ? "—" : `${Math.round((n ?? 0) * 100)}%`; }
