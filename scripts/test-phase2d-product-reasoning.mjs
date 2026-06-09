#!/usr/bin/env node
/**
 * Phase 2D — Product reasoning engine tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildIntentIntelligenceEngine } from "../lib/truth/intentIntelligenceEngine.ts";
import { buildProductReasoningEngine } from "../lib/truth/productReasoningEngine.ts";
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
assert.ok(!surface.includes("productReasoningEngine"), "no UI product reasoning import");
pass("no_ui_redesign");

const gamingLaptop = {
  id: 1,
  title: "ASUS ROG Strix G16 RTX 4070 165Hz Gaming Laptop",
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

const gamingFoundation = buildTruthFoundationSnapshot({
  product: gamingLaptop,
  listingUrl: gamingLaptop.link,
  searchQuery: "best gaming laptop under 1500 euro",
});
const officeFoundation = buildTruthFoundationSnapshot({
  product: officeLaptop,
  listingUrl: officeLaptop.link,
  searchQuery: "best gaming laptop under 1500 euro",
});

assert.ok(gamingFoundation.productReasoning);
assert.ok(gamingFoundation.productReasoning.reasoningConfidence > officeFoundation.productReasoning.reasoningConfidence);
assert.ok(["STRONG", "GOOD", "CAUTION"].includes(gamingFoundation.productReasoning.recommendationStrength));
assert.ok(gamingFoundation.productReasoning.topPositiveReasons.length > 0);
assert.ok(gamingFoundation.productReasoning.summaryReason.length > 20);
assert.ok(gamingFoundation.productReasoning.shortReason.length > 0);
assert.ok(gamingFoundation.productReasoning.explainabilityScore > 0);
assert.ok(gamingFoundation.productReasoning.bestFor.length > 0);
pass("strong_gaming_reasoning_snapshot");

const iphoneIntent = buildIntentIntelligenceEngine("cheap iphone");
const androidPhone = {
  id: 4,
  title: "Samsung Galaxy A15 Budget Android Phone",
  store: "Best Buy",
  price: 199,
  displayPrice: "€199",
  rating: 4.5,
  link: "https://bestbuy.com/galaxy-a15",
  image: "",
  reviewsCount: 900,
  shipping: "Free delivery",
  availability: "In stock",
  oldPrice: null,
  priceTrend: "stable",
  extensions: ["In stock"],
};
const mismatchFoundation = buildTruthFoundationSnapshot({
  product: androidPhone,
  listingUrl: androidPhone.link,
  searchQuery: "cheap iphone",
});
assert.ok(mismatchFoundation.productReasoning.topNegativeReasons.length > 0);
assert.ok(
  mismatchFoundation.productReasoning.notIdealFor.some((item) => item.toLowerCase().includes("apple")) ||
    mismatchFoundation.productReasoning.topNegativeReasons.some((item) => item.toLowerCase().includes("apple"))
);
assert.ok(["CAUTION", "WEAK", "UNKNOWN"].includes(mismatchFoundation.productReasoning.recommendationStrength));
pass("brand_mismatch_negative_reasoning");

const { productReasoning: _ignored, ...reasoningInput } = gamingFoundation;
const directReasoning = buildProductReasoningEngine(reasoningInput);
assert.equal(directReasoning.recommendationStrength, gamingFoundation.productReasoning.recommendationStrength);
assert.equal(directReasoning.reasoningConfidence, gamingFoundation.productReasoning.reasoningConfidence);
pass("direct_engine_matches_snapshot");

assert.ok(gamingFoundation.productMatch);
assert.ok(gamingFoundation.productReasoning.explainabilityScore >= 50);
pass("snapshot_product_reasoning_block");

const intel = {
  finalVerdict: "COMPARE",
  segment: null,
  segmentLabel: "",
  dimensions: [],
  productUnderstandingLine: "",
  globalPriceIntelligence: { lowestPriceFound: gamingLaptop.price },
  truthFoundation: gamingFoundation,
};
const sources = buildExtendedTruthEvidenceSources(intel);
assert.ok(sources.hasProductReasoning);
assert.ok(sources.productReasoningConfidence > 0);
assert.ok(sources.explainabilityScore > 0);
assert.ok(sources.summaryReason.length > 0);
assert.ok(sources.shortReason.length > 0);
assert.ok(sources.topPositiveReasonCount > 0);
assert.ok(sources.reasoningEvidenceChain.length >= 5);
assert.ok(sources.reasoningEvidenceChain.some((entry) => entry.startsWith("match:")));
assert.ok(sources.reasoningEvidenceChain.some((entry) => entry.startsWith("trust:")));
pass("search_evidence_exposes_reasoning_chain");

console.log(`\nPhase 2D product reasoning engine: ${passed} checks passed.`);
