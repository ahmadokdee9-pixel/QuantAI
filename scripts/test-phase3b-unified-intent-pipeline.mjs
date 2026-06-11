#!/usr/bin/env node
/**
 * Phase 3B — Unified search intent pipeline tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildIntentIntelligenceEngine } from "../lib/truth/intentIntelligenceEngine.ts";
import { parseCommerceSearchIntents } from "../lib/intelligence/searchIntentV2.ts";
import {
  derivePurchaseIntent,
  purchaseIntentFromQuery,
  resolveUnifiedSearchIntent,
} from "../lib/truth/unifiedIntentPipeline.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("unifiedIntentPipeline"), "no UI unified intent import");
pass("no_ui_redesign");

const rankEnhance = readFileSync(join(process.cwd(), "lib/intelligence/searchRankEnhance.ts"), "utf8");
assert.ok(rankEnhance.includes("resolveUnifiedSearchIntent"), "searchRankEnhance uses unified intent");
assert.ok(!rankEnhance.includes("parseCommerceSearchIntents(query)"), "no duplicate commerce parse in rank enhance");
assert.ok(!rankEnhance.includes("buildIntentIntelligenceEngine(query)"), "no duplicate 2A build in rank enhance");
pass("search_rank_enhance_uses_unified_intent");

const gamingQuery = "best gaming laptop under 1500 euro";
const unified = resolveUnifiedSearchIntent(gamingQuery);
const direct2A = buildIntentIntelligenceEngine(gamingQuery);

assert.deepEqual(unified.intentEngine?.intent, direct2A.intent, "2A intent snapshot unchanged");
assert.equal(unified.intentEngine?.intentConfidence, direct2A.intentConfidence);
assert.deepEqual(unified.mergedFrom, ["2A", "searchIntentV2"]);
pass("canonical_2a_snapshot_preserved");

assert.equal(unified.commerceIntents.gaming, true, "2A gaming useCase enriches commerce gaming flag");
assert.equal(unified.commerceIntents.budget, true, "2A budget enriches commerce budget flag");
assert.equal(unified.commerceIntents.cheapestTrusted, true, "2A budget enriches cheapestTrusted");
pass("2a_enriches_commerce_intents");

const baseCommerce = parseCommerceSearchIntents(gamingQuery);
assert.equal(baseCommerce.gaming, true, "searchIntentV2 already detects gaming for this query");
assert.equal(unified.commerceIntents.qualitySeeking, true, "2A best quality enriches qualitySeeking");
pass("commerce_flags_merged_not_replaced");

assert.equal(unified.purchaseIntent, "budget", "2A budget cap enriches budget purchase intent");
assert.equal(purchaseIntentFromQuery(gamingQuery), unified.purchaseIntent);
assert.equal(derivePurchaseIntent(gamingQuery, unified.commerceIntents), unified.purchaseIntent);
pass("purchase_intent_derivation");

const budgetQuery = "cheap iphone under 500";
const budgetUnified = resolveUnifiedSearchIntent(budgetQuery);
assert.equal(budgetUnified.purchaseIntent, "budget");
assert.equal(budgetUnified.commerceIntents.budget, true);
assert.equal(budgetUnified.intentEngine?.intent.preferredBrand, "Apple");
pass("budget_iphone_intent");

const fastQuery = "fast shipping laptop next day delivery";
const fastUnified = resolveUnifiedSearchIntent(fastQuery);
assert.equal(fastUnified.purchaseIntent, "fast");
pass("fast_delivery_intent");

const premiumQuery = "luxury flagship premium headphones";
const premiumUnified = resolveUnifiedSearchIntent(premiumQuery);
assert.equal(premiumUnified.purchaseIntent, "premium");
pass("premium_intent");

const empty = resolveUnifiedSearchIntent("   ");
assert.equal(empty.intentEngine, null);
assert.equal(empty.purchaseIntent, "neutral");
assert.deepEqual(empty.mergedFrom, []);
pass("empty_query_neutral");

console.log(`\nPhase 3B unified intent: ${passed} checks passed.`);
