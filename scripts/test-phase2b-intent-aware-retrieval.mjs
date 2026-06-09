#!/usr/bin/env node
/**
 * Phase 2B — Intent-aware retrieval engine tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildIntentIntelligenceEngine } from "../lib/truth/intentIntelligenceEngine.ts";
import {
  buildIntentAwareRetrieval,
  intentRetrievalRankNudge,
} from "../lib/truth/intentAwareRetrievalEngine.ts";
import {
  buildTruthFoundationSnapshot,
  buildExtendedTruthEvidenceSources,
} from "../lib/truth/truthEvidenceBuilder.ts";
import { sortByCompositeRankEnhanced } from "../lib/intelligence/searchRankEnhance.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("intentAwareRetrievalEngine"), "no UI retrieval import");
pass("no_ui_redesign");

const gamingIntent = buildIntentIntelligenceEngine("gaming laptop");
const gamingProduct = {
  id: 1,
  title: "ASUS ROG Strix G16 RTX 4070 165Hz Gaming Laptop",
  store: "Amazon.com",
  price: 1499,
  displayPrice: "€1499",
  rating: 4.7,
  link: "https://amazon.com/dp/gaming-laptop",
  image: "",
  reviewsCount: 420,
  shipping: "Free delivery",
  availability: "In stock",
  oldPrice: null,
  priceTrend: "stable",
  extensions: ["Gaming", "165Hz display"],
};

const gamingRetrieval = buildIntentAwareRetrieval({
  product: gamingProduct,
  intentEngine: gamingIntent,
});
assert.ok(gamingRetrieval.retrievalIntentScore >= 60);
assert.ok(gamingRetrieval.retrievalReasons.some((r) => r.includes("gaming GPU")));
assert.ok(gamingRetrieval.retrievalReasons.some((r) => r.includes("refresh")));
pass("gaming_laptop_retrieval_score");

const cheapIphoneIntent = buildIntentIntelligenceEngine("cheap iphone");
const applePhone = {
  id: 2,
  title: "Apple iPhone 15 128GB",
  store: "Best Buy",
  price: 699,
  displayPrice: "€699",
  rating: 4.8,
  link: "https://bestbuy.com/iphone15",
  image: "",
  reviewsCount: 900,
  shipping: "Free delivery",
  availability: "In stock",
  oldPrice: 799,
  priceTrend: "down",
  extensions: ["In stock"],
};
const androidPhone = {
  ...applePhone,
  id: 3,
  title: "Samsung Galaxy A15 Budget Android Phone",
  link: "https://bestbuy.com/galaxy-a15",
  price: 199,
};

const appleRetrieval = buildIntentAwareRetrieval({
  product: applePhone,
  intentEngine: cheapIphoneIntent,
});
const androidRetrieval = buildIntentAwareRetrieval({
  product: androidPhone,
  intentEngine: cheapIphoneIntent,
});
assert.ok(appleRetrieval.retrievalIntentScore > androidRetrieval.retrievalIntentScore);
assert.ok(appleRetrieval.retrievalReasons.some((r) => r.includes("Apple")));
pass("brand_preference_boost_and_conflict_penalty");

const budgetIntent = buildIntentIntelligenceEngine("best gaming laptop under 1500 euro");
const overBudget = {
  ...gamingProduct,
  price: 1899,
  title: "ASUS ROG Strix Scar RTX 4090 Gaming Laptop",
};
const underBudget = { ...gamingProduct, price: 1399 };
const overRetrieval = buildIntentAwareRetrieval({ product: overBudget, intentEngine: budgetIntent });
const underRetrieval = buildIntentAwareRetrieval({ product: underBudget, intentEngine: budgetIntent });
assert.ok(underRetrieval.retrievalIntentScore > overRetrieval.retrievalIntentScore);
assert.ok(underRetrieval.retrievalReasons.some((r) => r.includes("within")));
assert.ok(overRetrieval.retrievalReasons.some((r) => r.includes("exceeds")));
pass("budget_match_and_penalty");

const arabicIntent = buildIntentIntelligenceEngine("كاميرا احترافية للسفر");
const travelCamera = {
  id: 4,
  title: "Sony Alpha a7C II Mirrorless Travel Camera",
  store: "B&H",
  price: 2199,
  displayPrice: "€2199",
  rating: 4.9,
  link: "https://bhphoto.com/sony-a7c2",
  image: "",
  reviewsCount: 180,
  shipping: "Free delivery",
  availability: "In stock",
  oldPrice: null,
  priceTrend: "stable",
  extensions: ["Mirrorless", "Travel kit"],
};
const arabicRetrieval = buildIntentAwareRetrieval({
  product: travelCamera,
  intentEngine: arabicIntent,
});
assert.ok(arabicRetrieval.retrievalIntentScore >= 55);
assert.ok(arabicRetrieval.retrievalReasons.length > 0);
pass("arabic_intent_retrieval");

const foundation = buildTruthFoundationSnapshot({
  product: applePhone,
  listingUrl: applePhone.link,
  searchQuery: "cheap iphone",
});
assert.ok(foundation.intentRetrieval);
assert.ok(foundation.intentRetrieval.retrievalIntentScore > 0);
assert.ok(foundation.intentRetrieval.retrievalReasons.length > 0);
pass("snapshot_intent_retrieval_block");

const intel = {
  finalVerdict: "COMPARE",
  segment: null,
  segmentLabel: "",
  dimensions: [],
  productUnderstandingLine: "",
  globalPriceIntelligence: { lowestPriceFound: applePhone.price },
  truthFoundation: foundation,
};
const sources = buildExtendedTruthEvidenceSources(intel);
assert.ok(sources.hasIntentRetrieval);
assert.ok(sources.retrievalIntentScore > 0);
assert.ok(sources.retrievalReasons.length > 0);
pass("search_evidence_exposes_retrieval");

assert.ok(intentRetrievalRankNudge(80) > 0);
assert.ok(intentRetrievalRankNudge(25) < 0);
const ranked = sortByCompositeRankEnhanced([androidPhone, applePhone], "cheap iphone");
assert.equal(ranked[0].link, applePhone.link);
pass("retrieval_rank_nudge_boosts_intent_match");

console.log(`\nPhase 2B intent-aware retrieval engine: ${passed} checks passed.`);
