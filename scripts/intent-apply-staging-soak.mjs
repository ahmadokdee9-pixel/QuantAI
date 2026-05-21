/**
 * P4.2 — Intent apply staging soak (edge trays + meta.intentApply validation).
 * Staging-like: intent apply ON; P2/P3 apply OFF; production apply never enabled.
 * Usage: npm run test:intent-apply-staging-soak
 * Optional live: SEARCH_BASE_URL=https://staging.example npm run test:intent-apply-staging-soak
 */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { semanticRerankSearchResults } from "../lib/search/semanticReranker.ts";
import { buildIntentApplyMeta } from "../lib/intent/intentApply.ts";
import { computeIntentIntelligence } from "../lib/intent/intentIntelligenceEngine.ts";
import { INTENT_APPLY_MAX_DELTA } from "../lib/intent/intentIntelligenceFlags.ts";
import { saveValidationRun } from "./lib/validationHistory.mjs";

const POLLUTION_RX = /\b(inspired by|dupe|clone|fake discount|temu|only 2 left|hurry buy|refurbished scam)\b/i;

const P = (title, store, price, link, extra = {}) => ({
  title,
  store,
  price,
  link,
  extensions: [],
  rating: 4.2,
  ...extra,
});

/** P4.2 expanded edge trays (includes P4.1 core + market/locale/trust cases). */
const TRAYS = [
  {
    id: "budget_laptops",
    group: "english",
    query: "cheap but good laptop under 500",
    minConfidence: 0.68,
    products: [
      P("Lenovo IdeaPad Slim 3 Laptop 15 inch", "Coolblue", 449, "bl1"),
      P("Budget Laptop 90% Off Was 999 Hurry Buy", "Temu Deals", 89, "tm1"),
      P("ASUS Vivobook 15 Lightweight Laptop", "Bol.com", 479, "bol1"),
    ],
  },
  {
    id: "trusted_fragrance_sellers",
    group: "english",
    query: "authentic ysl libre eau de parfum trusted seller only",
    minConfidence: 0.68,
    products: [
      P("Yves Saint Laurent Libre Eau de Parfum 90ml Sealed", "Douglas", 95, "d1"),
      P("Inspired by Libre Type Scent Oil 10ml", "RandomMarket", 12, "rm1"),
      P("YSL Libre EDP 90ml Authentic", "Notino", 92, "n1"),
    ],
  },
  {
    id: "compare_headphones",
    group: "english",
    query: "compare sony wh-1000xm5 vs bose qc45 which is better",
    minConfidence: 0.68,
    products: [
      P("Sony WH-1000XM5 Wireless Noise Cancelling Headphones", "Coolblue", 329, "s1"),
      P("Bose QuietComfort 45 Wireless Headphones", "Bol.com", 279, "b1"),
      P("Generic Wireless Headphones Look Like Sony", "Temu Deals", 35, "g1"),
    ],
  },
  {
    id: "urgent_delivery",
    group: "english",
    query: "low risk delivery trusted shipping laptop need it this week",
    minConfidence: 0.68,
    products: [
      P("Dell XPS 13 Laptop Official Store Insured Shipping", "Dell", 899, "dell1"),
      P("Laptop Only 2 Left Hurry Buy Selling Fast", "Temu Deals", 199, "tm2"),
      P("HP Pavilion Laptop Trusted Seller Track Shipping", "Amazon.nl", 649, "amz1"),
    ],
  },
  {
    id: "mixed_arabic_english_budget",
    group: "mixed",
    query: "جزمة مثل nike vomero بس ارخص",
    minConfidence: 0.68,
    products: [
      P("Nike Vomero Premium Running Shoes", "Nike", 140, "nk1"),
      P("Nike Vomero Style Sneaker Budget Look", "Temu Deals", 29, "tm3"),
      P("Nike Air Zoom Vomero 16", "Bol.com", 125, "bol2"),
    ],
  },
  {
    id: "dutch_market_laptop",
    group: "dutch",
    query: "goedkope laptop onder 500 euro betrouwbare verkoper trusted seller coolblue",
    minConfidence: 0.68,
    products: [
      P("Lenovo IdeaPad 15 Laptop Nederlands", "Coolblue", 459, "cb1"),
      P("Laptop Mega Korting 90% Was 1200 Nu 99", "Temu Deals", 99, "tm4"),
      P("HP Laptop 15 inch Bol.com", "Bol.com", 489, "bol3"),
    ],
  },
  {
    id: "dutch_budget_compare_phones",
    group: "dutch",
    query: "vergelijk iphone 15 met samsung s24 goedkoopste betrouwbare verkoper trusted",
    minConfidence: 0.68,
    products: [
      P("Apple iPhone 15 128GB", "Coolblue", 799, "ip1"),
      P("Samsung Galaxy S24 128GB", "Bol.com", 749, "sg1"),
      P("iPhone 15 Lookalike 90% Off Hurry", "Temu Deals", 89, "tm5"),
    ],
  },
  {
    id: "refurb_trust_risk_phone",
    group: "trust",
    query: "refurbished iphone 14 pro max trusted warranty not scam",
    minConfidence: 0.68,
    products: [
      P("Apple iPhone 14 Pro Max Refurbished Grade A 12 Month Warranty", "Coolblue", 899, "rf1"),
      P("iPhone 14 Pro Max Refurbished No Warranty Hurry Buy", "Temu Deals", 399, "tm6"),
      P("iPhone 14 Pro Max Renewed Certified Back Market", "Back Market", 849, "bm1"),
    ],
  },
  {
    id: "budget_comparison_laptops",
    group: "comparison",
    query: "best value laptop under 600 compare lenovo vs hp",
    minConfidence: 0.68,
    products: [
      P("Lenovo IdeaPad Slim 5 Laptop", "Coolblue", 549, "lv1"),
      P("HP Pavilion 15 Laptop", "Bol.com", 579, "hp1"),
      P("Laptop Clone 90% Off Was 999", "Temu Deals", 79, "tm7"),
    ],
  },
  {
    id: "urgent_delivery_dutch",
    group: "dutch",
    query: "low risk delivery trusted shipping laptop need it this week snelle levering bol.com",
    minConfidence: 0.68,
    products: [
      P("Dell XPS Laptop Snelle Levering Track Trace", "Dell.nl", 899, "dn1"),
      P("Laptop Alleen 2 Over Haast Koop Nu", "Temu Deals", 199, "tm8"),
      P("HP Laptop Bol.com Morgen in Huis", "Bol.com", 649, "bol4"),
    ],
  },
];

process.env.NODE_ENV = "development";
process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
process.env.TASTE_UNIFIED_APPLY_ENABLED = "false";
process.env.TASTE_GRAMMAR_ENABLED = "false";
process.env.TASTE_FRAGRANCE_GRAMMAR_ENABLED = "false";
process.env.TASTE_FURNITURE_GRAMMAR_ENABLED = "false";

let failed = 0;
const results = [];

for (const tray of TRAYS) {
  const canonical = buildCanonicalQuery(tray.query);
  const preLinks = tray.products.map((p) => p.link);
  const intent = computeIntentIntelligence({ query: tray.query, canonicalQuery: canonical });

  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "false";
  const offRanked = semanticRerankSearchResults([...tray.products], tray.query, canonical);

  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
  const onRanked = semanticRerankSearchResults([...tray.products], tray.query, canonical);
  const onMeta = buildIntentApplyMeta({
    query: tray.query,
    canonicalQuery: canonical,
    products: onRanked,
    preOrderLinks: preLinks,
  });

  const offTop2 = offRanked.slice(0, 2).map((p) => p.link);
  const onTop2 = onRanked.slice(0, 2).map((p) => p.link);
  let drift = 0;
  for (let i = 0; i < Math.min(offTop2.length, onTop2.length); i += 1) {
    if (offTop2[i] !== onTop2[i]) drift += 1;
  }

  const pollutionTop2 = onRanked
    .slice(0, 2)
    .filter((p) => POLLUTION_RX.test(p.title) || POLLUTION_RX.test(p.store)).length;
  const stores = new Set(onRanked.slice(0, 3).map((p) => p.store.trim().toLowerCase()));

  const ok =
    intent.confidence >= tray.minConfidence &&
    onMeta.applied &&
    onMeta.applyEnabled &&
    onMeta.integrityPass &&
    onMeta.deltaApplied <= INTENT_APPLY_MAX_DELTA &&
    pollutionTop2 === 0 &&
    drift <= 3 &&
    stores.size >= 2 &&
    onMeta.dimensionsUsed.length > 0;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${tray.id}`, {
      drift,
      pollutionTop2,
      confidence: intent.confidence,
      onMeta,
      offOrder: offRanked.map((p) => p.link),
      onOrder: onRanked.map((p) => p.link),
    });
  } else {
    console.log(
      `OK ${tray.id} drift=${drift} maxDelta=${onMeta.deltaApplied} dims=${onMeta.dimensionsUsed.join(",")} suppressions=${onMeta.suppressionEvents}`
    );
  }

  results.push({
    id: tray.id,
    group: tray.group,
    pass: ok,
    drift,
    pollutionTop2,
    intentConfidence: intent.confidence,
    onMeta,
    offOrder: offRanked.map((p) => ({ link: p.link, title: p.title.slice(0, 48) })),
    onOrder: onRanked.map((p) => ({ link: p.link, title: p.title.slice(0, 48) })),
  });
}

const BASE_URL = process.env.SEARCH_BASE_URL;
const LIVE_REQUIRED = process.env.INTENT_SOAK_LIVE_REQUIRED === "true";
let live = null;
if (BASE_URL) {
  live = { attempted: 0, intentApplyVisible: 0, applyOffInProd: null, failures: [] };
  const sample = TRAYS.filter((t) => ["dutch", "mixed", "trust", "comparison"].includes(t.group)).slice(0, 4);
  for (const tray of sample) {
    live.attempted += 1;
    try {
      const res = await fetch(`${BASE_URL}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: tray.query }),
      });
      const json = await res.json();
      const ia = json?.data?.meta?.intentApply;
      const ii = json?.data?.meta?.intentIntelligence;
      if (ia?.version === "intent-apply-v1" && ii?.version === "intent-intelligence-v1") {
        live.intentApplyVisible += 1;
        console.log(
          `OK live ${tray.id} applied=${ia.applied} delta=${ia.deltaApplied} applyEnabled=${ia.applyEnabled}`
        );
      } else if (!LIVE_REQUIRED) {
        console.log(`SKIP live ${tray.id} — meta.intentApply not on ${BASE_URL}`);
      } else {
        live.failures.push({ id: tray.id, reason: "missing_intentApply" });
        failed += 1;
        console.error(`FAIL live ${tray.id} — meta.intentApply missing`);
      }
    } catch (e) {
      if (!LIVE_REQUIRED) {
        console.log(`SKIP live ${tray.id} — ${e instanceof Error ? e.message : "fetch_error"}`);
      } else {
        live.failures.push({ id: tray.id, reason: e instanceof Error ? e.message : "fetch_error" });
        failed += 1;
        console.error(`FAIL live ${tray.id}`);
      }
    }
  }
}

const report = {
  suite: "intent-apply-staging-soak",
  phase: "P4.2",
  at: new Date().toISOString(),
  staging_apply_enabled: true,
  production_apply_enabled: false,
  max_delta: Math.max(0, ...results.map((r) => r.onMeta.deltaApplied ?? 0)),
  pollution_top2: results.reduce((s, r) => s + r.pollutionTop2, 0),
  avg_drift: results.length ? Math.round((results.reduce((s, r) => s + r.drift, 0) / results.length) * 10) / 10 : 0,
  pass_rate_pct: Math.round((results.filter((r) => r.pass).length / results.length) * 100),
  dutch_pass: results.filter((r) => r.group === "dutch" && r.pass).length,
  dutch_total: results.filter((r) => r.group === "dutch").length,
  mixed_pass: results.filter((r) => r.group === "mixed" && r.pass).length,
  trust_pass: results.filter((r) => r.group === "trust" && r.pass).length,
  vertical_apply_flags_off: true,
  unified_apply_off: true,
  live,
  results,
  recommendation:
    failed === 0
      ? "staging_soak_pass_continue_cross_layer_audit"
      : "extend_staging_soak_do_not_enable_production_apply",
};

saveValidationRun(report, "intent-apply-staging-soak");

console.log("\n--- P4.2 STAGING SOAK SUMMARY ---");
console.log(JSON.stringify({
  pass: failed === 0,
  pass_rate_pct: report.pass_rate_pct,
  max_delta: report.max_delta,
  pollution_top2: report.pollution_top2,
  dutch: `${report.dutch_pass}/${report.dutch_total}`,
  recommendation: report.recommendation,
}, null, 2));

if (failed) process.exit(1);
console.log("\nIntent apply staging soak passed");
