/**
 * Phase 3.2 unified taste apply canary — OFF vs ON comparison.
 * Usage: TASTE_UNIFIED_APPLY_ENABLED=true npx --yes tsx scripts/unified-taste-canary-eval.mjs
 */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { semanticRerankSearchResults } from "../lib/search/semanticReranker.ts";
import { buildVerticalTasteShadowMeta } from "../lib/taste/verticalTasteShadow.ts";
import { buildUnifiedTasteCanaryMeta } from "../lib/taste/unifiedTasteApply.ts";
import { saveValidationRun } from "./lib/validationHistory.mjs";

const POLLUTION_RX = /\b(gaming|rgb|inspired by|dupe|clone|fitness|smart watch|luxury look|viral|tiktok)\b/i;

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
    query: "elegant swiss dress watch quiet luxury",
    products: [
      P("Tissot Gentleman Powermatic Dress Watch Swiss", "A", 650, "a1"),
      P("Casio Fitness Smart Watch Step Counter", "B", 45, "b1"),
      P("Hamilton Jazzmaster Dress Automatic", "C", 720, "c1"),
    ],
  },
  {
    query: "yves saint laurent libre edp 90ml",
    products: [
      P("Yves Saint Laurent Libre Eau de Parfum 90ml", "D", 95, "d1"),
      P("Inspired by Libre Type Scent Oil 10ml", "E", 12, "e1"),
      P("YSL Libre EDP 90ml Sealed Authentic", "F", 92, "f1"),
    ],
  },
  {
    query: "minimal oak desk setup clean",
    products: [
      P("Oak Standing Desk Matte Cable Management Minimal", "G", 420, "g1"),
      P("RGB Gaming Chair Racer LED Gamer", "H", 89, "h1"),
      P("Walnut Minimal Office Desk Steel Frame", "I", 380, "i1"),
    ],
  },
  {
    query: "niche artisan haute parfum extrait collector",
    products: [
      P("Tom Ford Private Blend Extrait Parfum 50ml", "J", 320, "j1"),
      P("Inspired by Tom Ford Clone Oil", "K", 15, "k1"),
      P("Maison Francis Kurkdjian Extrait 70ml", "L", 290, "l1"),
    ],
  },
  {
    query: "executive ergonomic workspace premium",
    products: [
      P("Steelcase Gesture Ergonomic Office Chair Lumbar", "M", 890, "m1"),
      P("Racing Style Gamer Chair Ergonomic Look", "N", 120, "n1"),
      P("Herman Miller Aeron Executive Chair", "O", 950, "o1"),
    ],
  },
];

process.env.TASTE_UNIFIED_APPLY_ENABLED = "false";
process.env.TASTE_GRAMMAR_ENABLED = "false";
process.env.TASTE_FRAGRANCE_GRAMMAR_ENABLED = "false";
process.env.TASTE_FURNITURE_GRAMMAR_ENABLED = "false";

let failed = 0;
const results = [];

for (const tray of TRAYS) {
  const canonical = buildCanonicalQuery(tray.query);
  const preLinks = tray.products.map((p) => p.link);

  process.env.TASTE_UNIFIED_APPLY_ENABLED = "false";
  const offRanked = semanticRerankSearchResults([...tray.products], tray.query, canonical);
  const offShadow = buildVerticalTasteShadowMeta({ query: tray.query, canonicalQuery: canonical, products: offRanked });
  const offMeta = buildUnifiedTasteCanaryMeta({
    query: tray.query,
    canonicalQuery: canonical,
    products: offRanked,
    tasteGrammarShadow: offShadow,
    preOrderLinks: preLinks,
  });

  process.env.TASTE_UNIFIED_APPLY_ENABLED = "true";
  const onRanked = semanticRerankSearchResults([...tray.products], tray.query, canonical);
  const onShadow = buildVerticalTasteShadowMeta({ query: tray.query, canonicalQuery: canonical, products: onRanked });
  const onMeta = buildUnifiedTasteCanaryMeta({
    query: tray.query,
    canonicalQuery: canonical,
    products: onRanked,
    preOrderLinks: preLinks,
    tasteGrammarShadow: onShadow,
  });

  const offTop2 = offRanked.slice(0, 2).map((p) => p.link);
  const onTop2 = onRanked.slice(0, 2).map((p) => p.link);
  let drift = 0;
  for (let i = 0; i < Math.min(offTop2.length, onTop2.length); i += 1) {
    if (offTop2[i] !== onTop2[i]) drift += 1;
  }

  const pollutionRank = onRanked.findIndex((p) => POLLUTION_RX.test(p.title));
  const pollutionTop2 = onRanked.slice(0, 2).filter((p) => POLLUTION_RX.test(p.title)).length;
  const coherenceGain = onMeta.coherenceScore - offMeta.coherenceScore;

  const ok =
    onMeta.active &&
    onMeta.applyEligible &&
    onMeta.applyDeltaMax <= 4 &&
    pollutionTop2 === 0 &&
    (pollutionRank < 0 || pollutionRank >= 2) &&
    !onMeta.trayCollapse &&
    onMeta.storeDiversityTop5 >= 2 &&
    onMeta.prestigeIntegrity >= 0.68 &&
    drift <= 3 &&
    onMeta.coherenceScore >= 0.55;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${tray.query}`, { drift, pollutionTop2, onMeta });
  } else {
    console.log(
      `OK ${tray.query} drift=${drift} maxDelta=${onMeta.applyDeltaMax} coherence=${onMeta.coherenceScore} prestige=${onMeta.prestigeIntegrity}`
    );
  }

  results.push({
    query: tray.query,
    pass: ok,
    drift,
    pollutionTop2,
    coherenceGain,
    off: offMeta,
    on: onMeta,
  });
}

const report = {
  suite: "unified-taste-canary",
  phase: "P3.2",
  at: new Date().toISOString(),
  apply_enabled: true,
  max_apply_delta: Math.max(0, ...results.map((r) => r.on.applyDeltaMax ?? 0)),
  pollution_top2: results.reduce((s, r) => s + r.pollutionTop2, 0),
  avg_drift: results.length
    ? Math.round((results.reduce((s, r) => s + r.drift, 0) / results.length) * 10) / 10
    : 0,
  min_prestige_integrity: Math.min(...results.map((r) => r.on.prestigeIntegrity ?? 0)),
  avg_coherence_gain: results.length
    ? Math.round((results.reduce((s, r) => s + r.coherenceGain, 0) / results.length) * 1000) / 1000
    : 0,
  vertical_apply_flags_off: true,
  results,
};

saveValidationRun(report, "unified-taste-canary");

if (failed) process.exit(1);
console.log("\nUnified taste apply canary eval passed");
