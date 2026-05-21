/**
 * P4.1 — Intent apply soak trays (OFF vs ON).
 * Usage: npm run test:intent-apply-soak
 */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { semanticRerankSearchResults } from "../lib/search/semanticReranker.ts";
import { buildIntentApplyMeta } from "../lib/intent/intentApply.ts";
import { computeIntentIntelligence } from "../lib/intent/intentIntelligenceEngine.ts";
import { saveValidationRun } from "./lib/validationHistory.mjs";

const POLLUTION_RX = /\b(inspired by|dupe|clone|fake discount|temu|only 2 left|hurry buy)\b/i;

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
    id: "budget_laptops",
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
    query: "جزمة مثل nike vomero بس ارخص",
    minConfidence: 0.68,
    products: [
      P("Nike Vomero Premium Running Shoes", "Nike", 140, "nk1"),
      P("Nike Vomero Style Sneaker Budget Look", "Temu Deals", 29, "tm3"),
      P("Nike Air Zoom Vomero 16", "Bol.com", 125, "bol2"),
    ],
  },
];

process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "false";
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

  const pollutionTop2 = onRanked.slice(0, 2).filter((p) => POLLUTION_RX.test(p.title) || POLLUTION_RX.test(p.store)).length;
  const stores = new Set(onRanked.slice(0, 3).map((p) => p.store.trim().toLowerCase()));

  const ok =
    intent.confidence >= tray.minConfidence &&
    onMeta.applied &&
    onMeta.applyEnabled &&
    onMeta.integrityPass &&
    onMeta.deltaApplied <= 3 &&
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
    pass: ok,
    drift,
    pollutionTop2,
    offOrder: offRanked.map((p) => ({ link: p.link, title: p.title.slice(0, 48) })),
    onOrder: onRanked.map((p) => ({ link: p.link, title: p.title.slice(0, 48) })),
    onMeta,
    intentConfidence: intent.confidence,
  });
}

const report = {
  suite: "intent-apply-soak",
  phase: "P4.1",
  at: new Date().toISOString(),
  apply_enabled: true,
  max_delta: Math.max(0, ...results.map((r) => r.onMeta.deltaApplied ?? 0)),
  pollution_top2: results.reduce((s, r) => s + r.pollutionTop2, 0),
  avg_drift: results.length ? Math.round((results.reduce((s, r) => s + r.drift, 0) / results.length) * 10) / 10 : 0,
  pass_rate_pct: Math.round((results.filter((r) => r.pass).length / results.length) * 100),
  vertical_apply_flags_off: true,
  unified_apply_off: true,
  results,
};

saveValidationRun(report, "intent-apply-soak");

if (failed) process.exit(1);
console.log("\nIntent apply soak passed");
