/**
 * P4.4 — Ranking integrity monitors (stability, contamination, over-suppression).
 * Usage: npm run test:intent-ranking-integrity
 */
import {
  INTENT_LIVE_PARTITIONS,
  trayLinks,
  observeIntentPartition,
} from "./lib/intentLiveObservabilityPartitions.mjs";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { semanticRerankSearchResults } from "../lib/search/semanticReranker.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import {
  INTENT_OBS_SUPPRESSION_RATE_MAX,
} from "../lib/intent/intentObservabilityFlags.ts";
import { isUnifiedTasteApplyEnabled } from "../lib/taste/unifiedTasteFlags.ts";

const ENV = {
  NODE_ENV: "production",
  INTENT_INTELLIGENCE_APPLY_ENABLED: "true",
  INTENT_INTELLIGENCE_CANARY_APPLY: "true",
  INTENT_CANARY_ROLLOUT_STAGE: "100",
  TASTE_UNIFIED_APPLY_ENABLED: "false",
  TASTE_GRAMMAR_ENABLED: "false",
  TASTE_FRAGRANCE_GRAMMAR_ENABLED: "false",
  TASTE_FURNITURE_GRAMMAR_ENABLED: "false",
};

const saved = {
  NODE_ENV: process.env.NODE_ENV,
  INTENT_INTELLIGENCE_APPLY_ENABLED: process.env.INTENT_INTELLIGENCE_APPLY_ENABLED,
  INTENT_INTELLIGENCE_PROD_APPLY: process.env.INTENT_INTELLIGENCE_PROD_APPLY,
  INTENT_INTELLIGENCE_CANARY_APPLY: process.env.INTENT_INTELLIGENCE_CANARY_APPLY,
  TASTE_UNIFIED_APPLY_ENABLED: process.env.TASTE_UNIFIED_APPLY_ENABLED,
  TASTE_GRAMMAR_ENABLED: process.env.TASTE_GRAMMAR_ENABLED,
  TASTE_FRAGRANCE_GRAMMAR_ENABLED: process.env.TASTE_FRAGRANCE_GRAMMAR_ENABLED,
  TASTE_FURNITURE_GRAMMAR_ENABLED: process.env.TASTE_FURNITURE_GRAMMAR_ENABLED,
};

function applyEnv() {
  for (const [k, v] of Object.entries(ENV)) {
    process.env[k] = v;
  }
  delete process.env.INTENT_INTELLIGENCE_PROD_APPLY;
}

function restoreEnv() {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

let failed = 0;
const results = [];

try {
  applyEnv();

  if (isUnifiedTasteApplyEnabled()) {
    console.error("FAIL unified apply must be OFF");
    process.exit(1);
  }

  for (const part of INTENT_LIVE_PARTITIONS) {
    const row = observeIntentPartition(part, ENV);
    applyEnv();

    const canonical = buildCanonicalQuery(part.query);
    const products = [...part.products];
    const runA = semanticRerankSearchResults(products, part.query, canonical);
  const runB = semanticRerankSearchResults(products, part.query, canonical);
  const runC = semanticRerankSearchResults(products, part.query, canonical);
  const tripleStable = trayLinks(runA) === trayLinks(runB) && trayLinks(runB) === trayLinks(runC);

  const pollutionTop2 = runA
    .slice(0, 2)
    .filter((p) => /\b(inspired by|clone|hurry buy|temu)\b/i.test(`${p.title} ${p.store}`)).length;

  const ok =
    tripleStable &&
    row.rankingStable &&
    !row.observability.crossLayerContamination &&
    row.shadow.applyEnabled === false &&
    row.unified.meta.applyEnabled === false &&
    !row.observability.overSuppression &&
    row.observability.suppressionRate <= INTENT_OBS_SUPPRESSION_RATE_MAX &&
    pollutionTop2 === 0;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${part.id}`, {
      tripleStable,
      crossLayer: row.observability.crossLayerContamination,
      p2: row.shadow.applyEnabled,
      p3: row.unified.meta.applyEnabled,
      overSuppression: row.observability.overSuppression,
      pollutionTop2,
    });
  } else {
    console.log(`OK ${part.id} stable suppression=${row.observability.suppressionRate}`);
  }

    results.push({
      id: part.id,
      pass: ok,
      tripleStable,
      crossLayerContamination: row.observability.crossLayerContamination,
      overSuppression: row.observability.overSuppression,
      pollutionTop2,
    });
  }

  const report = {
  suite: "intent-ranking-integrity",
  phase: "P4.4",
  at: new Date().toISOString(),
  pass_rate_pct: Math.round((results.filter((r) => r.pass).length / results.length) * 100),
  ranking_deterministic_pct: Math.round((results.filter((r) => r.tripleStable).length / results.length) * 100),
  cross_layer_clean: results.every((r) => !r.crossLayerContamination),
  results,
  recommendation: failed === 0 ? "ranking_integrity_protected" : "ranking_integrity_breach",
};

  saveLiveObservabilityRun(report, "intent-ranking-integrity");
} finally {
  restoreEnv();
}

if (failed) process.exit(1);
console.log("\nIntent ranking integrity passed");
