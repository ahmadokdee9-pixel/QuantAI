#!/usr/bin/env node
/**
 * Phase 2A — Intent intelligence engine tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildIntentIntelligenceEngine,
  normalizeShoppingQuery,
  rewriteShoppingQuery,
} from "../lib/truth/intentIntelligenceEngine.ts";
import { buildTruthFoundationSnapshot } from "../lib/truth/truthEvidenceBuilder.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("intentIntelligenceEngine"), "no UI intent engine import");
pass("no_ui_redesign");

const gamingLaptop = buildIntentIntelligenceEngine("best gaming laptop under 1500 euro");
assert.equal(gamingLaptop.intent.productType, "laptop");
assert.equal(gamingLaptop.intent.useCase, "gaming");
assert.equal(gamingLaptop.intent.qualityLevel, "best");
assert.equal(gamingLaptop.intent.budget, 1500);
assert.equal(gamingLaptop.intent.currency, "EUR");
assert.equal(gamingLaptop.intent.language, "en");
assert.ok(gamingLaptop.intentConfidence >= 60);
assert.ok(gamingLaptop.intentCompleteness >= 55);
pass("english_gaming_laptop_intent");

const travelCamera = buildIntentIntelligenceEngine("camera for travel");
assert.equal(travelCamera.intent.productType, "camera");
assert.equal(travelCamera.intent.useCase, "travel");
assert.equal(travelCamera.intent.category, "photography");
pass("english_travel_camera_intent");

const cheapIphone = buildIntentIntelligenceEngine("cheap iphone");
assert.equal(cheapIphone.intent.productType, "smartphone");
assert.equal(cheapIphone.intent.preferredBrand, "Apple");
assert.equal(cheapIphone.intent.qualityLevel, "budget");
assert.equal(cheapIphone.rewrite.budgetSensitive, true);
assert.equal(cheapIphone.rewrite.objective, "best value");
assert.ok(cheapIphone.rewrittenQuery.toLowerCase().includes("apple"));
assert.ok(cheapIphone.rewrittenQuery.toLowerCase().includes("smartphone"));
pass("cheap_iphone_rewrite");

const arabicMontage = buildIntentIntelligenceEngine("لابتوب للمونتاج");
assert.equal(arabicMontage.intent.productType, "laptop");
assert.equal(arabicMontage.intent.useCase, "video editing");
assert.equal(arabicMontage.intent.language, "ar");
pass("arabic_editing_laptop_intent");

const arabicGamingPhone = buildIntentIntelligenceEngine("هاتف قوي للالعاب");
assert.equal(arabicGamingPhone.intent.productType, "smartphone");
assert.equal(arabicGamingPhone.intent.useCase, "gaming");
assert.equal(arabicGamingPhone.intent.qualityLevel, "powerful");
assert.equal(arabicGamingPhone.intent.language, "ar");
pass("arabic_gaming_phone_intent");

const arabicTravelCamera = buildIntentIntelligenceEngine("كاميرا احترافية للسفر");
assert.equal(arabicTravelCamera.intent.productType, "camera");
assert.equal(arabicTravelCamera.intent.useCase, "travel");
assert.equal(arabicTravelCamera.intent.qualityLevel, "professional");
pass("arabic_professional_travel_camera_intent");

const normalized = normalizeShoppingQuery("  Cheap   IPHNE  ");
assert.ok(normalized.toLowerCase().includes("iphone"));
assert.ok(normalized.toLowerCase().includes("cheap"));
pass("query_normalization_layer");

const rewrite = rewriteShoppingQuery({
  normalizedQuery: "cheap iphone",
  intent: cheapIphone.intent,
  rewrite: cheapIphone.rewrite,
});
assert.ok(/apple/i.test(rewrite));
assert.ok(/smartphone/i.test(rewrite));
assert.ok(/value|budget/i.test(rewrite));
pass("query_rewriting_layer");

const product = {
  id: 1,
  title: "Apple iPhone 15",
  store: "Amazon.com",
  price: 799,
  displayPrice: "€799",
  rating: 4.7,
  link: "https://amazon.com/dp/iphone15",
  image: "",
  reviewsCount: 100,
  shipping: "Free delivery",
  availability: "In stock",
  oldPrice: null,
  priceTrend: "stable",
  extensions: ["In stock"],
};

const foundation = buildTruthFoundationSnapshot({
  product,
  listingUrl: product.link,
  searchQuery: "cheap iphone",
});
assert.ok(foundation.intentEngine);
assert.equal(foundation.intentEngine.intent.preferredBrand, "Apple");
assert.equal(foundation.intentEngine.intent.productType, "smartphone");
assert.ok(foundation.intentEngine.intentConfidence > 0);
pass("snapshot_intent_engine_block");

console.log(`\nPhase 2A intent intelligence engine: ${passed} checks passed.`);
