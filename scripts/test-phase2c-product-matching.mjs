#!/usr/bin/env node
/**
 * Phase 2C — Product matching intelligence layer tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildIntentIntelligenceEngine } from "../lib/truth/intentIntelligenceEngine.ts";
import { buildProductMatchingEngine } from "../lib/truth/productMatchingEngine.ts";
import {
  buildTruthFoundationSnapshot,
  buildExtendedTruthEvidenceSources,
} from "../lib/truth/truthEvidenceBuilder.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("productMatchingEngine"), "no UI product match import");
pass("no_ui_redesign");

const gamingIntent = buildIntentIntelligenceEngine("gaming laptop");
const gamingLaptop = {
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
const officeLaptop = {
  ...gamingLaptop,
  id: 2,
  title: "HP Chromebook 14 Office Laptop",
  link: "https://amazon.com/dp/chromebook",
  price: 299,
  extensions: ["Basic use"],
};

const gamingMatch = buildProductMatchingEngine({ product: gamingLaptop, intentEngine: gamingIntent });
const officeMatch = buildProductMatchingEngine({ product: officeLaptop, intentEngine: gamingIntent });

assert.ok(gamingMatch.overallMatchScore > officeMatch.overallMatchScore);
assert.ok(gamingMatch.intentMatchScore >= 70);
assert.ok(gamingMatch.useCaseMatchScore >= 70);
assert.ok(gamingMatch.strongestMatchReason.length > 0);
assert.ok(gamingMatch.strongestMismatchReason.length > 0);
pass("gaming_laptop_product_match");

const budgetIntent = buildIntentIntelligenceEngine("best gaming laptop under 1500 euro");
const underBudget = { ...gamingLaptop, price: 1399 };
const overBudget = { ...gamingLaptop, price: 1899, title: "ASUS ROG Scar RTX 4090 Gaming Laptop" };
const underMatch = buildProductMatchingEngine({ product: underBudget, intentEngine: budgetIntent });
const overMatch = buildProductMatchingEngine({ product: overBudget, intentEngine: budgetIntent });
assert.ok(underMatch.budgetMatchScore > overMatch.budgetMatchScore);
assert.ok(underMatch.overallMatchScore > overMatch.overallMatchScore);
pass("budget_match_dimensions");

const iphoneIntent = buildIntentIntelligenceEngine("cheap iphone");
const applePhone = {
  id: 3,
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
  id: 4,
  title: "Samsung Galaxy A15 Budget Android Phone",
  link: "https://bestbuy.com/galaxy-a15",
  price: 199,
};
const appleMatch = buildProductMatchingEngine({ product: applePhone, intentEngine: iphoneIntent });
const androidMatch = buildProductMatchingEngine({ product: androidPhone, intentEngine: iphoneIntent });
assert.ok(appleMatch.brandMatchScore > androidMatch.brandMatchScore);
assert.ok(appleMatch.intentMatchScore > androidMatch.intentMatchScore);
assert.ok(appleMatch.strongestMatchReason.toLowerCase().includes("apple"));
assert.ok(androidMatch.strongestMismatchReason.toLowerCase().includes("apple"));
pass("brand_match_dimensions");

const arabicIntent = buildIntentIntelligenceEngine("كاميرا احترافية للسفر");
const travelCamera = {
  id: 5,
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
const arabicMatch = buildProductMatchingEngine({ product: travelCamera, intentEngine: arabicIntent });
assert.ok(arabicMatch.intentMatchScore >= 70);
assert.ok(arabicMatch.qualityMatchScore >= 70);
assert.ok(arabicMatch.useCaseMatchScore >= 55);
pass("arabic_intent_product_match");

const foundation = buildTruthFoundationSnapshot({
  product: applePhone,
  listingUrl: applePhone.link,
  searchQuery: "cheap iphone",
});
assert.ok(foundation.productMatch);
assert.ok(foundation.productMatch.overallMatchScore > 0);
assert.ok(foundation.productMatch.brandMatchScore > 0);
pass("snapshot_product_match_block");

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
assert.ok(sources.hasProductMatch);
assert.ok(sources.overallMatchScore > 0);
assert.ok(sources.brandMatchScore > 0);
assert.ok(sources.strongestMatchReason.length > 0);
pass("search_evidence_exposes_product_match");

console.log(`\nPhase 2C product matching intelligence layer: ${passed} checks passed.`);
