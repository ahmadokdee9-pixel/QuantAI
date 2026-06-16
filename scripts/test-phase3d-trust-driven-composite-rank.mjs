#!/usr/bin/env node
/**
 * Phase 3D — Trust-driven composite ranking tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  dedupeProductList,
  dedupeSearchTray,
  sortByCompositeRankEnhanced,
} from "../lib/intelligence/searchRankEnhance.ts";
import { rankSearchResults } from "../lib/intelligence/searchRankingEngine.ts";
import { orderProductsBySearchRank } from "../lib/ui/phase40CommerceRankingActivation.ts";
import {
  computeTrustDrivenRankScore,
  sortProductsByTrustDrivenRank,
  trustDrivenRankOrder,
} from "../lib/truth/trustDrivenCompositeRank.ts";
import { buildTruthFoundationSnapshot } from "../lib/truth/truthEvidenceBuilder.ts";
import { computeTruthRankContributions } from "../lib/truth/truthIntegrationKernel.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("trustDrivenCompositeRank"), "no UI trust rank module import");
assert.ok(surface.includes("sortByCompositeRankEnhanced"), "surface still uses composite rank helper");
pass("no_ui_truth_rank_imports");

const phase45 = readFileSync(join(process.cwd(), "lib/ui/phase45ProductionReadinessActivation.ts"), "utf8");
assert.ok(phase45.includes("trustDrivenRankOrder"), "phase45 unifies intelligence rank order");
pass("phase45_unified_order");

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
const applePhone = {
  id: 3,
  title: "Apple iPhone 15 128GB",
  store: "Best Buy",
  price: 699,
  displayPrice: "€699",
  rating: 4.8,
  link: "https://bestbuy.com/iphone15",
  image: "",
  reviewsCount: 900,
  shipping: "Free delivery",
  availability: "In stock",
  oldPrice: 799,
  priceTrend: "down",
  extensions: ["In stock"],
};
const androidPhone = {
  ...applePhone,
  id: 4,
  title: "Samsung Galaxy A15 Budget Android Phone",
  price: 199,
  link: "https://bestbuy.com/galaxy-a15",
};

const gamingQuery = "best gaming laptop under 1500 euro";
const ultrabook = {
  ...gamingLaptop,
  id: 5,
  title: "Dell XPS 13 Ultrabook Intel i7 Business Laptop",
  link: "https://amazon.com/dp/xps13",
  price: 1399,
  extensions: ["Ultrabook"],
};
const gamingList = [ultrabook, gamingLaptop];
const gamingRanked = sortByCompositeRankEnhanced(gamingList, gamingQuery);
assert.equal(
  gamingRanked[0].link,
  gamingLaptop.link,
  "truth delta boosts gaming laptop over non-gaming peer at same price"
);
pass("truth_delta_changes_order_on_strong_evidence");

const cheapIphoneQuery = "cheap iphone";
const iphoneList = [androidPhone, applePhone];
const gamingScore = computeTrustDrivenRankScore({
  product: gamingLaptop,
  list: gamingList,
  query: gamingQuery,
});
const peerScore = computeTrustDrivenRankScore({
  product: ultrabook,
  list: gamingList,
  query: gamingQuery,
});
assert.ok(gamingScore.truthDelta > peerScore.truthDelta, "gaming listing gets higher truth delta");
assert.ok(gamingScore.finalScore > peerScore.finalScore, "gaming final score beats non-gaming peer");
pass("positive_truth_delta_separates_fit");

const iphoneRanked = sortByCompositeRankEnhanced(iphoneList, cheapIphoneQuery);
assert.equal(iphoneRanked[0].link, applePhone.link, "iphone ranks first for cheap iphone query");
pass("weak_negative_does_not_overrule_strong_relevance");

const dupeA = {
  ...gamingLaptop,
  id: 10,
  link: "https://amazon.com/dp/gaming-laptop-dup-a",
  price: 1399,
};
const dupeB = {
  ...gamingLaptop,
  id: 11,
  link: "https://amazon.com/dp/gaming-laptop-dup-b",
  price: 1405,
};
const deduped = dedupeProductList([dupeA, dupeB, ultrabook]);
assert.equal(deduped.length, 2, "near-duplicate retailer rows collapse");
assert.ok(deduped.some((p) => p.link === ultrabook.link));
pass("dedupe_product_list_preserved");

const noisy = dedupeSearchTray([dupeA, dupeB]);
assert.ok(noisy.length <= 2);
pass("dedupe_search_tray_preserved");

const { sorted: trustSorted, scoresByLink } = sortProductsByTrustDrivenRank(gamingList, gamingQuery);
const trustOrder = trustDrivenRankOrder(
  gamingList.map((p) => p.link),
  scoresByLink
);
const compositeOrder = sortByCompositeRankEnhanced(gamingList, gamingQuery).map((p) => p.link);
assert.deepEqual(trustOrder, compositeOrder, "trust order matches composite enhanced order");
pass("trust_order_matches_composite_sort");

const phase40Order = orderProductsBySearchRank(gamingList, trustOrder).map((p) => p.link);
assert.deepEqual(phase40Order, compositeOrder, "phase40 order helper matches trust composite order");
pass("phase40_order_matches_composite");

const surfaceOrderCheck = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(surfaceOrderCheck.includes("orderProductsBySearchRank(sortedProducts, phase45TrayContext.intelligenceRankOrder)"));
assert.ok(surfaceOrderCheck.includes("sortByCompositeRankEnhanced(sortedProducts, searchQuery"));
assert.ok(surfaceOrderCheck.includes("truthPrefetchByLink"));
pass("surface_uses_unified_rank_inputs");

for (const product of gamingList) {
  const result = scoresByLink.get(product.link);
  assert.ok(result);
  const record = result.record;
  assert.equal(record.finalRankScore, result.finalScore);
  assert.equal(record.baseScore, result.legacyBase);
  assert.equal(record.truthDelta, result.truthDelta);
  assert.equal(record.finalRankScore, Math.round((record.baseScore + record.truthDelta) * 10) / 10);
  assert.ok(record.layers.length === 9);
  assert.ok(record.evidenceChain.length > 0);
}
pass("ranking_decision_record_matches_final_score");

const rankEngine = rankSearchResults({
  winner: { winnerLink: gamingLaptop.link, winnerTitle: gamingLaptop.title, candidates: [] },
  rows: [
    {
      link: gamingLaptop.link,
      product: gamingLaptop,
      winnerScore: 80,
      opportunityScore: 70,
      valueScore: 65,
      qualityScore: 75,
      trustScore: 80,
      verdict: "BUY READY",
      price: gamingLaptop.price,
      truthRankDelta: gamingScore.truthDelta,
    },
    {
      link: ultrabook.link,
      product: ultrabook,
      winnerScore: 60,
      opportunityScore: 55,
      valueScore: 50,
      qualityScore: 45,
      trustScore: 55,
      verdict: "COMPARE",
      price: ultrabook.price,
      truthRankDelta: peerScore.truthDelta,
    },
  ],
});
assert.equal(rankEngine[0].link, gamingLaptop.link, "searchRankingEngine honors truthRankDelta");
pass("search_ranking_engine_injects_truth_delta");

assert.ok(
  computeTruthRankContributions(
    buildTruthFoundationSnapshot({
      product: gamingLaptop,
      listingUrl: gamingLaptop.link,
      searchQuery: gamingQuery,
    })
  ).truthRankDelta <= 25 &&
    computeTruthRankContributions(
      buildTruthFoundationSnapshot({
        product: gamingLaptop,
        listingUrl: gamingLaptop.link,
        searchQuery: gamingQuery,
      })
    ).truthRankDelta >= -25
);
assert.ok(
  computeTruthRankContributions(
    buildTruthFoundationSnapshot({
      product: ultrabook,
      listingUrl: ultrabook.link,
      searchQuery: gamingQuery,
    })
  ).truthRankDelta <= 25 &&
    computeTruthRankContributions(
      buildTruthFoundationSnapshot({
        product: ultrabook,
        listingUrl: ultrabook.link,
        searchQuery: gamingQuery,
      })
    ).truthRankDelta >= -25
);
pass("truth_delta_bounded");

console.log(`\nPhase 3D trust-driven composite rank: ${passed} checks passed.`);
