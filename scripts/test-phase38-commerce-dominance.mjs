#!/usr/bin/env node
/**
 * Phase 38 — Global Buy Destination + Commerce Dominance validation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { detectShopperIntentMode } from "../lib/intelligence/shopperIntentModeEngine.ts";
import { buyExplanationIsSpecific } from "../lib/intelligence/buyExplanationEngine.ts";
import {
  buildCommerceDominanceDecisionMap,
  commerceDominanceVerdictDistribution,
} from "../lib/ui/phase38CommerceDominanceActivation.ts";

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
    buyReasoning: "Lead listing clears analyst checks.",
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
  readFileSync(join(process.cwd(), "lib/ui/phase38CommerceDominanceActivation.ts"), "utf8").includes(
    "buildCommerceDominanceDecisionMap"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
    "buildCommerceIntelligenceCoreDecisionMap"
  )
);
assert.ok(
  !readFileSync(join(process.cwd(), "lib/ui/commerceDominanceBriefEnrichment.ts"), "utf8").includes("Global verdict")
);
assert.ok(
  readFileSync(join(process.cwd(), "components/search/MarketSummaryBlock.tsx"), "utf8").includes("Market coverage")
);

const valueTray = [
  listing(1, "Premium Corner Sofa Grey", "IKEA", 800, 899, 4.5, 120, "best"),
  listing(2, "Family Sectional Sofa", "Wayfair", 970, 1099, 4.4, 88, "mid"),
  listing(3, "Luxury Leather Sofa", "Made.com", 1299, 1399, 4.6, 62, "lux"),
  listing(4, "Budget Fabric Sofa", "Bol.com", 449, 499, 4.0, 200, "budget"),
  listing(5, "Scandinavian Sofa", "Leen Bakker", 999, 1199, 4.4, 75, "scandi"),
  listing(6, "Compact Sofa Bed", "Amazon", 649, 749, 4.2, 310, "compact"),
];

// Test 1 — Buy-first: multiple BUY READY on fair value tray
{
  const data = scenario("modern sofa", valueTray);
  const { decisions: map, trayContext } = buildCommerceDominanceDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  const dist = commerceDominanceVerdictDistribution(
    new Map(
      [...map.entries()].map(([link, d]) => [
        link,
        {
          link,
          verdict: d.verdict,
          spreadScore: 0,
          rankIndex: 0,
          gapFromTop: 0,
          traySize: map.size,
          commercePriorityLabel: d.productIntelligence?.commercePriorityLabel ?? "COMPARE",
        },
      ])
    )
  );
  assert.ok(dist["BUY READY"] >= 1, "buy-first: at least 1 BUY READY");
  assert.ok(trayContext.marketCoverage.merchantsScanned >= 4, "market coverage merchants");
  assert.ok(trayContext.marketCoverage.coveragePct >= 70, "market coverage pct");
}

// Test 2 — Every product has best place to buy
{
  const data = scenario("modern sofa", valueTray);
  const { decisions: map } = buildCommerceDominanceDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  for (const [, decision] of map) {
    const best = decision.productIntelligence?.bestPlaceToBuy;
    assert.ok(best?.merchant, "best place merchant");
    assert.ok(best?.price > 0, "best place price");
    assert.ok(best?.advantage, "best place advantage");
  }
}

// Test 3 — INSUFFICIENT DATA not used for normal valid listings
{
  const data = scenario("modern sofa", valueTray);
  const { decisions: map } = buildCommerceDominanceDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  const insufficient = [...map.values()].filter((d) => d.verdict === "INSUFFICIENT DATA").length;
  assert.ok(insufficient === 0, "valid tray should not use INSUFFICIENT DATA");
}

// Test 4 — Shopper intent modes
assert.ok(detectShopperIntentMode("cheap sofa").primaryMode === "Budget Buyer");
assert.ok(detectShopperIntentMode("luxury sofa").primaryMode === "Premium Buyer");
assert.ok(detectShopperIntentMode("best deal iphone").primaryMode === "Best Deal Hunter");

// Test 5 — Buy explanation on BUY READY
{
  const data = scenario("best value sofa", valueTray);
  const { decisions: map } = buildCommerceDominanceDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  const buyReady = [...map.values()].filter((d) => d.verdict === "BUY READY");
  assert.ok(buyReady.length >= 1, "buy ready rows exist");
  for (const decision of buyReady) {
    const explanation = decision.productIntelligence?.buyExplanation;
    assert.ok(explanation?.whyBuy && explanation?.whyNow && explanation?.whyThisSeller, "buy explanation complete");
    assert.ok(buyExplanationIsSpecific(explanation.primaryLine), "buy explanation specific");
  }
}

// Test 6 — WAIT has prediction when present
{
  const data = scenario("modern sofa", valueTray);
  const { decisions: map } = buildCommerceDominanceDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  for (const [, decision] of map) {
    if (decision.verdict === "WAIT") {
      const wait = decision.productIntelligence?.waitPrediction;
      assert.ok(wait?.predictionLine, "wait has prediction");
      assert.ok(wait?.expectedTimeframe, "wait has timeframe");
    }
  }
}

// Test 7 — No global verdict in brief enrichment
{
  const data = scenario("modern sofa", valueTray);
  const { decisions: map, trayContext } = buildCommerceDominanceDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  const leader = map.values().next().value;
  assert.ok(leader?.productIntelligence?.marketCoverage?.headline.includes("merchants scanned"));
  assert.ok(!trayContext.marketCoverage.headline.toLowerCase().includes("global verdict"));
}

console.log("Phase 38 global buy destination + commerce dominance: PASS");
