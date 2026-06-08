#!/usr/bin/env node
/**
 * Phase 40 — Global Ranking + Winner Intelligence validation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { hasStaticConfidenceCluster } from "../lib/intelligence/dynamicConfidenceEngine.ts";
import {
  buildCommerceRankingDecisionMap,
  orderProductsBySearchRank,
} from "../lib/ui/phase40CommerceRankingActivation.ts";

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
  readFileSync(join(process.cwd(), "lib/ui/phase40CommerceRankingActivation.ts"), "utf8").includes(
    "buildCommerceRankingDecisionMap"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
    "buildCommerceIntelligenceCoreDecisionMap"
  )
);

const valueTray = [
  listing(1, "Premium Corner Sofa Grey", "IKEA", 800, 899, 4.5, 120, "best"),
  listing(2, "Family Sectional Sofa", "Wayfair", 970, 1099, 4.4, 88, "mid"),
  listing(3, "Luxury Leather Sofa", "Made.com", 1299, 1399, 4.6, 62, "lux"),
  listing(4, "Budget Fabric Sofa", "Bol.com", 449, 499, 4.0, 200, "budget"),
  listing(5, "Scandinavian Sofa", "Leen Bakker", 999, 1199, 4.4, 75, "scandi"),
  listing(6, "Compact Sofa Bed", "Amazon", 649, 749, 4.2, 310, "compact"),
];

// Test 1 — Single global winner with Best Overall Choice
{
  const data = scenario("modern sofa", valueTray);
  const { decisions: map, trayContext } = buildCommerceRankingDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  const winners = [...map.values()].filter((d) => d.productIntelligence?.globalWinner?.isWinner);
  assert.equal(winners.length, 1, "exactly one global winner");
  assert.ok(winners[0]?.productIntelligence?.searchRank?.label === "Best Overall Choice", "winner is Best Overall Choice");
  assert.ok(trayContext.rankingApplied, "ranking applied");
  assert.ok(trayContext.searchDominanceSummary.resultsAnalyzed === valueTray.length, "search summary results count");
}

// Test 2 — Intentional search ranking order
{
  const data = scenario("modern sofa", valueTray);
  const { decisions: map, trayContext } = buildCommerceRankingDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  const ordered = orderProductsBySearchRank(data.tray, trayContext.intelligenceRankOrder);
  assert.equal(ordered[0]?.link, trayContext.intelligenceRankOrder[0], "#1 ranked first");
  const ranks = [...map.values()].map((d) => d.productIntelligence?.searchRank?.rank).filter(Boolean);
  assert.equal(new Set(ranks).size, ranks.length, "unique rank numbers");
}

// Test 3 — Opportunity label interpretation
{
  const data = scenario("modern sofa", valueTray);
  const { decisions: map } = buildCommerceRankingDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  for (const [, decision] of map) {
    const label = decision.productIntelligence?.opportunityLabel;
    assert.ok(label?.displayLine.includes("/ 100"), "opportunity score display");
    assert.ok(label?.band, "opportunity band label");
  }
}

// Test 4 — Dynamic confidence not clustered
{
  const data = scenario("modern sofa", valueTray);
  const { decisions: map } = buildCommerceRankingDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  const confidences = [...map.values()].map((d) => d.confidence);
  assert.ok(confidences.every((c) => c >= 0 && c <= 100), "confidence in range");
  assert.ok(!hasStaticConfidenceCluster(confidences, confidences[0], 4), "no identical confidence cluster");
}

// Test 5 — Best savings intelligence
{
  const data = scenario("modern sofa", valueTray);
  const { trayContext } = buildCommerceRankingDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  const summary = trayContext.searchDominanceSummary;
  assert.ok(summary.lowestPrice > 0, "lowest price");
  assert.ok(summary.highestPrice >= summary.lowestPrice, "highest >= lowest");
  assert.ok(summary.potentialSavings >= 0, "potential savings");
  assert.ok(summary.synthesisLine.includes("Merchants analyzed"), "search synthesis");
}

// Test 6 — WAIT has forecast when present
{
  const data = scenario("modern sofa", valueTray);
  const { decisions: map } = buildCommerceRankingDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  for (const [, decision] of map) {
    if (decision.verdict === "WAIT") {
      const forecast = decision.productIntelligence?.waitForecastV2;
      assert.ok(forecast?.forecastValid, "wait has valid forecast");
      assert.ok(forecast?.formattedBlock.includes("Expected Savings"), "wait savings line");
    }
  }
}

// Test 7 — BUY READY confidence aligned
{
  const data = scenario("best value sofa", valueTray);
  const { decisions: map } = buildCommerceRankingDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  for (const [, decision] of map) {
    if (decision.verdict === "BUY READY") {
      assert.ok(decision.confidence >= 70, "BUY READY confidence >= 70");
      const validation = decision.productIntelligence?.buyReadyValidationV2;
      assert.ok(validation?.checks, "buy ready validation attached");
    }
  }
}

// Test 8 — Search rank labels assigned
{
  const data = scenario("modern sofa", valueTray);
  const { decisions: map } = buildCommerceRankingDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  const labels = [...map.values()].map((d) => d.productIntelligence?.searchRank?.rankHeadline).filter(Boolean);
  assert.ok(labels.some((l) => l.startsWith("#1")), "#1 rank headline exists");
  assert.ok(labels.some((l) => l.includes("Best Overall Choice")), "best overall headline");
}

console.log("Phase 40 global ranking + winner intelligence: PASS");
