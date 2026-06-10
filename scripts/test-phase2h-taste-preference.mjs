#!/usr/bin/env node
/**
 * Phase 2H — Taste & preference intelligence layer tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildTastePreferenceEngine } from "../lib/truth/tastePreferenceEngine.ts";
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
assert.ok(!surface.includes("tastePreferenceEngine"), "no UI taste preference import");
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

const minimalist = foundationForQuery("minimalist desk setup");
assert.equal(minimalist.tastePreference.aestheticProfile, "minimalist");
assert.ok(minimalist.tastePreference.minimalistPreference >= 55);
assert.ok(minimalist.tastePreference.tasteSignals.some((s) => s.includes("minimalist")));
pass("minimalist_desk_setup_taste");

const premiumLook = foundationForQuery("premium looking laptop");
assert.ok(premiumLook.tastePreference.premiumAffinity >= 55);
assert.ok(["premium", "luxury", "balanced"].includes(premiumLook.tastePreference.aestheticProfile));
pass("premium_looking_laptop_taste");

const luxuryWatch = foundationForQuery("luxury watch");
assert.ok(luxuryWatch.tastePreference.luxuryPreference >= 55);
assert.equal(luxuryWatch.tastePreference.styleProfile, "luxury");
pass("luxury_watch_taste");

const valueGaming = foundationForQuery("best value gaming laptop");
assert.ok(valueGaming.tastePreference.valueAffinity >= 55);
assert.ok(valueGaming.tastePreference.performancePreference >= 55);
pass("best_value_gaming_laptop_taste");

const portableMonitor = foundationForQuery("portable monitor for travel");
assert.ok(portableMonitor.tastePreference.portabilityPreference >= 55);
pass("portable_monitor_travel_taste");

const modernFurniture = foundationForQuery("modern furniture");
assert.equal(modernFurniture.tastePreference.styleProfile, "modern");
assert.equal(modernFurniture.tastePreference.aestheticProfile, "modern");
pass("modern_furniture_taste");

const arabicModern = foundationForQuery("أريد تصميم عصري");
assert.equal(arabicModern.tastePreference.aestheticProfile, "modern");
assert.equal(arabicModern.tastePreference.styleProfile, "modern");
pass("arabic_modern_design_taste");

const arabicLuxury = foundationForQuery("منتج فاخر");
assert.ok(arabicLuxury.tastePreference.luxuryPreference >= 55);
pass("arabic_luxury_product_taste");

const { tastePreference: _ignored, ...tasteInput } = valueGaming;
const directTaste = buildTastePreferenceEngine(tasteInput, "best value gaming laptop");
assert.equal(directTaste.valueAffinity, valueGaming.tastePreference.valueAffinity);
assert.equal(directTaste.performancePreference, valueGaming.tastePreference.performancePreference);
pass("direct_engine_matches_snapshot");

assert.ok(valueGaming.tastePreference.tasteConfidence > 0);
pass("snapshot_taste_preference_block");

const intel = {
  finalVerdict: "COMPARE",
  segment: null,
  segmentLabel: "",
  dimensions: [],
  productUnderstandingLine: "",
  globalPriceIntelligence: { lowestPriceFound: sampleProduct.price },
  truthFoundation: valueGaming,
};
const sources = buildExtendedTruthEvidenceSources(intel);
assert.ok(sources.hasTastePreference);
assert.ok(sources.premiumAffinity >= 0);
assert.ok(sources.valueAffinity >= 55);
assert.ok(sources.performancePreference >= 55);
assert.ok(sources.tasteConfidence > 0);
assert.ok(sources.tasteSignalCount > 0);
assert.ok(sources.tasteEvidenceChain.length >= 5);
assert.ok(sources.tasteEvidenceChain.some((entry) => entry.startsWith("value:")));
assert.ok(sources.tasteEvidenceChain.some((entry) => entry.startsWith("performance:")));
pass("search_evidence_exposes_taste_chain");

console.log(`\nPhase 2H taste & preference intelligence layer: ${passed} checks passed.`);
