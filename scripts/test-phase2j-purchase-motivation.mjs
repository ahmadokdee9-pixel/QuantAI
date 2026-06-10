#!/usr/bin/env node
/**
 * Phase 2J — Purchase motivation intelligence layer tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildPurchaseMotivationEngine } from "../lib/truth/purchaseMotivationEngine.ts";
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
assert.ok(!surface.includes("purchaseMotivationEngine"), "no UI purchase motivation import");
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

function assertMotivation(query, expectedMotivation) {
  const foundation = foundationForQuery(query);
  assert.equal(
    foundation.purchaseMotivation.motivation,
    expectedMotivation,
    `query "${query}" expected ${expectedMotivation}, got ${foundation.purchaseMotivation.motivation}`
  );
}

assertMotivation("laptop for programming office productivity", "productivity");
pass("productivity_motivation");

assertMotivation("designer prestige status symbol watch", "status");
pass("status_motivation");

assertMotivation("luxury premium elegant handbag", "luxury");
pass("luxury_motivation");

assertMotivation("fun entertainment home leisure hobby", "enjoyment");
pass("enjoyment_motivation");

assertMotivation("gaming laptop rtx 144hz esports", "gaming");
pass("gaming_motivation");

assertMotivation("camera for video editing content creation", "creativity");
pass("creativity_motivation");

assertMotivation("work laptop for professional job business", "work");
pass("work_motivation");

assertMotivation("laptop for student university school", "education");
pass("education_motivation");

assertMotivation("lightweight portable laptop for travel", "travel");
pass("travel_motivation");

assertMotivation("fitness tracker gym workout exercise", "fitness");
pass("fitness_motivation");

assertMotivation("birthday gift present for mom", "gifting");
pass("gifting_motivation");

assertMotivation("replace broken old phone upgrade", "replacement");
pass("replacement_motivation");

assertMotivation("need essential must have basic phone", "necessity");
pass("necessity_motivation");

assertMotivation("curious to try explore experiment gadget", "curiosity");
pass("curiosity_motivation");

assertMotivation("latest innovative cutting edge new tech", "innovation");
pass("innovation_motivation");

const arabicGift = foundationForQuery("هدية لعيد ميلاد");
assert.equal(arabicGift.purchaseMotivation.motivation, "gifting");
pass("arabic_gifting_motivation");

const arabicEducation = foundationForQuery("لابتوب للجامعة");
assert.equal(arabicEducation.purchaseMotivation.motivation, "education");
pass("arabic_education_motivation");

const gamingFoundation = foundationForQuery("gaming laptop rtx 144hz");
assert.ok(gamingFoundation.purchaseMotivation.motivationSignals.length > 0);
assert.ok(gamingFoundation.purchaseMotivation.motivationScores.gaming >= 55);
assert.ok(gamingFoundation.purchaseMotivation.motivationConfidence > 0);
pass("motivation_signals_and_confidence");

const { purchaseMotivation: _ignored, ...motivationInput } = gamingFoundation;
const directMotivation = buildPurchaseMotivationEngine(motivationInput, "gaming laptop rtx 144hz");
assert.equal(directMotivation.motivation, gamingFoundation.purchaseMotivation.motivation);
assert.equal(directMotivation.motivationConfidence, gamingFoundation.purchaseMotivation.motivationConfidence);
pass("direct_engine_matches_snapshot");

assert.ok(gamingFoundation.purchaseMotivation.motivationEvidenceChain.length >= 10);
pass("snapshot_purchase_motivation_block");

const intel = {
  finalVerdict: "COMPARE",
  segment: null,
  segmentLabel: "",
  dimensions: [],
  productUnderstandingLine: "",
  globalPriceIntelligence: { lowestPriceFound: sampleProduct.price },
  truthFoundation: gamingFoundation,
};
const sources = buildExtendedTruthEvidenceSources(intel);
assert.ok(sources.hasPurchaseMotivation);
assert.equal(sources.purchaseMotivation, "gaming");
assert.ok(sources.purchaseMotivationConfidence > 0);
assert.ok(sources.gamingMotivationScore >= 55);
assert.ok(sources.purchaseMotivationSignalCount > 0);
assert.ok(sources.purchaseMotivationEvidenceChain.length >= 10);
assert.ok(sources.purchaseMotivationEvidenceChain.some((entry) => entry.startsWith("motivation:")));
assert.ok(sources.purchaseMotivationEvidenceChain.some((entry) => entry.startsWith("gaming:")));
pass("search_evidence_exposes_purchase_motivation_chain");

console.log(`\nPhase 2J purchase motivation intelligence layer: ${passed} checks passed.`);
