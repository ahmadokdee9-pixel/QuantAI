/**
 * P4.2 — Ranking stability under intent apply (deterministic rerank + rollback path).
 * Usage: npm run test:intent-apply-ranking-stability
 */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { semanticRerankSearchResults } from "../lib/search/semanticReranker.ts";
import { buildIntentApplyMeta } from "../lib/intent/intentApply.ts";
import { isIntentIntelligenceApplyEnabled } from "../lib/intent/intentIntelligenceFlags.ts";
import { saveValidationRun } from "./lib/validationHistory.mjs";

const P = (title, store, price, link) => ({
  title,
  store,
  price,
  link,
  extensions: [],
  rating: 4.2,
});

const PARTITIONS = [
  {
    id: "budget_laptops",
    query: "cheap but good laptop under 500",
    products: [
      P("Lenovo IdeaPad Slim 3 Laptop", "Coolblue", 449, "bl1"),
      P("Budget Laptop Hurry Buy", "Temu", 89, "tm1"),
      P("ASUS Vivobook 15", "Bol.com", 479, "bol1"),
    ],
  },
  {
    id: "dutch_delivery",
    query: "snelle levering laptop vertrouwde verkoper",
    products: [
      P("Dell XPS Snelle Levering", "Dell.nl", 899, "dn1"),
      P("Laptop Haast Koop", "Temu", 199, "tm2"),
      P("HP Bol Morgen in Huis", "Bol.com", 649, "bol1"),
    ],
  },
  {
    id: "refurb_phone",
    query: "refurbished iphone 14 pro trusted warranty",
    products: [
      P("iPhone 14 Pro Max Refurbished Warranty", "Coolblue", 899, "rf1"),
      P("iPhone 14 Pro Refurb No Warranty Hurry", "Temu", 399, "tm3"),
      P("iPhone 14 Pro Renewed Certified", "Back Market", 849, "bm1"),
    ],
  },
  {
    id: "compare_headphones",
    query: "compare sony wh-1000xm5 vs bose qc45",
    products: [
      P("Sony WH-1000XM5", "Coolblue", 329, "s1"),
      P("Bose QuietComfort 45", "Bol.com", 279, "b1"),
      P("Generic Sony Lookalike", "Temu", 35, "g1"),
    ],
  },
  {
    id: "mixed_arabic_shoes",
    query: "جزمة مثل nike vomero بس ارخص",
    products: [
      P("Nike Vomero Premium", "Nike", 140, "nk1"),
      P("Nike Vomero Style Budget", "Temu", 29, "tm4"),
      P("Nike Air Zoom Vomero 16", "Bol.com", 125, "bol2"),
    ],
  },
];

const saved = { INTENT_INTELLIGENCE_APPLY_ENABLED: process.env.INTENT_INTELLIGENCE_APPLY_ENABLED };

function restore() {
  if (saved.INTENT_INTELLIGENCE_APPLY_ENABLED === undefined) delete process.env.INTENT_INTELLIGENCE_APPLY_ENABLED;
  else process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = saved.INTENT_INTELLIGENCE_APPLY_ENABLED;
}

process.env.TASTE_UNIFIED_APPLY_ENABLED = "false";
process.env.TASTE_GRAMMAR_ENABLED = "false";
process.env.TASTE_FRAGRANCE_GRAMMAR_ENABLED = "false";
process.env.TASTE_FURNITURE_GRAMMAR_ENABLED = "false";

let failed = 0;
const results = [];

function links(products) {
  return products.map((p) => p.link).join("|");
}

try {
  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";

  for (const part of PARTITIONS) {
    const canonical = buildCanonicalQuery(part.query);
    const products = [...part.products];
    const preLinks = products.map((p) => p.link);

    const runA = semanticRerankSearchResults(products, part.query, canonical);
    const runB = semanticRerankSearchResults(products, part.query, canonical);
    const runC = semanticRerankSearchResults(products, part.query, canonical);

    const stableAB = links(runA) === links(runB);
    const stableBC = links(runB) === links(runC);
    const meta = buildIntentApplyMeta({
      query: part.query,
      canonicalQuery: canonical,
      products: runA,
      preOrderLinks: preLinks,
    });

    process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "false";
    const offRanked = semanticRerankSearchResults(products, part.query, canonical);
    process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
    if (!isIntentIntelligenceApplyEnabled()) {
      failed += 1;
      console.error(`FAIL ${part.id} apply flag not restored`);
    }
    const onAgain = semanticRerankSearchResults(products, part.query, canonical);
    const rollbackRestore = links(onAgain) === links(runA);

    const ok = stableAB && stableBC && rollbackRestore && meta.latencyMs <= 20;

    if (!ok) {
      failed += 1;
      console.error(`FAIL ${part.id}`, { stableAB, stableBC, rollbackRestore, latencyMs: meta.latencyMs });
    } else {
      console.log(
        `OK ${part.id} stable drift=${meta.driftCount} latency=${meta.latencyMs}ms applied=${meta.applied}`
      );
    }

    results.push({
      id: part.id,
      pass: ok,
      stableAB,
      stableBC,
      rollbackRestore,
      offLinks: links(offRanked),
      onLinks: links(runA),
      meta,
    });
  }

  const report = {
    suite: "intent-apply-ranking-stability",
    phase: "P4.2",
    at: new Date().toISOString(),
    pass_rate_pct: Math.round((results.filter((r) => r.pass).length / results.length) * 100),
    ranking_deterministic_pct: Math.round(
      (results.filter((r) => r.stableAB && r.stableBC).length / results.length) * 100
    ),
    rollback_restore_pct: Math.round(
      (results.filter((r) => r.rollbackRestore).length / results.length) * 100
    ),
    max_latency_ms: Math.max(0, ...results.map((r) => r.meta.latencyMs ?? 0)),
    results,
    recommendation:
      failed === 0 ? "ranking_stable_under_intent_apply" : "investigate_nondeterminism_before_p43",
  };

  saveValidationRun(report, "intent-apply-ranking-stability");

  console.log("\n--- P4.2 RANKING STABILITY SUMMARY ---");
  console.log(JSON.stringify({
    pass: failed === 0,
    deterministic_pct: report.ranking_deterministic_pct,
    rollback_restore_pct: report.rollback_restore_pct,
    max_latency_ms: report.max_latency_ms,
    recommendation: report.recommendation,
  }, null, 2));
} finally {
  restore();
}

if (failed) process.exit(1);
console.log("\nIntent apply ranking stability passed");
