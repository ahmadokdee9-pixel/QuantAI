/**
 * Phase 2.6 furniture canary — offline apply + tray stability.
 * Usage: TASTE_FURNITURE_GRAMMAR_ENABLED=true npx --yes tsx scripts/furniture-taste-canary-eval.mjs
 */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { semanticRerankSearchResults } from "../lib/search/semanticReranker.ts";
import { buildFurnitureTasteCanaryMeta, isFurnitureTasteApplyEnabled } from "../lib/taste/furnitureTasteApply.ts";
import { saveValidationRun } from "./lib/validationHistory.mjs";

const GAMING_RX = /\b(gaming chair|racer|rgb|led trim|gamer)\b/i;

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
    query: "minimal oak desk setup",
    products: [
      P("Oak Standing Desk Matte Cable Management Minimal", "A", 420, "a1"),
      P("RGB Gaming Chair Racer LED Gamer Recliner", "B", 89, "b1"),
      P("Walnut Minimal Office Desk Steel Frame", "C", 380, "c1"),
    ],
  },
  {
    query: "executive ergonomic workspace",
    products: [
      P("Steelcase Gesture Ergonomic Office Chair Lumbar", "D", 890, "d1"),
      P("Racing Style Gamer Chair Ergonomic Look", "E", 120, "e1"),
      P("Herman Miller Aeron Executive Office Chair", "F", 950, "f1"),
    ],
  },
  {
    query: "clean studio desk minimal",
    products: [
      P("White Studio Desk Monochrome Cable Management", "G", 310, "g1"),
      P("LED Gamer Desk RGB Gaming Setup", "H", 95, "h1"),
      P("Clean Slim Matte Desk Steel Legs", "I", 275, "i1"),
    ],
  },
  {
    query: "premium walnut workspace",
    products: [
      P("Premium Walnut Desk Oak Steel Frame Minimal", "J", 520, "j1"),
      P("Luxury Look PU Leather Desk Chair Gold Trim", "K", 140, "k1"),
      P("Walnut Executive Desk Cable Management", "L", 480, "l1"),
    ],
  },
  {
    query: "architectural office minimal",
    products: [
      P("Architectural Bespoke Walnut Designer Desk", "M", 680, "m1"),
      P("Plastic Premium Look Office Desk RGB Trim", "N", 110, "n1"),
      P("Designer Minimal Steel Oak Architectural Desk", "O", 640, "o1"),
    ],
  },
];

process.env.TASTE_FURNITURE_GRAMMAR_ENABLED = "true";

let failed = 0;
const results = [];

for (const tray of TRAYS) {
  const canonical = buildCanonicalQuery(tray.query);
  const preLinks = tray.products.map((p) => p.link);
  const reranked = semanticRerankSearchResults(tray.products, tray.query, canonical);
  const meta = buildFurnitureTasteCanaryMeta({
    query: tray.query,
    canonicalQuery: canonical,
    products: reranked,
    preOrderLinks: preLinks,
  });

  const top2 = reranked.slice(0, 2);
  const gamingInTop2 = top2.filter((p) => GAMING_RX.test(p.title)).length;
  const gamingRank = reranked.findIndex((p) => GAMING_RX.test(p.title));

  const ok =
    meta.active &&
    gamingInTop2 === 0 &&
    (gamingRank < 0 || gamingRank >= 2) &&
    meta.applyDeltaMax <= 12 &&
    meta.trustCapRespectedPct >= 100 &&
    meta.pollutionTop5 === 0 &&
    meta.gamingPollutionTop5 === 0 &&
    meta.storeDiversityTop5 >= 2 &&
    !meta.trayCollapse;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${tray.query}`, { gamingInTop2, gamingRank, meta });
  } else {
    console.log(
      `OK ${tray.query} lane=${meta.grammarLane} drift=${meta.rankingDriftCount} maxDelta=${meta.applyDeltaMax}`
    );
  }

  results.push({ query: tray.query, pass: ok, gamingInTop2, meta });
}

const report = {
  suite: "furniture-taste-canary",
  at: new Date().toISOString(),
  applyEnabled: isFurnitureTasteApplyEnabled(),
  pollution_top5: results.reduce((s, r) => s + (r.meta.pollutionTop5 ?? 0), 0),
  gaming_pollution_top5: results.reduce((s, r) => s + (r.meta.gamingPollutionTop5 ?? 0), 0),
  gaming_in_top2: results.reduce((s, r) => s + (r.gamingInTop2 ?? 0), 0),
  trust_cap_respected_pct: 100,
  max_apply_delta: Math.max(0, ...results.map((r) => r.meta.applyDeltaMax ?? 0)),
  results,
};

saveValidationRun(report, "furniture-taste-canary");

if (failed) process.exit(1);
console.log("\nFurniture taste canary eval passed");
