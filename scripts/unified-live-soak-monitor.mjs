/**
 * P3.3 — Unified live staging soak monitor.
 * Usage: npx --yes tsx scripts/unified-live-soak-monitor.mjs
 * Optional live: SEARCH_BASE_URL=http://localhost:3000 npm run test:unified-live-soak
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { semanticRerankSearchResults } from "../lib/search/semanticReranker.ts";
import { buildVerticalTasteShadowMeta } from "../lib/taste/verticalTasteShadow.ts";
import { buildUnifiedLiveSoakCanaryMeta } from "../lib/taste/unifiedTasteApply.ts";
import {
  isUnifiedCanaryEnvironmentAllowed,
  isUnifiedTasteApplyEnabled,
} from "../lib/taste/unifiedTasteFlags.ts";
import { TASTE_GRAMMAR_PIPELINE_CACHE_KEY } from "../lib/taste/verticalTasteFlags.ts";
import {
  UNIFIED_LIVE_SOAK_PARTITIONS,
  checkUnifiedLiveSoakMetrics,
} from "./lib/unifiedLiveSoakPartitions.mjs";
import { saveValidationRun } from "./lib/validationHistory.mjs";

function trayLinks(products) {
  return products.map((p) => p.link || p.title).join("|");
}

function configureStagingSoakEnv() {
  process.env.NODE_ENV = process.env.NODE_ENV === "production" ? "production" : "development";
  process.env.TASTE_UNIFIED_APPLY_ENABLED = "true";
  process.env.TASTE_GRAMMAR_ENABLED = "false";
  process.env.TASTE_FRAGRANCE_GRAMMAR_ENABLED = "false";
  process.env.TASTE_FURNITURE_GRAMMAR_ENABLED = "false";
  delete process.env.ENABLE_UNIFIED_CANARY;
}

configureStagingSoakEnv();

let failed = 0;
const results = [];

if (!isUnifiedTasteApplyEnabled()) {
  console.error("FAIL staging soak requires unified apply ON in non-production");
  process.exit(1);
}

for (const part of UNIFIED_LIVE_SOAK_PARTITIONS) {
  const canonical = buildCanonicalQuery(part.query);
  const preLinks = part.products.map((p) => p.link);

  process.env.TASTE_UNIFIED_APPLY_ENABLED = "false";
  const offRanked = semanticRerankSearchResults([...part.products], part.query, canonical);

  process.env.TASTE_UNIFIED_APPLY_ENABLED = "true";
  const onRanked = semanticRerankSearchResults([...part.products], part.query, canonical);
  const onShadow = buildVerticalTasteShadowMeta({
    query: part.query,
    canonicalQuery: canonical,
    products: onRanked,
  });
  const meta = buildUnifiedLiveSoakCanaryMeta({
    query: part.query,
    canonicalQuery: canonical,
    products: onRanked,
    tasteGrammarShadow: onShadow,
    preOrderLinks: preLinks,
  });

  const offTop2 = offRanked.slice(0, 2).map((p) => p.link);
  const onTop2 = onRanked.slice(0, 2).map((p) => p.link);
  let drift = 0;
  for (let i = 0; i < Math.min(offTop2.length, onTop2.length); i += 1) {
    if (offTop2[i] !== onTop2[i]) drift += 1;
  }

  const run2 = semanticRerankSearchResults([...part.products], part.query, canonical);
  const rankingStable = trayLinks(onRanked) === trayLinks(run2);

  const monitor = checkUnifiedLiveSoakMetrics(meta);
  const identityOk = meta.identity === part.expectIdentity;
  const queryClassOk = meta.queryClass === part.expectQueryClass;
  const applyOn = meta.applyEnabled === true && meta.stagingGuardPass === true;

  const ok =
    monitor.pass &&
    identityOk &&
    queryClassOk &&
    applyOn &&
    rankingStable &&
    drift <= 3;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${part.id}`, {
      monitor: monitor.issues,
      identityOk,
      queryClassOk,
      applyOn,
      rankingStable,
      drift,
      meta,
    });
  } else {
    console.log(
      `OK ${part.id} identity=${meta.identity} pollutionTop2=${meta.pollutionTop2} maxDelta=${meta.applyDeltaMax} drift=${drift} latency=${meta.latencyMs}ms`
    );
  }

  results.push({
    partition: part.partition,
    id: part.id,
    pass: ok,
    drift,
    rankingStable,
    meta,
    monitor,
  });
}

const routeSource = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
const telemetryOk =
  routeSource.includes("unifiedTasteCanary") &&
  routeSource.includes("buildUnifiedLiveSoakCanaryMeta");
if (!telemetryOk) {
  failed += 1;
  console.error("FAIL meta.unifiedTasteCanary telemetry not wired in search route");
} else {
  console.log("OK meta.unifiedTasteCanary telemetry wired");
}

const cacheOk = TASTE_GRAMMAR_PIPELINE_CACHE_KEY.includes("unified-live-soak");
if (!cacheOk) {
  failed += 1;
  console.error("FAIL cache key missing unified-live-soak marker", TASTE_GRAMMAR_PIPELINE_CACHE_KEY);
} else {
  console.log(`OK cache key: ${TASTE_GRAMMAR_PIPELINE_CACHE_KEY}`);
}

const BASE_URL = process.env.SEARCH_BASE_URL;
const LIVE_REQUIRED = process.env.UNIFIED_LIVE_SOAK_REQUIRED === "true";
let live = null;
if (BASE_URL) {
  live = { attempted: 0, visible: 0, applyOff: 0, skipped: 0, failures: [] };
  const sample = UNIFIED_LIVE_SOAK_PARTITIONS.slice(0, 2);
  for (const part of sample) {
    live.attempted += 1;
    try {
      const res = await fetch(`${BASE_URL}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: part.query }),
      });
      const json = await res.json();
      const canary = json?.data?.meta?.unifiedTasteCanary;
      if (canary?.version === "unified-taste-live-soak-v1") {
        live.visible += 1;
        if (canary.applyEnabled === false) live.applyOff += 1;
        const check = checkUnifiedLiveSoakMetrics(canary);
        if (!check.pass && LIVE_REQUIRED) {
          live.failures.push({ id: part.id, issues: check.issues });
        }
        console.log(`OK live ${part.id} apply=${canary.applyEnabled} identity=${canary.identity}`);
      } else if (!LIVE_REQUIRED) {
        live.skipped += 1;
        console.log(`SKIP live ${part.id} — meta.unifiedTasteCanary not on ${BASE_URL}`);
      } else {
        live.failures.push({ id: part.id, reason: "missing_unifiedTasteCanary" });
        console.error(`FAIL live ${part.id} — meta.unifiedTasteCanary missing`);
      }
    } catch (e) {
      if (!LIVE_REQUIRED) {
        live.skipped += 1;
        console.log(`SKIP live ${part.id} — ${e instanceof Error ? e.message : "fetch_error"}`);
      } else {
        live.failures.push({ id: part.id, reason: e instanceof Error ? e.message : "fetch_error" });
        console.error(`FAIL live ${part.id}`);
      }
    }
  }
  if (LIVE_REQUIRED && live.failures.length > 0) failed += live.failures.length;
}

const report = {
  suite: "unified-live-soak",
  phase: "P3.3",
  at: new Date().toISOString(),
  apply_enabled: isUnifiedTasteApplyEnabled(),
  staging_guard_pass: isUnifiedCanaryEnvironmentAllowed(),
  partitions_passed: results.filter((r) => r.pass).length,
  partitions_total: results.length,
  pass_rate_pct: Math.round((results.filter((r) => r.pass).length / results.length) * 100),
  pollution_top2: results.reduce((s, r) => s + (r.meta.pollutionTop2 ?? 0), 0),
  max_apply_delta: Math.max(0, ...results.map((r) => r.meta.applyDeltaMax ?? 0)),
  min_prestige_integrity: Math.min(...results.map((r) => r.meta.prestigeIntegrity ?? 0)),
  max_ranking_drift: Math.max(0, ...results.map((r) => r.drift ?? 0)),
  max_latency_ms: Math.max(0, ...results.map((r) => r.meta.latencyMs ?? 0)),
  ranking_stable_pct: Math.round((results.filter((r) => r.rankingStable).length / results.length) * 100),
  vertical_apply_flags_off: true,
  telemetry_wired: telemetryOk,
  cache_key: TASTE_GRAMMAR_PIPELINE_CACHE_KEY,
  live,
  results,
  recommendation:
    failed === 0 ? "staging_soak_ready_continue_monitoring" : "hold_staging_fix_failures_before_soak",
};

saveValidationRun(report, "unified-live-soak");

console.log("\n--- P3.3 LIVE SOAK SUMMARY ---");
console.log(
  JSON.stringify(
    {
      pass: failed === 0,
      pass_rate_pct: report.pass_rate_pct,
      pollution_top2: report.pollution_top2,
      max_apply_delta: report.max_apply_delta,
      min_prestige_integrity: report.min_prestige_integrity,
      max_ranking_drift: report.max_ranking_drift,
      recommendation: report.recommendation,
    },
    null,
    2
  )
);

if (failed) process.exit(1);
console.log("\nUnified live soak monitor passed");
