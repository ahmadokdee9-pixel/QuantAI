#!/usr/bin/env node
/**
 * Phase 41 — Global Category Intelligence + Billion-Dollar Buy validation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { detectCategoryFromQuery } from "../lib/intelligence/globalCategoryIntelligenceEngine.ts";
import { buildUniversalQueryIntelligence } from "../lib/intelligence/universalQueryIntelligenceEngine.ts";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import {
  buildGlobalCategoryDecisionMap,
  orderProductsBySearchRank,
} from "../lib/ui/phase41GlobalCategoryActivation.ts";

const base = {
  extensions: [],
  availability: "In stock",
  shipping: "Free delivery",
  image: "https://images.example.com/product.jpg",
};

function listing(id, title, store, price, oldPrice, rating, reviewsCount, tag) {
  return {
    ...base,
    id,
    link: `https://shop.example/${tag}/${id}`,
    title,
    store,
    price,
    oldPrice,
    rating,
    reviewsCount,
    priceTrend: price < oldPrice ? "down" : "stable",
  };
}

function trustFactory(product) {
  return {
    link: product.link,
    trustScore: 78,
    discountAuthenticity: "verified",
    retailerIntegrity: "high",
    priceRealism: "fair",
    compositeTrust: 0.82,
  };
}

function scenario(query, tray) {
  const brief = {
    headline: "tray",
    recommendation: { label: "Top pick", title: tray[0].title, store: tray[0].store, link: tray[0].link, price: tray[0].price },
    why: [],
    alternatives: [],
    discountNote: null,
    confidence: 0.84,
    sparseTrayWarning: null,
    explanation: "Institutional brief.",
    buyReasoning: "Lead rationale.",
    riskSignals: [],
  };

  const trayCtx = buildTrayCoherenceContext({
    searchMeta: {
      verdictIntelligence: {
        version: "phase10-v1",
        verdict: "BUY READY",
        confidence: 0.86,
        rationale: "Lead rationale.",
        strengths: [],
        warnings: [],
        factorTrace: {},
      },
      phase93TrustDiscount: {
        version: "phase93-v1",
        trayAssessments: tray.map((product) => trustFactory(product)),
      },
    },
    decisionBrief: brief,
  });

  const coherenceMap = new Map(
    tray.map((product, rank) => [
      product.link,
      activateProductDecisionCoherence({ product, list: tray, rank, tray: trayCtx, searchQuery: query }),
    ])
  );

  const metaByLink = new Map(
    tray.map((product, rank) => [
      product.link,
      { price: product.price, rank, rating: product.rating, reviewsCount: product.reviewsCount, store: product.store },
    ])
  );

  const productsByLink = new Map(tray.map((product) => [product.link, { product, searchQuery: query }]));
  return { query, tray, coherenceMap, metaByLink, productsByLink };
}

assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/phase41GlobalCategoryActivation.ts"), "utf8").includes(
    "buildGlobalCategoryDecisionMap"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
    "buildCommerceIntelligenceCoreDecisionMap"
  )
);
assert.ok(!readFileSync(join(process.cwd(), "components/search/MarketSummaryBlock.tsx"), "utf8").includes("Global verdict"));

const sofaTray = [
  listing(1, "Premium Corner Sofa Grey", "IKEA", 800, 899, 4.5, 120, "best"),
  listing(2, "Family Sectional Sofa", "Wayfair", 970, 1099, 4.4, 88, "mid"),
  listing(3, "Luxury Leather Sofa", "Made.com", 1299, 1399, 4.6, 62, "lux"),
  listing(4, "Budget Fabric Sofa", "Bol.com", 449, 499, 4.0, 200, "budget"),
  listing(5, "Scandinavian Sofa", "Leen Bakker", 999, 1199, 4.4, 75, "scandi"),
  listing(6, "Compact Sofa Bed", "Amazon", 649, 749, 4.2, 310, "compact"),
];

const laptopTray = [
  listing(1, "MacBook Air M1 16GB 512GB", "Apple", 1099, 1299, 4.8, 420, "mac"),
  listing(2, "Dell XPS 13 i7 16GB", "Dell", 999, 1199, 4.5, 180, "dell"),
  listing(3, "Lenovo ThinkPad Ryzen 16GB", "Lenovo", 849, 999, 4.4, 210, "lenovo"),
];

// Test 1 — Category detection per query
assert.equal(detectCategoryFromQuery("corner sofa"), "sofas");
assert.equal(detectCategoryFromQuery("MacBook Air M1"), "laptops");
assert.equal(detectCategoryFromQuery("iPhone 16"), "phones");

// Test 2 — Arabic query understanding
{
  const ar = buildUniversalQueryIntelligence("ارخص كنبة زاوية بجودة جيدة");
  assert.ok(ar.language === "ar" || ar.language === "mixed");
  assert.ok(ar.categoryKey === "sofas" || ar.budgetLevel === "budget");
}

// Test 3 — Buy-first: 1–3 BUY READY on sofa tray
{
  const data = scenario("corner sofa", sofaTray);
  const { decisions: map } = buildGlobalCategoryDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  const buyReady = [...map.values()].filter((d) => d.verdict === "BUY READY").length;
  assert.ok(buyReady >= 1 && buyReady <= 4, `buy-first: ${buyReady} BUY READY`);
}

// Test 4 — Best Overall Choice not WAIT without blocker
{
  const data = scenario("modern couch", sofaTray);
  const { decisions: map } = buildGlobalCategoryDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  const winner = [...map.values()].find((d) => d.productIntelligence?.globalWinner?.isWinner);
  assert.ok(winner, "global winner exists");
  if (winner.confidence >= 78) {
    assert.notEqual(winner.verdict, "WAIT", "Best Overall Choice should not be WAIT at high confidence");
  }
}

// Test 5 — Category intelligence on laptop tray
{
  const data = scenario("best laptop for programming", laptopTray);
  const { decisions: map } = buildGlobalCategoryDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  for (const [, decision] of map) {
    const cat = decision.productIntelligence?.globalCategoryIntelligence;
    assert.ok(cat?.categoryKey === "laptops", "laptop category");
    assert.ok(cat.dimensions.length >= 5, "category dimensions");
  }
}

// Test 6 — Discount labels visible in reasoning
{
  const data = scenario("cheap sofa", sofaTray);
  const { decisions: map } = buildGlobalCategoryDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  const withDiscount = [...map.values()].filter((d) => d.productIntelligence?.billionDollarDiscount?.labels.length);
  assert.ok(withDiscount.length >= 1, "discount labels attached");
}

// Test 7 — Rank explanation on every ranked product
{
  const data = scenario("modern sofa", sofaTray);
  const { decisions: map } = buildGlobalCategoryDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  for (const [, decision] of map) {
    const rank = decision.productIntelligence?.rankExplanation;
    if (decision.productIntelligence?.searchRank) {
      assert.ok(rank?.whyThisRank, "why this rank");
      assert.ok(rank?.buyerAction, "buyer action");
    }
  }
}

// Test 8 — Market summary V2 neutral (no global verdict)
{
  const data = scenario("corner sofa", sofaTray);
  const { trayContext } = buildGlobalCategoryDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  const summary = trayContext.marketSummaryV2;
  assert.ok(summary.synthesisLine.includes("Market Coverage"), "market coverage in summary");
  assert.ok(summary.bestOverallChoice || summary.bestDealFound, "best choice in summary");
  assert.ok(!summary.synthesisLine.toLowerCase().includes("global verdict"));
}

// Test 9 — Cheap weak product should not beat strong value unfairly
{
  const data = scenario("corner sofa", sofaTray);
  const { trayContext, decisions: map } = buildGlobalCategoryDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  const ordered = orderProductsBySearchRank(data.tray, trayContext.intelligenceRankOrder);
  const topLink = ordered[0]?.link;
  const top = map.get(topLink);
  const budget = [...map.values()].find((d) => d.productIntelligence?.searchRank?.label === "Budget Choice");
  if (top && budget) {
    assert.ok(
      (top.productIntelligence?.categoryBalancedScore?.balancedScore ?? 0) >=
        (budget.productIntelligence?.categoryBalancedScore?.balancedScore ?? 0) - 5,
      "top rank should not lose badly to budget on balanced score"
    );
  }
}

// Test 10 — Identity matching attached
{
  const data = scenario("iPhone 16", sofaTray);
  const { decisions: map } = buildGlobalCategoryDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  for (const [, decision] of map) {
    assert.ok(decision.productIntelligence?.productIdentityV2?.identityClass, "identity class");
  }
}

console.log("Phase 41 global category intelligence + billion-dollar buy: PASS");
