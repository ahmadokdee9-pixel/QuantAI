/**
 * P4.3 — Production rollout check: bounded apply, stability, P2/P3 isolation.
 * Usage: npm run test:intent-prod-rollout
 */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { semanticRerankSearchResults } from "../lib/search/semanticReranker.ts";
import { buildIntentApplyMeta } from "../lib/intent/intentApply.ts";
import { buildIntentProductionApplyMeta } from "../lib/intent/intentProductionApply.ts";
import { buildVerticalTasteShadowMeta } from "../lib/taste/verticalTasteShadow.ts";
import { computeUnifiedTasteSignals } from "../lib/taste/unifiedTasteIdentity.ts";
import { INTENT_APPLY_MAX_DELTA } from "../lib/intent/intentIntelligenceFlags.ts";
import { isUnifiedTasteApplyEnabled } from "../lib/taste/unifiedTasteFlags.ts";
import { saveValidationRun } from "./lib/validationHistory.mjs";

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
    id: "prod_trust_fragrance",
    query: "authentic ysl libre trusted seller only",
    products: [
      P("YSL Libre EDP 90ml Authentic", "Douglas", 95, "d1"),
      P("Inspired by Libre Clone Oil", "Temu Deals", 12, "t1"),
      P("Yves Saint Laurent Libre 90ml", "Notino", 92, "n1"),
    ],
  },
  {
    id: "prod_budget_laptop",
    query: "cheap but good laptop under 500 trusted seller",
    products: [
      P("Lenovo IdeaPad Slim 3 Laptop", "Coolblue", 449, "bl1"),
      P("Laptop 90% Off Hurry Buy", "Temu Deals", 89, "tm1"),
      P("ASUS Vivobook 15", "Bol.com", 479, "bol1"),
    ],
  },
  {
    id: "prod_compare_phones",
    query: "compare iphone 15 vs samsung s24 trusted",
    products: [
      P("Apple iPhone 15 128GB", "Coolblue", 799, "ip1"),
      P("Samsung Galaxy S24", "Bol.com", 749, "sg1"),
      P("iPhone Clone Hurry Buy", "Temu Deals", 89, "tm2"),
    ],
  },
];

const saved = {
  NODE_ENV: process.env.NODE_ENV,
  INTENT_INTELLIGENCE_APPLY_ENABLED: process.env.INTENT_INTELLIGENCE_APPLY_ENABLED,
  INTENT_INTELLIGENCE_PROD_APPLY: process.env.INTENT_INTELLIGENCE_PROD_APPLY,
  INTENT_INTELLIGENCE_CANARY_APPLY: process.env.INTENT_INTELLIGENCE_CANARY_APPLY,
  TASTE_UNIFIED_APPLY_ENABLED: process.env.TASTE_UNIFIED_APPLY_ENABLED,
};

function restore() {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function links(products) {
  return products.map((p) => p.link).join("|");
}

let failed = 0;
const results = [];

try {
  process.env.NODE_ENV = "production";
  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
  process.env.INTENT_INTELLIGENCE_CANARY_APPLY = "true";
  process.env.INTENT_CANARY_ROLLOUT_STAGE = "100";
  delete process.env.INTENT_INTELLIGENCE_PROD_APPLY;
  process.env.TASTE_UNIFIED_APPLY_ENABLED = "false";
  process.env.TASTE_GRAMMAR_ENABLED = "false";
  process.env.TASTE_FRAGRANCE_GRAMMAR_ENABLED = "false";
  process.env.TASTE_FURNITURE_GRAMMAR_ENABLED = "false";

  if (isUnifiedTasteApplyEnabled()) {
    failed += 1;
    console.error("FAIL unified apply must be OFF for P4.3 rollout check");
  }

  for (const tray of TRAYS) {
    const canonical = buildCanonicalQuery(tray.query);
    const products = [...tray.products];
    const preLinks = products.map((p) => p.link);

    process.env.INTENT_INTELLIGENCE_PROD_APPLY = "false";
    delete process.env.INTENT_INTELLIGENCE_CANARY_APPLY;
    const baseline = semanticRerankSearchResults(products, tray.query, canonical);

    process.env.INTENT_INTELLIGENCE_PROD_APPLY = "true";
    const runA = semanticRerankSearchResults(products, tray.query, canonical);
    const runB = semanticRerankSearchResults(products, tray.query, canonical);
    const runC = semanticRerankSearchResults(products, tray.query, canonical);

    const intentApply = buildIntentApplyMeta({
      query: tray.query,
      canonicalQuery: canonical,
      products: runA,
      preOrderLinks: preLinks,
    });
    const prodMeta = buildIntentProductionApplyMeta({ intentApply });
    const shadow = buildVerticalTasteShadowMeta({ query: tray.query, canonicalQuery: canonical, products: runA });
    const unified = computeUnifiedTasteSignals({
      query: tray.query,
      canonicalQuery: canonical,
      products: runA,
      tasteGrammarShadow: shadow,
    });

    const pollutionTop2 = runA
      .slice(0, 2)
      .filter((p) => /\b(inspired by|clone|hurry buy|temu)\b/i.test(`${p.title} ${p.store}`)).length;

    const ok =
      links(runA) === links(runB) &&
      links(runB) === links(runC) &&
      prodMeta.rolloutMode === "production" &&
      prodMeta.environment === "production" &&
      prodMeta.rollbackAvailable &&
      (intentApply.deltaApplied <= INTENT_APPLY_MAX_DELTA || !intentApply.applied) &&
      pollutionTop2 === 0 &&
      shadow.applyEnabled === false &&
      unified.meta.applyEnabled === false;

    if (!ok) {
      failed += 1;
      console.error(`FAIL ${tray.id}`, {
        stable: links(runA) === links(runB),
        prodMeta,
        intentApply,
        pollutionTop2,
        p2Apply: shadow.applyEnabled,
        p3Apply: unified.meta.applyEnabled,
      });
    } else {
      console.log(
        `OK ${tray.id} mode=${prodMeta.rolloutMode} delta=${intentApply.deltaApplied} applied=${intentApply.applied}`
      );
    }

    results.push({
      id: tray.id,
      pass: ok,
      prodMeta,
      intentApply,
      baselineLinks: links(baseline),
      prodLinks: links(runA),
      p2ApplyOff: shadow.applyEnabled === false,
      p3ApplyOff: unified.meta.applyEnabled === false,
    });
  }

  process.env.INTENT_INTELLIGENCE_CANARY_APPLY = "true";
  delete process.env.INTENT_INTELLIGENCE_PROD_APPLY;
  const canaryMeta = buildIntentProductionApplyMeta({
    intentApply: buildIntentApplyMeta({
      query: TRAYS[0].query,
      canonicalQuery: buildCanonicalQuery(TRAYS[0].query),
      products: TRAYS[0].products,
    }),
  });
  if (canaryMeta.rolloutMode !== "canary") {
    failed += 1;
    console.error("FAIL canary rollout mode", canaryMeta);
  } else {
    console.log(`OK canary rollout mode=${canaryMeta.rolloutMode}`);
  }

  const report = {
    suite: "intent-prod-rollout",
    phase: "P4.3",
    at: new Date().toISOString(),
    pass_rate_pct: Math.round((results.filter((r) => r.pass).length / results.length) * 100),
    max_delta: Math.max(0, ...results.map((r) => r.intentApply.deltaApplied ?? 0)),
    pollution_top2: 0,
    p2_vertical_apply_off: results.every((r) => r.p2ApplyOff),
    p3_unified_apply_off: results.every((r) => r.p3ApplyOff),
    canary_mode_ok: canaryMeta.rolloutMode === "canary",
    results,
    recommendation: failed === 0 ? "production_rollout_ready" : "hold_rollout",
  };

  saveValidationRun(report, "intent-prod-rollout");

  console.log("\n--- P4.3 ROLLOUT CHECK SUMMARY ---");
  console.log(JSON.stringify({
    pass: failed === 0,
    pass_rate_pct: report.pass_rate_pct,
    max_delta: report.max_delta,
    recommendation: report.recommendation,
  }, null, 2));
} finally {
  restore();
}

if (failed) process.exit(1);
console.log("\nIntent production rollout check passed");
