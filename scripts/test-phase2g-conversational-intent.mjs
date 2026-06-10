#!/usr/bin/env node
/**
 * Phase 2G — Conversational intent intelligence layer tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildConversationalIntentEngine } from "../lib/truth/conversationalIntentEngine.ts";
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
assert.ok(!surface.includes("conversationalIntentEngine"), "no UI conversational intent import");
pass("no_ui_redesign");

const sampleProduct = {
  id: 1,
  title: "ASUS ROG Strix G16 RTX 4070 Gaming Laptop",
  store: "Amazon.com",
  price: 1399,
  displayPrice: "€1399",
  rating: 4.7,
  link: "https://amazon.com/dp/gaming-laptop",
  image: "",
  reviewsCount: 420,
  shipping: "Free delivery",
  availability: "In stock",
  oldPrice: null,
  priceTrend: "stable",
  extensions: ["Gaming"],
};

function foundationForQuery(searchQuery) {
  return buildTruthFoundationSnapshot({
    product: sampleProduct,
    listingUrl: sampleProduct.link,
    searchQuery,
  });
}

const gamingQuery = foundationForQuery("best laptop for gaming under 1500");
assert.ok(gamingQuery.conversationalIntent.explicitIntent.toLowerCase().includes("laptop"));
assert.ok(gamingQuery.conversationalIntent.explicitIntent.toLowerCase().includes("gaming"));
assert.equal(gamingQuery.conversationalIntent.budgetSensitivity, "HIGH");
assert.ok(gamingQuery.conversationalIntent.shoppingGoal.toLowerCase().includes("gaming"));
assert.ok(gamingQuery.conversationalIntent.preferenceSignals.some((s) => s.includes("gaming")));
pass("gaming_laptop_conversational_intent");

const cameraIphoneQuery = foundationForQuery("cheap iphone with good camera");
assert.ok(cameraIphoneQuery.conversationalIntent.explicitIntent.toLowerCase().includes("apple"));
assert.equal(cameraIphoneQuery.conversationalIntent.brandFlexibility, "FIXED");
assert.ok(cameraIphoneQuery.conversationalIntent.preferenceSignals.some((s) => s.includes("camera")));
assert.ok(["LOW", "MEDIUM", "HIGH"].includes(cameraIphoneQuery.conversationalIntent.qualitySensitivity));
pass("cheap_iphone_camera_conversational_intent");

const travelQuery = foundationForQuery("I travel a lot and need a lightweight laptop");
assert.ok(travelQuery.conversationalIntent.userContext.toLowerCase().includes("travel"));
assert.ok(travelQuery.conversationalIntent.implicitIntent.toLowerCase().includes("portability"));
assert.ok(travelQuery.conversationalIntent.preferenceSignals.some((s) => s.includes("portability")));
pass("travel_lightweight_conversational_intent");

const premiumQuery = foundationForQuery("I want something premium but not overpriced");
assert.ok(premiumQuery.conversationalIntent.implicitIntent.toLowerCase().includes("value"));
assert.equal(premiumQuery.conversationalIntent.budgetSensitivity, "HIGH");
assert.equal(premiumQuery.conversationalIntent.qualitySensitivity, "HIGH");
pass("premium_not_overpriced_conversational_intent");

const arabicQuery = foundationForQuery("أفضل كاميرا للسفر والتصوير الليلي");
assert.ok(arabicQuery.conversationalIntent.explicitIntent.length > 10);
assert.ok(
  arabicQuery.conversationalIntent.preferenceSignals.some((s) => s.includes("night photography")) ||
    arabicQuery.conversationalIntent.explicitIntent.toLowerCase().includes("night")
);
assert.ok(arabicQuery.conversationalIntent.conversationalConfidence > 0);
pass("arabic_travel_night_camera_conversational_intent");

const { conversationalIntent: _ignored, ...conversationalInput } = gamingQuery;
const directConversational = buildConversationalIntentEngine(
  conversationalInput,
  "best laptop for gaming under 1500"
);
assert.equal(directConversational.explicitIntent, gamingQuery.conversationalIntent.explicitIntent);
assert.equal(directConversational.budgetSensitivity, gamingQuery.conversationalIntent.budgetSensitivity);
pass("direct_engine_matches_snapshot");

assert.ok(gamingQuery.conversationalIntent.conversationalConfidence > 0);
pass("snapshot_conversational_intent_block");

const intel = {
  finalVerdict: "COMPARE",
  segment: null,
  segmentLabel: "",
  dimensions: [],
  productUnderstandingLine: "",
  globalPriceIntelligence: { lowestPriceFound: sampleProduct.price },
  truthFoundation: gamingQuery,
};
const sources = buildExtendedTruthEvidenceSources(intel);
assert.ok(sources.hasConversationalIntent);
assert.ok(sources.explicitIntent.length > 0);
assert.ok(sources.implicitIntent.length > 0);
assert.ok(sources.shoppingGoal.length > 0);
assert.ok(sources.conversationalUserContext.length > 0);
assert.ok(sources.preferenceSignalCount > 0);
assert.ok(sources.conversationalConfidence > 0);
assert.ok(sources.conversationalEvidenceChain.length >= 5);
assert.ok(sources.conversationalEvidenceChain.some((entry) => entry.startsWith("explicit:")));
assert.ok(sources.conversationalEvidenceChain.some((entry) => entry.startsWith("goal:")));
pass("search_evidence_exposes_conversational_chain");

console.log(`\nPhase 2G conversational intent intelligence layer: ${passed} checks passed.`);
