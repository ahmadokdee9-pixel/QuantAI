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
    mockProduct("Nike Air Force 1 Women size 39", "Zalando", 96, { qiBuyingDecision: { confidence: 74 } }),
    mockProduct("Brooks Ghost 15 Running Shoe Men", "Running Warehouse", 120, { qiBuyingDecision: { confidence: 68 } }),
    mockProduct("adidas 3MC", "Zalando", 75, { qiBuyingDecision: { confidence: 82 } }),
  ],
  "running shoes flat feet men"
);
assert.match(shoeTray.products[0].title, /Brooks|Running|Ghost/i);

console.log("Phase 3 search intelligence upgrade tests passed.");
