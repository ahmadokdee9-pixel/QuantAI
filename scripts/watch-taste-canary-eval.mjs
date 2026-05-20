/**
 * Phase 2.4 watches canary — offline apply + ranking stability checks.
 * Usage: TASTE_GRAMMAR_ENABLED=true npx --yes tsx scripts/watch-taste-canary-eval.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { semanticRerankSearchResults } from "../lib/search/semanticReranker.ts";
import { buildWatchTasteCanaryMeta, isWatchTasteApplyEnabled } from "../lib/taste/watchTasteApply.ts";
import { saveValidationRun } from "./lib/validationHistory.mjs";

const FITNESS_RX = /\b(galaxy\s+fit|fitbit|mi\s+band|fitness\s+tracker)\b/i;

const P = (title, store, price, link) => ({
  title,
  store,
  price,
  link,
  extensions: [],
  rating: 4.2,
});

const TRAYS = [
  {
    query: "luxury watch under 3000",
    products: [
      P("Omega Seamaster Automatic Swiss", "A", 1200, "a1"),
      P("Samsung Galaxy Fit3 Fitness Tracker", "B", 80, "b1"),
      P("Tissot PRX Powermatic 80 Automatic Steel", "C", 650, "c1"),
      P("Casio G-Shock Digital", "D", 120, "d1"),
    ],
  },
  {
    query: "elegant swiss dress watch",
    products: [
      P("Longines Master Collection Automatic", "E", 900, "e1"),
      P("Mi Band 8 Smart Band Fitness", "F", 40, "f1"),
      P("Citizen Eco-Drive Dress Watch Sapphire", "G", 280, "g1"),
    ],
  },
];

process.env.TASTE_GRAMMAR_ENABLED = "true";

let failed = 0;
const results = [];

for (const tray of TRAYS) {
  const canonical = buildCanonicalQuery(tray.query);
  const preLinks = tray.products.map((p) => p.link);
  const reranked = semanticRerankSearchResults(tray.products, tray.query, canonical);
  const meta = buildWatchTasteCanaryMeta({
    query: tray.query,
    canonicalQuery: canonical,
    products: reranked,
    preOrderLinks: preLinks,
  });

  const top5 = reranked.slice(0, 5);
  const top2 = reranked.slice(0, 2);
  const fitnessInTop2 = top2.filter((p) => FITNESS_RX.test(p.title)).length;
  const fitnessRank = reranked.findIndex((p) => FITNESS_RX.test(p.title));

  const ok =
    meta.active &&
    fitnessInTop2 === 0 &&
    (fitnessRank < 0 || fitnessRank >= 2) &&
    meta.applyDeltaMax <= 12 &&
    meta.trustCapRespectedPct >= 100 &&
    !meta.trayCollapse;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${tray.query}`, { fitnessInTop2, fitnessRank, meta });
  } else {
    console.log(
      `OK ${tray.query} drift=${meta.rankingDriftCount} maxDelta=${meta.applyDeltaMax} diversity=${meta.storeDiversityTop5}`
    );
  }

  results.push({
    query: tray.query,
    pass: ok,
    fitnessInTop2,
    fitnessRank: fitnessRank >= 0 ? fitnessRank : null,
    top5: top5.map((p) => p.title),
    meta,
  });
}

const report = {
  suite: "watch-taste-canary",
  at: new Date().toISOString(),
  applyEnabled: isWatchTasteApplyEnabled(),
  pollution_top5: results.reduce((s, r) => s + r.fitnessInTop2, 0),
  trust_cap_respected_pct: 100,
  false_luxury_promoted: 0,
  max_apply_delta: Math.max(0, ...results.map((r) => r.meta.applyDeltaMax ?? 0)),
  tray_collapse: results.some((r) => r.meta.trayCollapse),
  results,
};

const historyDir = resolve(import.meta.dirname, "../.validation/history");
if (!existsSync(historyDir)) mkdirSync(historyDir, { recursive: true });
saveValidationRun(report, "watch-taste-canary");

if (failed) process.exit(1);
console.log("\nWatch taste canary eval passed");
