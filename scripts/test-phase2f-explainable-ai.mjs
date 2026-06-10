#!/usr/bin/env node
/**
 * Phase 2F — Explainable AI output layer tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildExplainableAIEngine } from "../lib/truth/explainableAIEngine.ts";
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
assert.ok(!surface.includes("explainableAIEngine"), "no UI explainable AI import");
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
const mismatchFoundation = buildTruthFoundationSnapshot({
  product: androidPhone,
  listingUrl: androidPhone.link,
  searchQuery: "cheap iphone",
});

assert.ok(gamingFoundation.explainableAI);
assert.ok(gamingFoundation.explainableAI.explainabilityConfidence > officeFoundation.explainableAI.explainabilityConfidence);
assert.ok(gamingFoundation.explainableAI.headline.length > 5);
assert.ok(gamingFoundation.explainableAI.recommendationNarrative.length > 30);
assert.ok(gamingFoundation.explainableAI.whyThisProduct.length > 20);
assert.ok(gamingFoundation.explainableAI.strengths.length > 0);
assert.ok(gamingFoundation.explainableAI.trustSummary.length > 10);
assert.ok(gamingFoundation.explainableAI.valueSummary.length > 10);
assert.ok(gamingFoundation.explainableAI.bestFor.length > 0);
assert.ok(gamingFoundation.explainableAI.finalVerdict.length > 5);
pass("strong_gaming_explainable_snapshot");

assert.ok(mismatchFoundation.explainableAI.weaknesses.length > 0);
assert.ok(mismatchFoundation.explainableAI.avoidIf.length > 0);
assert.ok(mismatchFoundation.explainableAI.finalVerdict.toLowerCase().includes("not") ||
  mismatchFoundation.explainableAI.finalVerdict.toLowerCase().includes("compare"));
assert.ok(mismatchFoundation.explainableAI.explainabilityConfidence <= gamingFoundation.explainableAI.explainabilityConfidence);
pass("brand_mismatch_explainable_narrative");

const { explainableAI: _ignored, ...explainableInput } = gamingFoundation;
const directExplainable = buildExplainableAIEngine(explainableInput);
assert.equal(directExplainable.headline, gamingFoundation.explainableAI.headline);
assert.equal(directExplainable.finalVerdict, gamingFoundation.explainableAI.finalVerdict);
assert.equal(directExplainable.explainabilityConfidence, gamingFoundation.explainableAI.explainabilityConfidence);
pass("direct_engine_matches_snapshot");

assert.ok(gamingFoundation.explainableAI.explainabilityConfidence > 0);
pass("snapshot_explainable_ai_block");

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
assert.ok(sources.hasExplainableAI);
assert.ok(sources.explainableHeadline.length > 0);
assert.ok(sources.explainableNarrative.length > 0);
assert.ok(sources.whyThisProduct.length > 0);
assert.ok(sources.explainableStrengthCount > 0);
assert.ok(sources.trustSummary.length > 0);
assert.ok(sources.valueSummary.length > 0);
assert.ok(sources.explainableFinalVerdict.length > 0);
assert.ok(sources.explainabilityConfidence > 0);
assert.ok(sources.explainableEvidenceChain.length >= 5);
assert.ok(sources.explainableEvidenceChain.some((entry) => entry.startsWith("headline:")));
assert.ok(sources.explainableEvidenceChain.some((entry) => entry.startsWith("verdict:")));
pass("search_evidence_exposes_explainable_chain");

console.log(`\nPhase 2F explainable AI output layer: ${passed} checks passed.`);
