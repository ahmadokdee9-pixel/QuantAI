#!/usr/bin/env node
/**
 * Production latency probe — guest search p50/p95 vs beta budgets.
 * Usage: SEARCH_BASE_URL=https://your-app.vercel.app npm run test:beta-latency-probe
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.env.SEARCH_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const QUERIES = (process.env.BETA_LATENCY_QUERIES || "iphone 16,airpods,gaming monitor,sofa,adidas samba")
  .split(",")
  .map((q) => q.trim())
  .filter(Boolean);
const INTERVAL_MS = Number(process.env.BETA_PROBE_INTERVAL_MS || "2500");
const P95_MAX_MS = Number(process.env.BETA_P95_MAX_MS || "8000");
const WARM_PASS = ["1", "true", "yes"].includes(
  String(process.env.BETA_PROBE_WARM ?? "").trim().toLowerCase()
);
const OUT_DIR = join(process.cwd(), "docs", "architecture-audit", "beta-launch");

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

async function probe(query) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/search?q=${encodeURIComponent(query)}`);
  const latencyMs = Date.now() - t0;
  let json = {};
  try {
    json = await res.json();
  } catch {
    /* */
  }
  const meta = json?.data?.meta ?? {};
  return {
    query,
    status: res.status,
    success: json?.success === true,
    latencyMs,
    products: (json?.data?.products ?? []).length,
    withinCold: meta.latencyBudget?.withinColdBudget,
    searchLatencyMs: meta.searchLatencyMs,
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const rows = [];
  const warmRows = [];
  for (const q of QUERIES) {
    rows.push(await probe(q));
    if (WARM_PASS) {
      await new Promise((r) => setTimeout(r, 800));
      warmRows.push(await probe(q));
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }

  const ok = rows.filter((r) => r.success && r.status === 200);
  const lats = ok.map((r) => r.latencyMs).sort((a, b) => a - b);
  const p50 = percentile(lats, 50);
  const p95 = percentile(lats, 95);
  const max = lats.length ? lats[lats.length - 1] : 0;

  const warmOk = warmRows.filter((r) => r.success && r.status === 200);
  const warmLats = warmOk.map((r) => r.latencyMs).sort((a, b) => a - b);
  const warmP50 = percentile(warmLats, 50);
  const warmP95 = percentile(warmLats, 95);

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    queryCount: QUERIES.length,
    successCount: ok.length,
    p50Ms: p50,
    p95Ms: p95,
    maxMs: max,
    warmPass: WARM_PASS,
    warmP50Ms: WARM_PASS ? warmP50 : null,
    warmP95Ms: WARM_PASS ? warmP95 : null,
    p95GateMs: P95_MAX_MS,
    p95Pass: p95 <= P95_MAX_MS,
    warmP95Pass: WARM_PASS ? warmP95 <= P95_MAX_MS : null,
    rows,
    warmRows: WARM_PASS ? warmRows : [],
  };

  const md = `# Beta latency probe

**Generated:** ${report.generatedAt}  
**Base URL:** ${BASE}

| Metric | Value | Gate |
|--------|------:|------|
| p50 | ${p50}ms | — |
| p95 (cold) | ${p95}ms | ≤ ${P95_MAX_MS}ms |
| max | ${max}ms | — |
| success | ${ok.length}/${QUERIES.length} | all OK |
${WARM_PASS ? `| p95 (warm) | ${warmP95}ms | ≤ ${P95_MAX_MS}ms |` : ""}

**Verdict (cold p95):** ${report.p95Pass ? "PASS" : "FAIL"}  
${WARM_PASS ? `**Verdict (warm p95):** ${report.warmP95Pass ? "PASS" : "FAIL"}` : ""}

## Per query (cold)

| Query | Status | ms | Products |
|-------|--------|---:|---------:|
${rows.map((r) => `| ${r.query} | ${r.status} | ${r.latencyMs} | ${r.products} |`).join("\n")}
${WARM_PASS ? `\n## Per query (warm)\n\n| Query | Status | ms | Products |\n|-------|--------|---:|---------:|\n${warmRows.map((r) => `| ${r.query} | ${r.status} | ${r.latencyMs} | ${r.products} |`).join("\n")}` : ""}
`;

  const jsonPath = join(OUT_DIR, "latency-probe.json");
  const mdPath = join(OUT_DIR, "LATENCY_PROBE_REPORT.md");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, md);

  console.log(`cold p50=${p50}ms p95=${p95}ms max=${max}ms`);
  if (WARM_PASS) console.log(`warm p50=${warmP50}ms p95=${warmP95}ms`);
  console.log(`Wrote ${mdPath}`);

  if (ok.length < QUERIES.length) {
    console.error("Some probes failed — check SerpAPI / rate limits");
    process.exit(1);
  }
  if (!report.p95Pass) {
    console.error(`p95 ${p95}ms exceeds beta gate ${P95_MAX_MS}ms`);
    process.exit(1);
  }
  console.log("Latency probe passed beta gate.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
