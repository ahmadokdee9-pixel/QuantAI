/**
 * P3.3 — Unified taste stability under staging apply.
 * Usage: npm run test:unified-stability
 */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { semanticRerankSearchResults } from "../lib/search/semanticReranker.ts";
import { buildUnifiedLiveSoakCanaryMeta } from "../lib/taste/unifiedTasteApply.ts";
import { buildVerticalTasteShadowMeta } from "../lib/taste/verticalTasteShadow.ts";
import { UNIFIED_LIVE_SOAK_PARTITIONS, checkUnifiedLiveSoakMetrics } from "./lib/unifiedLiveSoakPartitions.mjs";
import { saveValidationRun } from "./lib/validationHistory.mjs";

process.env.NODE_ENV = "development";
process.env.TASTE_UNIFIED_APPLY_ENABLED = "true";
process.env.TASTE_GRAMMAR_ENABLED = "false";
process.env.TASTE_FRAGRANCE_GRAMMAR_ENABLED = "false";
process.env.TASTE_FURNITURE_GRAMMAR_ENABLED = "false";
delete process.env.ENABLE_UNIFIED_CANARY;

function trayLinks(products) {
  return products.map((p) => p.link || p.title).join("|");
}

let failed = 0;
const results = [];

for (const part of UNIFIED_LIVE_SOAK_PARTITIONS) {
  const canonical = buildCanonicalQuery(part.query);
  const products = [...part.products];

  const runA = semanticRerankSearchResults(products, part.query, canonical);
  const runB = semanticRerankSearchResults(products, part.query, canonical);
  const runC = semanticRerankSearchResults(products, part.query, canonical);

  const stableAB = trayLinks(runA) === trayLinks(runB);
  const stableBC = trayLinks(runB) === trayLinks(runC);
  const shadow = buildVerticalTasteShadowMeta({ query: part.query, canonicalQuery: canonical, products: runA });
  const meta = buildUnifiedLiveSoakCanaryMeta({
    query: part.query,
    canonicalQuery: canonical,
    products: runA,
    tasteGrammarShadow: shadow,
    preOrderLinks: products.map((p) => p.link),
  });
  const monitor = checkUnifiedLiveSoakMetrics(meta);

  const ok = stableAB && stableBC && monitor.pass;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${part.id}`, { stableAB, stableBC, monitor: monitor.issues, meta });
  } else {
    console.log(`OK ${part.id} stable latency=${meta.latencyMs}ms drift=${meta.rankingDriftCount}`);
  }

  results.push({ id: part.id, pass: ok, stableAB, stableBC, meta, monitor });
}

const report = {
  suite: "unified-stability",
  phase: "P3.3",
  at: new Date().toISOString(),
  pass_rate_pct: Math.round((results.filter((r) => r.pass).length / results.length) * 100),
  ranking_deterministic_pct: Math.round((results.filter((r) => r.stableAB && r.stableBC).length / results.length) * 100),
  max_latency_ms: Math.max(0, ...results.map((r) => r.meta.latencyMs ?? 0)),
  results,
};

saveValidationRun(report, "unified-stability");

if (failed) process.exit(1);
console.log("\nUnified stability passed");
