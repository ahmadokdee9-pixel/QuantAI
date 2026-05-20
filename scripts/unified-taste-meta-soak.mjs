/**
 * Phase 3.1A — Unified meta soak (read-only telemetry; apply MUST stay off).
 * Usage: npx --yes tsx scripts/unified-taste-meta-soak.mjs
 * Optional live: SEARCH_BASE_URL=http://localhost:3000 npm run test:unified-taste-meta-soak
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { semanticRerankSearchResults } from "../lib/search/semanticReranker.ts";
import { buildVerticalTasteShadowMeta } from "../lib/taste/verticalTasteShadow.ts";
import { computeUnifiedTasteSignals } from "../lib/taste/unifiedTasteIdentity.ts";
import { TASTE_GRAMMAR_PIPELINE_CACHE_KEY } from "../lib/taste/verticalTasteFlags.ts";
import { isUnifiedTasteApplyEnabled } from "../lib/taste/unifiedTasteFlags.ts";
import { saveValidationRun } from "./lib/validationHistory.mjs";

const MOCK = (title, store = "Store", price = 320) => ({
  title,
  store,
  price,
  link: `https://x/${title.slice(0, 10).replace(/\s/g, "-")}`,
  extensions: [],
  rating: 4.2,
});

const SOAK_QUERIES = [
  { id: "watch_luxury", vertical: "watch", query: "luxury watch under 3000", expectActive: true },
  { id: "watch_quiet_luxury", vertical: "watch", query: "elegant swiss dress watch quiet luxury", expectActive: true, expectIdentity: "quiet_luxury" },
  { id: "watch_mechanical", vertical: "watch", query: "premium mechanical watch", expectActive: true },
  { id: "fragrance_designer", vertical: "fragrance", query: "yves saint laurent libre edp 90ml", expectActive: true, expectIdentity: "quiet_luxury" },
  { id: "fragrance_haute", vertical: "fragrance", query: "niche artisan haute parfum extrait", expectActive: true, expectIdentity: "haute_collector" },
  { id: "furniture_minimal", vertical: "furniture", query: "minimal desk setup", expectActive: true, expectIdentity: "institutional_minimal" },
  { id: "furniture_oak", vertical: "furniture", query: "minimal oak desk setup clean", expectActive: true, expectIdentity: "institutional_minimal" },
  { id: "furniture_executive", vertical: "furniture", query: "executive ergonomic workspace", expectActive: true, expectIdentity: "executive_premium" },
  { id: "furniture_architectural", vertical: "furniture", query: "architectural office minimal designer desk", expectActive: true, expectIdentity: "architectural_modern" },
  { id: "cross_vertical_quiet", vertical: "cross", query: "quiet luxury minimal office watch aesthetic", expectActive: true, minCrossVertical: 0.5 },
  { id: "cross_vertical_prestige", vertical: "cross", query: "executive premium workspace designer fragrance", expectActive: true, minCrossVertical: 0.45 },
  { id: "control_electronics", vertical: "control", query: "best premium headphones for focus", expectActive: false },
  { id: "control_phone", vertical: "control", query: "iphone 15 pro max titanium", expectActive: false },
];

const POLLUTION_TRAYS = [
  {
    id: "minimal_gaming_leak",
    query: "minimal desk setup",
    good: MOCK("Oak Standing Desk Matte Cable Management Minimal"),
    bad: MOCK("RGB Gaming Chair Racer LED Gamer Recliner"),
  },
  {
    id: "watch_fitness_leak",
    query: "elegant swiss dress watch quiet luxury",
    good: MOCK("Tissot Gentleman Powermatic Dress Watch Swiss"),
    bad: MOCK("Casio Fitness Smart Watch Step Counter"),
  },
];

process.env.TASTE_UNIFIED_APPLY_ENABLED = "false";
process.env.TASTE_GRAMMAR_ENABLED = "false";
process.env.TASTE_FRAGRANCE_GRAMMAR_ENABLED = "false";
process.env.TASTE_FURNITURE_GRAMMAR_ENABLED = "false";

function trayLinks(products) {
  return products.map((p) => p.link || p.title);
}

function rankingParity(query, products, canonical) {
  const a = semanticRerankSearchResults([...products], query, canonical);
  const b = semanticRerankSearchResults([...products], query, canonical);
  return trayLinks(a).join("|") === trayLinks(b).join("|");
}

let failed = 0;
const results = [];
const issues = [];

if (isUnifiedTasteApplyEnabled()) {
  console.error("FAIL unified apply flag is ON — soak requires TASTE_UNIFIED_APPLY_ENABLED=false");
  process.exit(1);
}

for (const q of SOAK_QUERIES) {
  const canonical = buildCanonicalQuery(q.query);
  const products = [
    MOCK(`${q.query} premium listing A`, "A", 400),
    MOCK(`${q.query} alternative listing B`, "B", 280),
    MOCK(`${q.query} value listing C`, "C", 190),
  ];
  const shadow = buildVerticalTasteShadowMeta({ query: q.query, canonicalQuery: canonical, products });
  const run1 = computeUnifiedTasteSignals({ query: q.query, canonicalQuery: canonical, products, tasteGrammarShadow: shadow });
  const run2 = computeUnifiedTasteSignals({ query: q.query, canonicalQuery: canonical, products, tasteGrammarShadow: shadow });
  const m = run1.meta;

  const identityStable = run1.meta.identity === run2.meta.identity;
  const rankingStable = rankingParity(q.query, products, canonical);

  const ok =
    m.applyEnabled === false &&
    identityStable &&
    rankingStable &&
    m.latencyMs <= 15 &&
    (q.expectActive
      ? m.active &&
        m.confidence >= 0.4 &&
        m.coherenceScore >= 0.55 &&
        m.prestigeIntegrity >= 0.68 &&
        !m.skippedReason
      : !m.active && Boolean(m.skippedReason)) &&
    (q.expectIdentity == null || m.identity === q.expectIdentity) &&
    (q.minCrossVertical == null || m.crossVerticalAlignment >= q.minCrossVertical);

  if (!ok) {
    failed += 1;
    issues.push({ id: q.id, reason: "soak_case_fail", meta: m, identityStable, rankingStable });
    console.error(`FAIL ${q.id}`, { active: m.active, identity: m.identity, skipped: m.skippedReason, identityStable, rankingStable });
  } else {
    console.log(
      `OK ${q.id} identity=${m.identity ?? "—"} coherence=${m.coherenceScore} prestige=${m.prestigeIntegrity} cross=${m.crossVerticalAlignment} latency=${m.latencyMs}ms`
    );
  }

  results.push({
    id: q.id,
    vertical: q.vertical,
    query: q.query,
    pass: ok,
    identityStable,
    rankingStable,
    meta: m,
  });
}

let pollutionLeakage = 0;
for (const tray of POLLUTION_TRAYS) {
  const canonical = buildCanonicalQuery(tray.query);
  const products = [tray.good, tray.bad];
  const shadow = buildVerticalTasteShadowMeta({ query: tray.query, canonicalQuery: canonical, products });
  const reranked = semanticRerankSearchResults(products, tray.query, canonical);
  const signals = computeUnifiedTasteSignals({ query: tray.query, canonicalQuery: canonical, products: reranked, tasteGrammarShadow: shadow });
  const top = reranked[0]?.title ?? "";
  const pollutionInTop = /gaming|rgb|fitness|smart watch/i.test(top);
  const prestigeOk = signals.meta.prestigeIntegrity >= 0.68;

  if (pollutionInTop || !prestigeOk) {
    failed += 1;
    pollutionLeakage += 1;
    issues.push({ id: tray.id, pollutionInTop, prestige: signals.meta.prestigeIntegrity, top });
    console.error(`FAIL pollution ${tray.id}`, { top, prestige: signals.meta.prestigeIntegrity });
  } else {
    console.log(`OK pollution ${tray.id} top="${top.slice(0, 48)}" prestige=${signals.meta.prestigeIntegrity}`);
  }
}

const cacheKeyOk =
  TASTE_GRAMMAR_PIPELINE_CACHE_KEY.includes("unified-live-soak") ||
  (TASTE_GRAMMAR_PIPELINE_CACHE_KEY.includes("unified-taste") &&
    TASTE_GRAMMAR_PIPELINE_CACHE_KEY.includes("canary"));
if (!cacheKeyOk) {
  failed += 1;
  console.error("FAIL cache key missing unified-taste marker", TASTE_GRAMMAR_PIPELINE_CACHE_KEY);
} else {
  console.log(`OK cache key documents unified layer: ${TASTE_GRAMMAR_PIPELINE_CACHE_KEY}`);
}

const routeSource = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
const loadIdx = routeSource.indexOf("await loadPipelineTray()");
const unifiedIdx = routeSource.indexOf("const unifiedTaste =");
const cacheIsolationOk = loadIdx >= 0 && unifiedIdx > loadIdx;

if (!cacheIsolationOk) {
  failed += 1;
  console.error("FAIL unified telemetry may be inside pipeline cache path");
} else {
  console.log("OK unifiedTaste computed post-cache (telemetry not hidden by tray cache)");
}

const BASE_URL = process.env.SEARCH_BASE_URL;
const LIVE_REQUIRED = process.env.UNIFIED_SOAK_LIVE_REQUIRED === "true";
let liveResults = null;
if (BASE_URL) {
  liveResults = { attempted: 0, unifiedVisible: 0, applyOff: 0, skipped: 0, failures: [] };
  const sample = SOAK_QUERIES.filter((q) => q.expectActive).slice(0, 4);
  for (const q of sample) {
    liveResults.attempted += 1;
    try {
      const res = await fetch(`${BASE_URL}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q.query }),
      });
      const json = await res.json();
      const ut = json?.data?.meta?.unifiedTaste;
      if (ut && ut.version === "unified-taste-v1") {
        liveResults.unifiedVisible += 1;
        if (ut.applyEnabled === false) liveResults.applyOff += 1;
        console.log(`OK live ${q.id} identity=${ut.identity} apply=${ut.applyEnabled}`);
      } else if (!LIVE_REQUIRED) {
        liveResults.skipped += 1;
        console.log(`SKIP live ${q.id} — meta.unifiedTaste not on ${BASE_URL} (deploy pending)`);
      } else {
        liveResults.failures.push({ id: q.id, reason: "missing_unifiedTaste" });
        console.error(`FAIL live ${q.id} — meta.unifiedTaste missing`);
      }
    } catch (e) {
      if (!LIVE_REQUIRED) {
        liveResults.skipped += 1;
        console.log(`SKIP live ${q.id} — ${e instanceof Error ? e.message : "fetch_error"}`);
      } else {
        liveResults.failures.push({ id: q.id, reason: e instanceof Error ? e.message : "fetch_error" });
        console.error(`FAIL live ${q.id} — ${liveResults.failures.at(-1).reason}`);
      }
    }
  }
  if (LIVE_REQUIRED && liveResults.failures.length > 0) {
    failed += liveResults.failures.length;
  }
}

const report = {
  suite: "unified-taste-meta-soak",
  phase: "P3.1A",
  at: new Date().toISOString(),
  apply_enabled: false,
  cases_passed: results.filter((r) => r.pass).length,
  cases_total: results.length,
  pass_rate_pct: Math.round((results.filter((r) => r.pass).length / results.length) * 100),
  identity_stability_pct: Math.round((results.filter((r) => r.identityStable).length / results.length) * 100),
  ranking_unchanged_pct: Math.round((results.filter((r) => r.rankingStable).length / results.length) * 100),
  min_coherence: Math.min(...results.filter((r) => r.meta.active).map((r) => r.meta.coherenceScore ?? 0)),
  min_prestige_integrity: Math.min(...results.filter((r) => r.meta.active).map((r) => r.meta.prestigeIntegrity ?? 0)),
  max_unified_latency_ms: Math.max(...results.map((r) => r.meta.latencyMs ?? 0)),
  pollution_leakage_cases: pollutionLeakage,
  cache_key_ok: cacheKeyOk,
  telemetry_post_cache: cacheIsolationOk,
  cache_key: TASTE_GRAMMAR_PIPELINE_CACHE_KEY,
  live: liveResults,
  issues,
  results,
  recommendation:
    failed === 0
      ? "continue_soak_ready_for_p3_2_planning"
      : "extend_soak_do_not_enable_unified_apply",
};

saveValidationRun(report, "unified-taste-meta-soak");

console.log("\n--- P3.1A SOAK SUMMARY ---");
console.log(JSON.stringify({
  pass: failed === 0,
  pass_rate_pct: report.pass_rate_pct,
  identity_stability_pct: report.identity_stability_pct,
  ranking_unchanged_pct: report.ranking_unchanged_pct,
  min_prestige_integrity: report.min_prestige_integrity,
  pollution_leakage: report.pollution_leakage_cases,
  telemetry_post_cache: report.telemetry_post_cache,
  recommendation: report.recommendation,
}, null, 2));

if (failed) process.exit(1);
console.log("\nUnified taste meta soak passed");
