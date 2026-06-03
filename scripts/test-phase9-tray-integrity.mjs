#!/usr/bin/env node
/**
 * Phase 9.2 — Top-3 diversity + compare integrity tests (offline, no network).
 */
import assert from "node:assert/strict";
import { extractSearchIntent } from "../lib/search/intentExtractionEngine.ts";
import {
  applyCompareIntentIntegrity,
  entityMatchScore,
  parseCompareEntities,
  validateCompareCoverage,
} from "../lib/search/compareIntentIntegrity.ts";
import { applyPhase92TrayIntegrity } from "../lib/search/phase92TrayIntegrity.ts";
import {
  applyTop3DiversityProtection,
  countNearDuplicateTitlesInTop,
  merchantCountsTop3,
  titleFingerprint,
} from "../lib/search/top3DiversityIntegrity.ts";
import { applySearchIntelligenceUpgrade } from "../lib/search/searchIntelligenceUpgrade.ts";

function p(title, store, qiComposite, extra = {}) {
  return {
    title,
    store,
    price: 99,
    link: `https://example.com/${encodeURIComponent(title.slice(0, 18))}`,
    image: "",
    rating: 4.2,
    reviewsCount: 40,
    extensions: [],
    qiComposite,
    qiBuyingDecision: { confidence: qiComposite, action: "STRONG_VALUE" },
    ...extra,
  };
}

// ── Compare entity parsing ───────────────────────────────────────────────────
const compareParsed = parseCompareEntities("compare airpods pro vs airpods 4");
assert.ok(compareParsed);
assert.match(compareParsed.left, /airpods pro/i);
assert.match(compareParsed.right, /airpods 4/i);

assert.equal(parseCompareEntities("iphone 16"), null);

// ── Compare coverage validation ──────────────────────────────────────────────
const compareTray = [
  p("Apple AirPods Pro 2 USB-C", "bol.com", 88),
  p("Apple AirPods Pro MagSafe Case", "bol.com", 86),
  p("Apple AirPods Pro Tip Pack", "amazon.nl", 84),
  p("Sony WH-1000XM5 Headphones", "amazon.nl", 82),
  p("JBL Tune Buds", "coolblue", 78),
  p("Apple AirPods 4 with Active Noise Cancellation", "coolblue", 84),
];
const entities = ["airpods pro", "airpods 4"];
const beforeCoverage = validateCompareCoverage(compareTray, entities, 3);
assert.equal(beforeCoverage.entityCoverage["airpods 4"], false, "top3 should miss airpods 4 before promotion");

const compareIntent = extractSearchIntent("compare airpods pro vs airpods 4");
const comparePass = applyCompareIntentIntegrity(compareTray, "compare airpods pro vs airpods 4", compareIntent);
assert.equal(comparePass.meta.active, true);
assert.equal(comparePass.meta.bothEntitiesRepresented, true, "both entities must appear in top6 after integrity pass");
assert.ok(
  entityMatchScore(comparePass.products[0].title, "airpods pro") >= 0.5 ||
    entityMatchScore(comparePass.products[1].title, "airpods pro") >= 0.5
);

// ── Top-3 merchant domination (airpods QA failure pattern) ─────────────────────
const fruugoDominated = [
  p("Apple AirPods Pro 2", "fruugo", 92),
  p("Apple AirPods Pro 2 USB-C", "fruugo", 91),
  p("Apple AirPods Pro MagSafe", "fruugo", 90),
  p("Apple AirPods 4 ANC", "coolblue", 86),
  p("Apple AirPods 4", "bol.com", 85),
  p("Sony WF-1000XM5", "amazon.nl", 84),
];
const beforeMerchantCounts = merchantCountsTop3(fruugoDominated);
assert.ok((beforeMerchantCounts.fruugo ?? 0) >= 2, "fixture: fruugo dominates top3");

const diversityPass = applyTop3DiversityProtection(fruugoDominated);
for (const n of Object.values(diversityPass.meta.top3MerchantCounts)) {
  assert.ok(n <= 1, `top3 merchant count ${n} > 1 after diversity pass`);
}
assert.equal(diversityPass.meta.top3NearDuplicateTitles, 0);

// ── Near-duplicate iPhone titles (iphone 16 QA failure pattern) ───────────────
const iphoneDupes = [
  p("Apple iPhone 16 Pro Max 256GB Titanium", "apple.com", 95),
  p("Apple iPhone 16 Pro Max 256GB Titanium Natural", "apple.com", 94),
  p("Apple iPhone 16 Pro Max 256GB Desert Titanium", "apple.com", 93),
  p("Samsung Galaxy S24 Ultra 256GB", "samsung.com", 88),
  p("Google Pixel 9 Pro XL", "google.com", 86),
];
assert.ok(countNearDuplicateTitlesInTop(iphoneDupes) >= 1, "fixture has near-duplicate titles");
const iphoneOut = applyTop3DiversityProtection(iphoneDupes);
assert.equal(countNearDuplicateTitlesInTop(iphoneOut.products), 0);
assert.equal(iphoneOut.products[0].title, iphoneDupes[0].title, "rank #1 preserved");

// ── Full Phase 9.2 orchestrator does not break Phase 8 protected queries ─────
const protectedQueries = [
  {
    query: "running shoes flat feet men",
    tray: [
      p("Running Shoes Trendy Shock Absorption M7212", "Baasploa", 84),
      p("ASICS Gel-Kayano 30 Men Stability Running Shoes", "Running Warehouse", 62),
    ],
    expect: /Kayano|ASICS|stability/i,
  },
  {
    query: "wireless gaming headset ps5",
    tray: [
      p("Ntech Gaming Headset RGB", "unknown-shop", 80),
      p("SteelSeries Arctis Nova 7P Wireless PS5 Headset", "bol.com", 64),
    ],
    expect: /SteelSeries|Arctis/i,
  },
];

for (const c of protectedQueries) {
  const intent = extractSearchIntent(c.query);
  const upgraded = applySearchIntelligenceUpgrade(c.tray, c.query);
  const out = applyPhase92TrayIntegrity(upgraded.products, c.query, intent);
  assert.match(out.products[0].title, c.expect, `${c.query} regression after phase 9.2`);
}

// ── Title fingerprint sanity ─────────────────────────────────────────────────
assert.equal(
  titleFingerprint("Apple iPhone 16 Pro Max 256GB Titanium"),
  titleFingerprint("Apple iPhone 16 Pro Max 256GB Titanium Natural")
);

console.log("phase9-tray-integrity: ok");
