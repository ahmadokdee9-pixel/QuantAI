#!/usr/bin/env node
/**
 * Phase 3A — Truth integration kernel tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeTruthRankContributions } from "../lib/truth/truthIntegrationKernel.ts";
import { buildTruthFoundationSnapshot } from "../lib/truth/truthEvidenceBuilder.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("truthIntegrationKernel"), "no UI truth kernel import");
pass("no_ui_redesign");

const rankEnhance = readFileSync(join(process.cwd(), "lib/intelligence/searchRankEnhance.ts"), "utf8");
assert.ok(rankEnhance.includes("sortProductsByTrustDrivenRank"), "kernel wired into ranking");
pass("ranking_uses_trust_driven_scorer");

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

const gamingQuery = "best gaming laptop under 1500 euro";
const gamingFoundation = buildTruthFoundationSnapshot({
  product: gamingLaptop,
  listingUrl: gamingLaptop.link,
  searchQuery: gamingQuery,
});
const officeFoundation = buildTruthFoundationSnapshot({
  product: officeLaptop,
  listingUrl: officeLaptop.link,
  searchQuery: gamingQuery,
});
const mismatchFoundation = buildTruthFoundationSnapshot({
  product: androidPhone,
  listingUrl: androidPhone.link,
  searchQuery: "cheap iphone",
});

const gamingBundle = computeTruthRankContributions(gamingFoundation);
const officeBundle = computeTruthRankContributions(officeFoundation);
const mismatchBundle = computeTruthRankContributions(mismatchFoundation);

assert.equal(gamingBundle.version, 1);
assert.equal(gamingBundle.layers.length, 9, "all nine layers 2C–2K present");
pass("nine_layer_contributions");

const layerIds = gamingBundle.layers.map((layer) => layer.layer);
assert.ok(layerIds.includes("2C_productMatch"));
assert.ok(layerIds.includes("2E_recommendation"));
assert.ok(layerIds.includes("2K_purchaseConstraints"));
pass("expected_layer_ids");

for (const layer of gamingBundle.layers) {
  assert.ok(Number.isFinite(layer.rawScore), `${layer.layer} rawScore finite`);
  assert.ok(Number.isFinite(layer.scoreContribution), `${layer.layer} contribution finite`);
  assert.ok(Math.abs(layer.scoreContribution) <= Math.abs(layer.weight) + 0.01, `${layer.layer} within weight bound`);
}
pass("layer_contribution_bounds");

assert.ok(
  gamingBundle.truthRankDelta >= -25 && gamingBundle.truthRankDelta <= 25,
  "global clamp ±25"
);
pass("global_delta_clamp");

assert.ok(
  gamingBundle.truthRankDelta > officeBundle.truthRankDelta,
  "gaming laptop should rank higher than chromebook for gaming query"
);
pass("gaming_beats_office_delta");

const recLayer = gamingBundle.layers.find((layer) => layer.layer === "2E_recommendation");
const officeRecLayer = officeBundle.layers.find((layer) => layer.layer === "2E_recommendation");
assert.ok(recLayer && officeRecLayer);
assert.ok(recLayer.scoreContribution >= officeRecLayer.scoreContribution, "2E favors gaming match");
pass("recommendation_layer_separates_fit");

const mismatchRec = mismatchBundle.layers.find((layer) => layer.layer === "2E_recommendation");
assert.ok(mismatchRec);
assert.ok(mismatchRec.scoreContribution <= 0, "iphone mismatch should not boost via 2E");
pass("mismatch_penalized_by_recommendation");

const matchLayer = mismatchBundle.layers.find((layer) => layer.layer === "2C_productMatch");
assert.ok(matchLayer);
assert.ok(matchLayer.scoreContribution < gamingBundle.layers.find((l) => l.layer === "2C_productMatch").scoreContribution);
pass("product_match_layer_separates_fit");

const sumLayers = gamingBundle.layers.reduce((sum, layer) => sum + layer.scoreContribution, 0);
const expectedDelta = Math.min(25, Math.max(-25, Math.round(sumLayers * 10) / 10));
assert.equal(gamingBundle.truthRankDelta, expectedDelta, "truthRankDelta equals clamped layer sum");
pass("delta_equals_clamped_sum");

console.log(`\nPhase 3A truth integration kernel: ${passed} checks passed.`);
