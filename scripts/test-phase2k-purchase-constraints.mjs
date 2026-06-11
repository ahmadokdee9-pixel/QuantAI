#!/usr/bin/env node
/**
 * Phase 2K — Purchase constraints intelligence layer tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildPurchaseConstraintsEngine } from "../lib/truth/purchaseConstraintsEngine.ts";
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
assert.ok(!surface.includes("purchaseConstraintsEngine"), "no UI purchase constraints import");
pass("no_ui_redesign");

const sampleProduct = {
  id: 1,
  title: "Sample Product",
  store: "Amazon.com",
  price: 499,
  displayPrice: "€499",
  rating: 4.5,
  link: "https://amazon.com/dp/sample",
  image: "",
  reviewsCount: 100,
  shipping: "Free delivery",
  availability: "In stock",
  oldPrice: null,
  priceTrend: "stable",
  extensions: [],
};

function foundationForQuery(searchQuery) {
  return buildTruthFoundationSnapshot({
    product: sampleProduct,
    listingUrl: sampleProduct.link,
    searchQuery,
  });
}

function assertConstraint(query, expectedConstraint) {
  const foundation = foundationForQuery(query);
  assert.equal(
    foundation.purchaseConstraints.primaryConstraint,
    expectedConstraint,
    `query "${query}" expected ${expectedConstraint}, got ${foundation.purchaseConstraints.primaryConstraint}`
  );
}

assertConstraint("cheap iphone under 500 budget", "budget");
pass("budget_constraint");

assertConstraint("powerful fast performance cpu gpu", "performance");
pass("performance_constraint");

assertConstraint("lightweight portable slim laptop", "portability");
pass("portability_constraint");

assertConstraint("long battery life all day battery", "battery");
pass("battery_constraint");

assertConstraint("4k oled large screen display", "screen");
pass("screen_constraint");

assertConstraint("best camera night photography megapixel", "camera");
pass("camera_constraint");

assertConstraint("1tb ssd storage minimum must have", "storage");
pass("storage_constraint");

assertConstraint("compatible with macbook usb-c works with", "compatibility");
pass("compatibility_constraint");

assertConstraint("fast delivery ship today next day", "delivery");
pass("delivery_constraint");

assertConstraint("laptop for travel trip flight", "travel");
pass("travel_constraint");

assertConstraint("gaming laptop rtx 144hz esports", "gaming");
pass("gaming_constraint");

assertConstraint("work laptop office professional business", "work");
pass("work_constraint");

assertConstraint("student laptop university school education", "education");
pass("education_constraint");

assertConstraint("ultralight under 1kg weight lightweight", "weight");
pass("weight_constraint");

assertConstraint("apple macbook only must be brand", "brand");
pass("brand_constraint");

const arabicBudget = foundationForQuery("هاتف رخيص تحت 500");
assert.equal(arabicBudget.purchaseConstraints.primaryConstraint, "budget");
pass("arabic_budget_constraint");

const arabicDelivery = foundationForQuery("توصيل سريع اليوم");
assert.equal(arabicDelivery.purchaseConstraints.primaryConstraint, "delivery");
pass("arabic_delivery_constraint");

const storageFoundation = foundationForQuery("1tb ssd storage minimum must have");
assert.ok(storageFoundation.purchaseConstraints.hardRequirements.length > 0);
assert.ok(storageFoundation.purchaseConstraints.constraintSignals.length > 0);
assert.ok(storageFoundation.purchaseConstraints.constraintScores.storage >= 55);
assert.ok(storageFoundation.purchaseConstraints.constraintConfidence > 0);
pass("hard_requirements_and_signals");

const { purchaseConstraints: _ignored, ...constraintsInput } = storageFoundation;
const directConstraints = buildPurchaseConstraintsEngine(constraintsInput, "1tb ssd storage minimum must have");
assert.equal(
  directConstraints.primaryConstraint,
  storageFoundation.purchaseConstraints.primaryConstraint
);
assert.equal(
  directConstraints.constraintConfidence,
  storageFoundation.purchaseConstraints.constraintConfidence
);
pass("direct_engine_matches_snapshot");

assert.ok(storageFoundation.purchaseConstraints.constraintEvidenceChain.length >= 12);
pass("snapshot_purchase_constraints_block");

const intel = {
  finalVerdict: "COMPARE",
  segment: null,
  segmentLabel: "",
  dimensions: [],
  productUnderstandingLine: "",
  globalPriceIntelligence: { lowestPriceFound: sampleProduct.price },
  truthFoundation: storageFoundation,
};
const sources = buildExtendedTruthEvidenceSources(intel);
assert.ok(sources.hasPurchaseConstraints);
assert.equal(sources.primaryConstraint, "storage");
assert.ok(sources.constraintConfidence > 0);
assert.ok(sources.storageConstraintScore >= 55);
assert.ok(sources.hardRequirementCount > 0);
assert.ok(sources.constraintSignalCount > 0);
assert.ok(sources.purchaseConstraintsEvidenceChain.length >= 12);
assert.ok(sources.purchaseConstraintsEvidenceChain.some((entry) => entry.startsWith("constraint:")));
assert.ok(sources.purchaseConstraintsEvidenceChain.some((entry) => entry.startsWith("storage:")));
pass("search_evidence_exposes_purchase_constraints_chain");

console.log(`\nPhase 2K purchase constraints intelligence layer: ${passed} checks passed.`);
