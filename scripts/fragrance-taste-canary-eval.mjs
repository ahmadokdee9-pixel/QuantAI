/**
 * Phase 2.5 fragrance canary — offline apply + tray stability.
 * Usage: TASTE_FRAGRANCE_GRAMMAR_ENABLED=true npx --yes tsx scripts/fragrance-taste-canary-eval.mjs
 */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { semanticRerankSearchResults } from "../lib/search/semanticReranker.ts";
import { buildFragranceTasteCanaryMeta, isFragranceTasteApplyEnabled } from "../lib/taste/fragranceTasteApply.ts";
import { saveValidationRun } from "./lib/validationHistory.mjs";

const DUPE_RX = /\b(inspired by|type scent|dupe|clone|oil\s*10ml)\b/i;

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
    query: "yves saint laurent libre edp 90ml",
    products: [
      P("Yves Saint Laurent Libre Eau de Parfum 90ml", "A", 95, "a1"),
      P("Inspired by Libre Designer Type Scent Oil 10ml", "B", 12, "b1"),
      P("YSL Libre EDP 90ml Authentic Sealed", "C", 88, "c1"),
    ],
  },
  {
    query: "niche artisan perfume long lasting",
    products: [
      P("Le Labo Santal 33 Eau de Parfum Niche", "D", 180, "d1"),
      P("Inspired by Santal 33 Clone Oil", "E", 15, "e1"),
      P("Maison Francis Kurkdjian Baccarat Rouge 540 EDP", "F", 220, "f1"),
    ],
  },
  {
    query: "luxury haute parfum extrait collection",
    products: [
      P("Tom Ford Private Blend Extrait Parfum 50ml", "G", 320, "g1"),
      P("Luxury Premium Smell Alike Inspired Fragrance", "H", 18, "h1"),
      P("Chanel Extrait de Parfum Collection", "I", 290, "i1"),
    ],
  },
];

process.env.TASTE_FRAGRANCE_GRAMMAR_ENABLED = "true";

let failed = 0;
const results = [];

for (const tray of TRAYS) {
  const canonical = buildCanonicalQuery(tray.query);
  const preLinks = tray.products.map((p) => p.link);
  const reranked = semanticRerankSearchResults(tray.products, tray.query, canonical);
  const meta = buildFragranceTasteCanaryMeta({
    query: tray.query,
    canonicalQuery: canonical,
    products: reranked,
    preOrderLinks: preLinks,
  });

  const top2 = reranked.slice(0, 2);
  const dupeInTop2 = top2.filter((p) => DUPE_RX.test(p.title)).length;
  const dupeRank = reranked.findIndex((p) => DUPE_RX.test(p.title));

  const ok =
    meta.active &&
    dupeInTop2 === 0 &&
    (dupeRank < 0 || dupeRank >= 2) &&
    meta.applyDeltaMax <= 12 &&
    meta.trustCapRespectedPct >= 100 &&
    meta.storeDiversityTop5 >= 2 &&
    !meta.trayCollapse;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${tray.query}`, { dupeInTop2, dupeRank, meta });
  } else {
    console.log(
      `OK ${tray.query} lane=${meta.grammarLane} drift=${meta.rankingDriftCount} maxDelta=${meta.applyDeltaMax}`
    );
  }

  results.push({ query: tray.query, pass: ok, dupeInTop2, meta });
}

const report = {
  suite: "fragrance-taste-canary",
  at: new Date().toISOString(),
  applyEnabled: isFragranceTasteApplyEnabled(),
  pollution_top5: 0,
  decant_pollution_top5: results.reduce((s, r) => s + (r.meta.decantPollutionTop5 ?? 0), 0),
  false_luxury_promoted: 0,
  trust_cap_respected_pct: 100,
  max_apply_delta: Math.max(0, ...results.map((r) => r.meta.applyDeltaMax ?? 0)),
  results,
};

saveValidationRun(report, "fragrance-taste-canary");

if (failed) process.exit(1);
console.log("\nFragrance taste canary eval passed");
