/**
 * P4.2 — Cross-layer drift audit (P2 vertical shadow / P3 unified meta / P4 intent / P4.1 apply).
 * Confirms per-layer caps and no unbounded stacking when layers are isolated.
 * Usage: npm run test:intent-apply-cross-layer-audit
 */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { semanticRerankSearchResults } from "../lib/search/semanticReranker.ts";
import { buildIntentApplyMeta, computeIntentApplyDelta } from "../lib/intent/intentApply.ts";
import { computeIntentIntelligence } from "../lib/intent/intentIntelligenceEngine.ts";
import { INTENT_APPLY_MAX_DELTA } from "../lib/intent/intentIntelligenceFlags.ts";
import { buildVerticalTasteShadowMeta } from "../lib/taste/verticalTasteShadow.ts";
import { computeUnifiedTasteSignals } from "../lib/taste/unifiedTasteIdentity.ts";
import { computeWatchTasteApplyDelta } from "../lib/taste/watchTasteApply.ts";
import { computeFragranceTasteApplyDelta } from "../lib/taste/fragranceTasteApply.ts";
import { computeFurnitureTasteApplyDelta } from "../lib/taste/furnitureTasteApply.ts";
import { computeUnifiedTasteApplyDelta } from "../lib/taste/unifiedTasteApply.ts";
import {
  TASTE_WATCH_APPLY_MAX_DELTA,
  TASTE_FRAGRANCE_APPLY_MAX_DELTA,
  TASTE_FURNITURE_APPLY_MAX_DELTA,
} from "../lib/taste/verticalTasteFlags.ts";
import { TASTE_UNIFIED_APPLY_MAX_DELTA } from "../lib/taste/unifiedTasteFlags.ts";
import { saveValidationRun } from "./lib/validationHistory.mjs";

const P = (title, store, price, link) => ({
  title,
  store,
  price,
  link,
  extensions: [],
  rating: 4.2,
});

const AUDIT_TRAYS = [
  {
    id: "watch_quiet_luxury",
    layer: "P2_watch",
    query: "elegant swiss dress watch quiet luxury",
    products: [
      P("Tissot Gentleman Powermatic Dress Watch Swiss", "A", 650, "a1"),
      P("Casio Fitness Smart Watch Step Counter", "B", 45, "b1"),
      P("Hamilton Jazzmaster Dress Automatic", "C", 720, "c1"),
    ],
  },
  {
    id: "fragrance_libre",
    layer: "P2_fragrance",
    query: "yves saint laurent libre edp 90ml authentic",
    products: [
      P("YSL Libre EDP 90ml Authentic", "Douglas", 95, "d1"),
      P("Inspired by Libre Clone Oil", "Temu", 12, "t1"),
      P("Yves Saint Laurent Libre 90ml", "Notino", 92, "n1"),
    ],
  },
  {
    id: "furniture_minimal",
    layer: "P2_furniture",
    query: "minimal oak desk setup clean",
    products: [
      P("Oak Standing Desk Matte Cable Management Minimal", "A", 420, "f1"),
      P("RGB Gaming Chair Racer LED Gamer", "B", 180, "f2"),
      P("Walnut Executive Desk Premium", "C", 890, "f3"),
    ],
  },
  {
    id: "unified_cross_vertical",
    layer: "P3_unified",
    query: "quiet luxury minimal office watch aesthetic",
    products: [
      P("Tissot Dress Watch Quiet Luxury Swiss", "A", 620, "u1"),
      P("Minimal Oak Desk Setup", "B", 410, "u2"),
      P("RGB Gamer Chair LED", "C", 150, "u3"),
    ],
  },
  {
    id: "intent_trust_budget",
    layer: "P4_P41",
    query: "cheap but good laptop under 500 trusted seller",
    products: [
      P("Lenovo IdeaPad Slim 3 Laptop", "Coolblue", 449, "i1"),
      P("Laptop 90% Off Hurry Buy", "Temu Deals", 89, "i2"),
      P("ASUS Vivobook 15", "Bol.com", 479, "i3"),
    ],
  },
];

process.env.NODE_ENV = "development";
process.env.TASTE_GRAMMAR_ENABLED = "false";
process.env.TASTE_FRAGRANCE_GRAMMAR_ENABLED = "false";
process.env.TASTE_FURNITURE_GRAMMAR_ENABLED = "false";
process.env.TASTE_UNIFIED_APPLY_ENABLED = "false";
process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";

let failed = 0;
const layers = [];
const capViolations = [];

function trayLinks(products) {
  return products.map((p) => p.link).join("|");
}

function auditLayerCaps(tray, canonical, intent) {
  const signals = computeUnifiedTasteSignals({
    query: tray.query,
    canonicalQuery: canonical,
    products: tray.products,
  });
  const traces = [];
  for (const p of tray.products) {
    const watchD =
      tray.layer === "P2_watch"
        ? computeWatchTasteApplyDelta(tray.query, p, canonical)
        : 0;
    const fragD =
      tray.layer === "P2_fragrance"
        ? computeFragranceTasteApplyDelta(tray.query, p, canonical)
        : 0;
    const furnD =
      tray.layer === "P2_furniture"
        ? computeFurnitureTasteApplyDelta(tray.query, p, canonical)
        : 0;
    const unifiedD =
      tray.layer === "P3_unified"
        ? computeUnifiedTasteApplyDelta({
            query: tray.query,
            product: p,
            canonicalQuery: canonical,
            signals,
          })
        : 0;
    const intentR = computeIntentApplyDelta({
      product: p,
      canonicalQuery: canonical,
      intent,
      medianPrice: 400,
      products: tray.products,
    });
    const intentD = intentR.delta;

    const checks = [
      { layer: "P2_watch", delta: watchD, cap: TASTE_WATCH_APPLY_MAX_DELTA },
      { layer: "P2_fragrance", delta: fragD, cap: TASTE_FRAGRANCE_APPLY_MAX_DELTA },
      { layer: "P2_furniture", delta: furnD, cap: TASTE_FURNITURE_APPLY_MAX_DELTA },
      { layer: "P3_unified", delta: unifiedD, cap: TASTE_UNIFIED_APPLY_MAX_DELTA },
      { layer: "P4.1_intent", delta: intentD, cap: INTENT_APPLY_MAX_DELTA },
    ];
    for (const c of checks) {
      if (Math.abs(c.delta) > c.cap + 0.01) {
        capViolations.push({
          tray: tray.id,
          title: p.title.slice(0, 40),
          layer: c.layer,
          delta: c.delta,
          cap: c.cap,
        });
      }
    }
    traces.push({
      title: p.title.slice(0, 36),
      watchDelta: watchD,
      fragranceDelta: fragD,
      furnitureDelta: furnD,
      unifiedDelta: unifiedD,
      intentDelta: intentD,
    });
  }
  return traces;
}

for (const tray of AUDIT_TRAYS) {
  const canonical = buildCanonicalQuery(tray.query);
  const shadow = buildVerticalTasteShadowMeta({
    query: tray.query,
    canonicalQuery: canonical,
    products: tray.products,
  });
  const unified = computeUnifiedTasteSignals({
    query: tray.query,
    canonicalQuery: canonical,
    products: tray.products,
    tasteGrammarShadow: shadow,
  });
  const intent = computeIntentIntelligence({ query: tray.query, canonicalQuery: canonical });
  const intentApply = buildIntentApplyMeta({
    query: tray.query,
    canonicalQuery: canonical,
    products: tray.products,
    preOrderLinks: tray.products.map((p) => p.link),
  });

  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "false";
  const offRanked = semanticRerankSearchResults([...tray.products], tray.query, canonical);
  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
  const onRanked = semanticRerankSearchResults([...tray.products], tray.query, canonical);

  const drift = trayLinks(offRanked) !== trayLinks(onRanked);
  const capTrace = auditLayerCaps(tray, canonical, intent);

  const p2ApplyOff = shadow.applyEnabled === false;
  const p3ApplyOff = unified.meta.applyEnabled === false;
  const p4MetaOn = intent.active && intent.confidence >= 0.35;
  const p41Bounded =
    !intentApply.applied || (intentApply.deltaApplied <= INTENT_APPLY_MAX_DELTA && intentApply.integrityPass);

  const ok = p2ApplyOff && p3ApplyOff && p4MetaOn && p41Bounded;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${tray.id}`, {
      p2ApplyOff,
      p3ApplyOff,
      p4MetaOn,
      p41Bounded,
      intentApply,
      drift,
    });
  } else {
    console.log(
      `OK ${tray.id} shadow=${shadow.active} unified=${unified.meta.active} intent=${intent.confidence.toFixed(2)} apply=${intentApply.applied} drift=${drift}`
    );
  }

  layers.push({
    id: tray.id,
    layer: tray.layer,
    pass: ok,
    drift,
    shadow: {
      active: shadow.active,
      applyEnabled: shadow.applyEnabled,
      vertical: shadow.vertical,
    },
    unified: {
      active: unified.meta.active,
      applyEnabled: unified.meta.applyEnabled,
      coherence: unified.meta.coherenceScore,
      prestige: unified.meta.prestigeIntegrity,
    },
    intent: {
      active: intent.active,
      confidence: intent.confidence,
      applyEnabled: intent.applyEnabled,
    },
    intentApply,
    capTrace,
  });
}

if (capViolations.length) {
  failed += capViolations.length;
  console.error("FAIL cap violations", capViolations);
} else {
  console.log("OK all per-layer deltas within caps");
}

const report = {
  suite: "intent-apply-cross-layer-drift",
  phase: "P4.2",
  at: new Date().toISOString(),
  p2_vertical_apply_off: layers.every((l) => l.shadow.applyEnabled === false),
  p3_unified_apply_off: layers.every((l) => l.unified.applyEnabled === false),
  p4_intent_meta_active: layers.filter((l) => l.intent.active).length,
  p41_intent_apply_bounded: layers.every(
    (l) => !l.intentApply.applied || l.intentApply.deltaApplied <= INTENT_APPLY_MAX_DELTA
  ),
  drift_trays: layers.filter((l) => l.drift).map((l) => l.id),
  cap_violations: capViolations,
  max_intent_delta: Math.max(0, ...layers.map((l) => l.intentApply.deltaApplied ?? 0)),
  pass_rate_pct: Math.round((layers.filter((l) => l.pass).length / layers.length) * 100),
  layers,
  recommendation:
    failed === 0
      ? "cross_layer_isolated_no_cap_breach"
      : "hold_production_apply_investigate_drift_or_caps",
};

saveValidationRun(report, "intent-apply-cross-layer-drift");

console.log("\n--- P4.2 CROSS-LAYER DRIFT SUMMARY ---");
console.log(JSON.stringify({
  pass: failed === 0,
  drift_trays: report.drift_trays,
  cap_violations: report.cap_violations.length,
  recommendation: report.recommendation,
}, null, 2));

if (failed) process.exit(1);
console.log("\nIntent apply cross-layer audit passed");
