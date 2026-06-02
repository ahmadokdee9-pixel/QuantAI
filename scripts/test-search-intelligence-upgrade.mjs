#!/usr/bin/env node
/**
 * Phase 3 search intelligence upgrade — unit smoke tests (no network).
 */
import assert from "node:assert/strict";
import { hardCategoryMismatch } from "../lib/commerce/queryCategoryGuard.ts";
import { extractSearchIntent } from "../lib/search/intentExtractionEngine.ts";
import { extractSearchConstraints } from "../lib/search/constraintExtractionEngine.ts";
import { assessPriceSanity, isHardPriceSanityReject } from "../lib/intelligence/priceSanityEngine.ts";
import { applySearchIntelligenceUpgrade } from "../lib/search/searchIntelligenceUpgrade.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { applyHardIdentityGate } from "../lib/intelligence/productIdentity.ts";

function mockProduct(title, store, price, extra = {}) {
  return {
    title,
    store,
    price,
    link: `https://example.com/${encodeURIComponent(title.slice(0, 20))}`,
    image: "",
    rating: 4.2,
    reviewsCount: 50,
    extensions: [],
    qiComposite: 70,
    qiBuyingDecision: { confidence: 72, action: "STRONG_VALUE" },
    ...extra,
  };
}

// Category protection
assert.equal(hardCategoryMismatch("RTX 4060 graphics card", "Fujifilm Instax Mini 12 Camera"), true);
assert.equal(hardCategoryMismatch("mechanical keyboard quiet tactile", "Fujifilm Instax Mini 12 Camera"), true);
assert.equal(hardCategoryMismatch("desk organizer cable management", "IKEA GLOSTAD 2-seat sofa"), true);
assert.equal(hardCategoryMismatch("running shoes flat feet men", "Nike Air Force 1 Women"), true);

// Intent extraction
const runIntent = extractSearchIntent("running shoes flat feet men");
assert.equal(runIntent.productType, "running_shoes");
assert.equal(runIntent.gender, "men");
assert.equal(runIntent.performanceIntent, "stability_running");

const gpuIntent = extractSearchIntent("RTX 4060 graphics card");
assert.equal(gpuIntent.productType, "graphics_card");

// Constraints
const constraints = extractSearchConstraints("gaming monitor 144hz 27 inch under 500");
assert.equal(constraints.maxPrice, 500);
assert.equal(constraints.refreshRateHz, 144);
assert.equal(constraints.sizeInches, 27);

// Price sanity
const tvSanity = assessPriceSanity(
  mockProduct("Samsung 65 inch QLED 4K TV", "Skala.nl", 33.71),
  [589, 400, 300],
  "65 inch 4k smart tv best value"
);
assert.equal(isHardPriceSanityReject(tvSanity), true);

const groverSanity = assessPriceSanity(
  mockProduct("MacBook Air 15 M3", "Grover", 35.99),
  [899, 1200, 1500],
  "macbook air m3 15 inch"
);
assert.equal(isHardPriceSanityReject(groverSanity), true);

// Full upgrade — GPU query should demote camera
const gpuTray = applySearchIntelligenceUpgrade(
  [
    mockProduct("Fujifilm Instax Mini 12 Camera", "Amazon.nl", 72, { qiBuyingDecision: { confidence: 74 } }),
    mockProduct("ZOTAC GeForce RTX 4060 8GB Twin Edge", "eBay", 244, { qiBuyingDecision: { confidence: 53 } }),
    mockProduct("Fujifilm instax mini 12 Lilac", "Cameranu", 89, { qiBuyingDecision: { confidence: 62 } }),
  ],
  "RTX 4060 graphics card"
);
assert.match(gpuTray.products[0].title, /RTX 4060/i);
assert.ok(gpuTray.meta.decisionBrief);
assert.equal(gpuTray.meta.decisionBrief.headline, "QuantAI Recommendation");

// Running shoes — lifestyle demoted
const shoeTray = applySearchIntelligenceUpgrade(
  [
    mockProduct("Running Shoes Trendy Original Light Shock Absorption M7212", "Baasploa", 45, {
      qiBuyingDecision: { confidence: 84 },
    }),
    mockProduct("Nike Air Force 1 Women size 39", "Zalando", 96, { qiBuyingDecision: { confidence: 74 } }),
    mockProduct("ASICS Gel-Kayano 30 Men Stability Running Shoes", "Running Warehouse", 165, {
      qiBuyingDecision: { confidence: 62 },
    }),
    mockProduct("adidas 3MC", "Zalando", 75, { qiBuyingDecision: { confidence: 82 } }),
  ],
  "running shoes flat feet men"
);
assert.match(shoeTray.products[0].title, /Kayano|ASICS|Brooks|stability|Arahi|Hoka/i);
assert.equal(shoeTray.meta.version, "phase8-v1");

const headsetTray = applySearchIntelligenceUpgrade(
  [
    mockProduct("Ntech Gaming Headset RGB Light", "unknown-shop", 25, { qiBuyingDecision: { confidence: 80 } }),
    mockProduct("SteelSeries Arctis Nova 7P Wireless PS5 Headset", "bol.com", 149, { qiBuyingDecision: { confidence: 64 } }),
  ],
  "wireless gaming headset ps5"
);
assert.match(headsetTray.products[0].title, /SteelSeries|Arctis|Pulse|HyperX|Logitech/i);
assert.ok(shoeTray.meta.trustRanking?.applied);
assert.ok(shoeTray.meta.constraints);

// Phase 6 — identity gate must not zero trays for desk/headset electronics queries
const deskQuery = "standing desk electric height adjustable";
const deskCq = buildCanonicalQuery(deskQuery);
const deskTray = [
  mockProduct("YESHOMY Electric Standing Desk Height Adjustable", "Amazon.nl", 199),
  mockProduct("IKEA GLOSTAD 2-seat sofa", "IKEA", 99),
];
const deskGated = applyHardIdentityGate(deskTray, deskCq);
assert.ok(deskGated.length >= 1, "standing desk listings survive identity gate");
assert.match(deskGated[0].title, /standing desk/i);

const headsetQuery = "wireless gaming headset ps5";
const headsetCq = buildCanonicalQuery(headsetQuery);
const headsetGateTray = [
  mockProduct("SteelSeries Arctis 7P Wireless Gaming Headset PS5", "bol.com", 129),
];
const headsetGated = applyHardIdentityGate(headsetGateTray, headsetCq);
assert.equal(headsetGated.length, 1);
const headsetNovaGated = applyHardIdentityGate(
  [mockProduct("SteelSeries Arctis Nova 7P Wireless PS5", "bol.com", 159)],
  headsetCq
);
assert.equal(headsetNovaGated.length, 1, "headset without literal 'headset' in title");

// ── Phase 8.5 — AI GPU: modern RTX must outrank legacy GRID ──────────────────
const aiGpuTray = applySearchIntelligenceUpgrade(
  [
    mockProduct("J0G94A HP NVIDIA GRID K1 Quad GPU Module", "it-market.com", 565, {
      qiBuyingDecision: { confidence: 80 },
    }),
    mockProduct("GIGABYTE Nvidia GeForce RTX 4070 Ti SUPER Gaming OC 16GB", "Ubuy", 1526, {
      qiBuyingDecision: { confidence: 62 },
    }),
    mockProduct("PNY Quadro RTX 2000 Ada 16GB", "grafikkarten.com", 630, {
      qiBuyingDecision: { confidence: 70 },
    }),
  ],
  "best gpu for ai training"
);
assert.ok(
  /RTX|Quadro\s+RTX|GeForce/i.test(aiGpuTray.products[0].title),
  `AI GPU top result should be modern RTX, got: ${aiGpuTray.products[0].title}`
);
assert.ok(!/GRID\s*K[1-9]/i.test(aiGpuTray.products[0].title), "GRID K1 must not rank #1 for AI training");

// ── Phase 8.5 — Programming monitor: USB-C/IPS must outrank budget generic ──
const progMonTray = applySearchIntelligenceUpgrade(
  [
    mockProduct(
      "KTC Monitor 27 Inch 100Hz Budget IPS No USB-C",
      "Amazon.nl - Seller",
      129,
      { qiBuyingDecision: { confidence: 88 } }
    ),
    mockProduct(
      "Dell UltraSharp U2723QE 27 USB-C Hub IPS Monitor",
      "Coolblue",
      449,
      { qiBuyingDecision: { confidence: 65 } }
    ),
    mockProduct(
      "32 inch Smart TV 4K Android Television",
      "Coolblue",
      299,
      { qiBuyingDecision: { confidence: 72 } }
    ),
  ],
  "monitor for programming 27 inch"
);
assert.match(
  progMonTray.products[0].title,
  /ultrasharp|usb[-\s]?c|proart|ips\s+monitor|eizo|lg\s+27|benq|dell\s+u\d/i,
  `Programming monitor top result should be productivity/IPS, got: ${progMonTray.products[0].title}`
);

// ── Phase 8.5 — Tactile keyboard: tactile switch must outrank linear ────────
const tactileKbTray = applySearchIntelligenceUpgrade(
  [
    mockProduct(
      "Perixx PERIBOARD-108M Mechanical Full-Size Keyboard Quiet Linear Red",
      "Perixx EU",
      44,
      { qiBuyingDecision: { confidence: 82 } }
    ),
    mockProduct(
      "be quiet! Dark Mount Silent Tactile Mechanical Keyboard",
      "Azerty",
      239,
      { qiBuyingDecision: { confidence: 60 } }
    ),
    mockProduct(
      "X-Bows Knight Ergonomic Mechanical Silent Brown Tactile Switch",
      "X-bows",
      265,
      { qiBuyingDecision: { confidence: 58 } }
    ),
  ],
  "mechanical keyboard quiet tactile"
);
assert.ok(
  /tactile|silent\s+brown|brown\s+switch|silent\s+tactile/i.test(tactileKbTray.products[0].title),
  `Tactile keyboard top result must have tactile switch, got: ${tactileKbTray.products[0].title}`
);
assert.ok(
  !/linear\s+red/i.test(tactileKbTray.products[0].title),
  `Top result must not be linear red for tactile query`
);

// ── Phase 8 protected-query regressions ────────────────────────────────────
// Running shoes: stability still wins
const regressionShoeTray = applySearchIntelligenceUpgrade(
  [
    mockProduct("Running Shoes Trendy Original Shock Absorption M7212", "Baasploa", 45, {
      qiBuyingDecision: { confidence: 84 },
    }),
    mockProduct("ASICS Gel-Kayano 30 Men Stability Running Shoes", "Running Warehouse", 165, {
      qiBuyingDecision: { confidence: 62 },
    }),
  ],
  "running shoes flat feet men"
);
assert.match(regressionShoeTray.products[0].title, /Kayano|ASICS|Arahi|Hoka|stability/i, "running shoes regression");

// Headset: SteelSeries still beats Ntech
const regressionHeadsetTray = applySearchIntelligenceUpgrade(
  [
    mockProduct("Ntech Gaming Headset RGB Light", "unknown-shop", 25, { qiBuyingDecision: { confidence: 80 } }),
    mockProduct("SteelSeries Arctis Nova 7P Wireless PS5 Headset", "bol.com", 149, {
      qiBuyingDecision: { confidence: 64 },
    }),
  ],
  "wireless gaming headset ps5"
);
assert.match(regressionHeadsetTray.products[0].title, /SteelSeries|Arctis|Pulse|HyperX/i, "headset regression");

console.log("Phase 3 + Phase 8.5 search intelligence upgrade tests passed.");
