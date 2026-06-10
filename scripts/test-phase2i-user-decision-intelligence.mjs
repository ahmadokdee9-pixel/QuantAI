#!/usr/bin/env node
/**
 * Phase 2I — User decision intelligence layer tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildUserDecisionIntelligenceEngine } from "../lib/truth/userDecisionIntelligenceEngine.ts";
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
assert.ok(!surface.includes("userDecisionIntelligenceEngine"), "no UI user decision import");
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

function assertStrategy(query, expectedStrategy) {
  const foundation = foundationForQuery(query);
  assert.equal(
    foundation.userDecisionIntelligence.decisionStrategy,
    expectedStrategy,
    `query "${query}" expected ${expectedStrategy}, got ${foundation.userDecisionIntelligence.decisionStrategy}`
  );
}

assertStrategy("best value gaming laptop", "bestValue");
pass("best_value_decision_strategy");

assertStrategy("best flagship professional camera quality", "bestQuality");
pass("best_quality_decision_strategy");

assertStrategy("luxury watch designer", "premiumChoice");
pass("premium_choice_decision_strategy");

assertStrategy("cheap iphone under 500", "budgetChoice");
pass("budget_choice_decision_strategy");

assertStrategy("durable work laptop long term investment warranty", "longTermInvestment");
pass("long_term_investment_decision_strategy");

assertStrategy("urgent buy gaming laptop now today", "fastPurchase");
pass("fast_purchase_decision_strategy");

assertStrategy("safe reliable trusted laptop with warranty", "safeChoice");
pass("safe_choice_decision_strategy");

assertStrategy("latest innovative cutting edge new smartphone", "experimentalChoice");
pass("experimental_choice_decision_strategy");

const arabicBudget = foundationForQuery("أريد هاتف رخيص");
assert.equal(arabicBudget.userDecisionIntelligence.decisionStrategy, "budgetChoice");
pass("arabic_budget_decision_strategy");

const arabicPremium = foundationForQuery("منتج فاخر");
assert.equal(arabicPremium.userDecisionIntelligence.decisionStrategy, "premiumChoice");
pass("arabic_premium_decision_strategy");

const valueFoundation = foundationForQuery("best value gaming laptop");
assert.ok(valueFoundation.userDecisionIntelligence.decisionBehavior.length > 20);
assert.ok(valueFoundation.userDecisionIntelligence.decisionSignals.length > 0);
assert.ok(valueFoundation.userDecisionIntelligence.strategyScores.bestValue >= 55);
assert.ok(valueFoundation.userDecisionIntelligence.decisionConfidence > 0);
pass("decision_behavior_and_signals");

const { userDecisionIntelligence: _ignored, ...decisionInput } = valueFoundation;
const directDecision = buildUserDecisionIntelligenceEngine(decisionInput, "best value gaming laptop");
assert.equal(directDecision.decisionStrategy, valueFoundation.userDecisionIntelligence.decisionStrategy);
assert.equal(directDecision.decisionConfidence, valueFoundation.userDecisionIntelligence.decisionConfidence);
pass("direct_engine_matches_snapshot");

assert.ok(valueFoundation.userDecisionIntelligence.decisionEvidenceChain.length >= 8);
pass("snapshot_user_decision_block");

const intel = {
  finalVerdict: "COMPARE",
  segment: null,
  segmentLabel: "",
  dimensions: [],
  productUnderstandingLine: "",
  globalPriceIntelligence: { lowestPriceFound: sampleProduct.price },
  truthFoundation: valueFoundation,
};
const sources = buildExtendedTruthEvidenceSources(intel);
assert.ok(sources.hasUserDecisionIntelligence);
assert.equal(sources.userDecisionStrategy, "bestValue");
assert.ok(sources.userDecisionBehavior.length > 0);
assert.ok(sources.userDecisionConfidence > 0);
assert.ok(sources.bestValueStrategyScore >= 55);
assert.ok(sources.userDecisionSignalCount > 0);
assert.ok(sources.userDecisionEvidenceChain.length >= 8);
assert.ok(sources.userDecisionEvidenceChain.some((entry) => entry.startsWith("strategy:")));
assert.ok(sources.userDecisionEvidenceChain.some((entry) => entry.startsWith("bestValue:")));
pass("search_evidence_exposes_user_decision_chain");

console.log(`\nPhase 2I user decision intelligence layer: ${passed} checks passed.`);
