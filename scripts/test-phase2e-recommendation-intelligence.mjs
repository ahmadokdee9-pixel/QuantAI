#!/usr/bin/env node
/**
 * Phase 2E — Recommendation intelligence layer tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildRecommendationIntelligenceEngine } from "../lib/truth/recommendationIntelligenceEngine.ts";
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
assert.ok(!surface.includes("recommendationIntelligenceEngine"), "no UI recommendation import");
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

assert.ok(gamingFoundation.recommendationIntelligence);
assert.ok(gamingFoundation.recommendationIntelligence.recommendationScore > officeFoundation.recommendationIntelligence.recommendationScore);
assert.ok(["BEST_MATCH", "RECOMMENDED", "CONSIDER"].includes(gamingFoundation.recommendationIntelligence.recommendationTier));
assert.ok(gamingFoundation.recommendationIntelligence.shouldRecommend);
assert.ok(gamingFoundation.recommendationIntelligence.recommendationSummary.length > 20);
assert.ok(gamingFoundation.recommendationIntelligence.primaryRecommendationReason.length > 0);
assert.ok(gamingFoundation.recommendationIntelligence.recommendationEvidenceChain.length >= 5);
pass("strong_gaming_recommendation_snapshot");

assert.ok(mismatchFoundation.recommendationIntelligence.recommendationScore < gamingFoundation.recommendationIntelligence.recommendationScore);
assert.ok(["CONSIDER", "NOT_RECOMMENDED"].includes(mismatchFoundation.recommendationIntelligence.recommendationTier));
assert.equal(mismatchFoundation.recommendationIntelligence.shouldRecommend, false);
assert.ok(
  mismatchFoundation.recommendationIntelligence.primaryWarningReason.length > 0 ||
    mismatchFoundation.recommendationIntelligence.recommendationEvidenceChain.some((entry) => entry.startsWith("warning:"))
);
pass("brand_mismatch_not_recommended");

const { recommendationIntelligence: _ignored, ...recommendationInput } = gamingFoundation;
const directRecommendation = buildRecommendationIntelligenceEngine(recommendationInput);
assert.equal(directRecommendation.recommendationTier, gamingFoundation.recommendationIntelligence.recommendationTier);
assert.equal(directRecommendation.recommendationScore, gamingFoundation.recommendationIntelligence.recommendationScore);
assert.equal(directRecommendation.confidenceScore, gamingFoundation.recommendationIntelligence.confidenceScore);
pass("direct_engine_matches_snapshot");

assert.ok(gamingFoundation.recommendationIntelligence.confidenceScore > 0);
if (gamingFoundation.recommendationIntelligence.recommendationTier === "BEST_MATCH") {
  assert.equal(gamingFoundation.recommendationIntelligence.shouldHighlight, true);
}
pass("snapshot_recommendation_intelligence_block");

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
assert.ok(sources.hasRecommendationIntelligence);
assert.ok(sources.recommendationScore > 0);
assert.ok(sources.recommendationConfidenceScore > 0);
assert.ok(sources.recommendationSummary.length > 0);
assert.ok(sources.primaryRecommendationReason.length > 0);
assert.ok(sources.shouldRecommend);
assert.ok(sources.recommendationEvidenceChain.length >= 5);
assert.ok(sources.recommendationEvidenceChain.some((entry) => entry.startsWith("tier:")));
assert.ok(sources.recommendationEvidenceChain.some((entry) => entry.startsWith("match:")));
pass("search_evidence_exposes_recommendation_chain");

console.log(`\nPhase 2E recommendation intelligence layer: ${passed} checks passed.`);
