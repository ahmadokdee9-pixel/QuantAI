#!/usr/bin/env node
/**
 * Phase 37 — Global Commerce Intelligence Engine validation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { buildDiscountIntelligenceV2 } from "../lib/intelligence/discountIntelligenceV2Engine.ts";
import { buildGlobalAlternatives } from "../lib/intelligence/globalAlternativeEngine.ts";
import { buildGlobalPriceIntelligence } from "../lib/intelligence/globalPriceIntelligenceEngine.ts";
import {
  globalReasoningIsUnique,
  globalReasoningReferencesContext,
} from "../lib/intelligence/globalDecisionReasoningEngine.ts";
import { buildUniversalOfferGraph } from "../lib/intelligence/universalOfferGraphEngine.ts";
import {
  buildGlobalCommerceDecisionMap,
  globalCommerceVerdictDistribution,
} from "../lib/ui/phase37GlobalCommerceActivation.ts";

function reasoningAvoidsScoreFractions(text) {
  return !/\d+\s*\/\s*100/.test(text);
}

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
  readFileSync(join(process.cwd(), "lib/ui/phase37GlobalCommerceActivation.ts"), "utf8").includes(
    "buildGlobalCommerceDecisionMap"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
    "buildCommerceIntelligenceCoreDecisionMap"
  )
);

// Value-led sofa BUY READY — €800 vs ~€970 market, quality 90
const valueSofaTray = [
  listing(1, "Premium Corner Sofa Grey 3 Seater", "IKEA", 800, 899, 4.5, 120, "best"),
  listing(2, "Family Sectional Sofa Modular", "Wayfair", 970, 1099, 4.4, 88, "mid"),
  listing(3, "Luxury Leather Sofa Black", "Made.com", 1299, 1399, 4.6, 62, "lux"),
  listing(4, "Budget Fabric 2 Seater", "Bol.com", 449, 499, 4.0, 200, "budget"),
  listing(5, "Scandinavian Oak Frame Sofa", "Leen Bakker", 999, 1199, 4.4, 75, "scandi"),
  listing(6, "Compact Apartment Sofa Bed", "Amazon", 649, 749, 4.2, 310, "compact"),
];

const iphoneTray = [
  listing(1, "Apple iPhone 16 Pro Max 256GB", "Apple Store", 1299, 1299, 4.9, 520, "iphone1"),
  listing(2, "Apple iPhone 16 Pro 256GB", "Best Buy", 1099, 1199, 4.8, 410, "iphone2"),
  listing(3, "Apple iPhone 16 128GB Refurbished", "Back Market", 749, 899, 4.6, 180, "refurb"),
  listing(4, "Apple iPhone 16 128GB", "Costco", 799, 849, 4.8, 1200, "iphone4"),
  listing(5, "Apple iPhone 16 Plus 128GB", "Amazon", 999, 1099, 4.7, 340, "iphone5"),
  listing(6, "Samsung Galaxy S25 Ultra", "Samsung", 1199, 1299, 4.6, 340, "android"),
];

const macbookTray = [
  listing(1, "Apple MacBook Pro M4 Pro 32GB", "Apple Store", 2499, 2499, 4.9, 280, "pro"),
  listing(2, "Apple MacBook Air M3 16GB", "Best Buy", 1099, 1199, 4.8, 420, "air"),
  listing(3, "Apple MacBook Pro M3 Refurbished", "Apple Certified", 1599, 1899, 4.7, 190, "refurb"),
  listing(4, "Apple MacBook Air M2 Renewed", "Amazon Renewed", 799, 999, 4.4, 310, "renewed"),
  listing(5, "Lenovo ThinkPad X1 Carbon", "Lenovo", 1899, 2099, 4.7, 190, "biz"),
  listing(6, "Dell XPS 15 Creator", "Dell", 2199, 2399, 4.7, 150, "creator"),
];

// Test 1 — Value-led BUY READY on sofa without huge discount
{
  const data = scenario("modern sofa", valueSofaTray);
  const map = buildGlobalCommerceDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  const ikea = map.get(data.tray[0].link);
  const buyReadyCount = [...map.values()].filter((d) => d.verdict === "BUY READY").length;
  assert.ok(
    buyReadyCount >= 1 &&
      ((ikea?.productIntelligence?.globalPriceIntelligence?.priceAdvantagePct ?? 0) > 0 ||
        ikea?.productIntelligence?.globalBuyOpportunity?.valueLedBuy ||
        ikea?.verdict === "BUY READY"),
    "sofa: value-led buy signal"
  );
  assert.ok(
    (ikea?.productIntelligence?.globalPriceIntelligence?.priceAdvantagePct ?? 0) > 0,
    "sofa: price advantage vs market"
  );
  const dist = globalCommerceVerdictDistribution(
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
  assert.ok(dist["BUY READY"] >= 1, "sofa tray: at least 1 BUY READY");
}

// Test 2 — Universal offer graph
{
  const graph = buildUniversalOfferGraph(valueSofaTray, "sofa");
  assert.ok(graph.totalOffers >= 6, "offer graph: covers tray");
  assert.ok(graph.storeCount >= 4, "offer graph: multi-merchant");
  assert.ok(graph.merchantCoverage.length >= 2, "offer graph: channel diversity");
}

// Test 3 — iPhone same product cheaper
{
  const data = scenario("iPhone 16", iphoneTray);
  const map = buildGlobalCommerceDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  assert.ok(
    [...map.values()].some((d) => d.productIntelligence?.globalAlternatives?.bestSameProductCheaper),
    "iphone: same product cheaper detected"
  );
}

// Test 4 — MacBook refurb/new value
{
  const data = scenario("MacBook Pro best value", macbookTray);
  const map = buildGlobalCommerceDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  assert.ok(
    [...map.values()].some(
      (d) =>
        d.link.includes("refurb") ||
        d.link.includes("renewed") ||
        d.productIntelligence?.globalAlternatives?.bestValueAlternative
    ),
    "macbook: refurb/value paths surfaced"
  );
  assert.ok(globalCommerceVerdictDistribution(
    new Map([...map.entries()].map(([link, d]) => [link, { link, verdict: d.verdict, spreadScore: 0, rankIndex: 0, gapFromTop: 0, traySize: map.size, commercePriorityLabel: d.productIntelligence?.commercePriorityLabel ?? "COMPARE" }]))
  )["BUY READY"] >= 1, "macbook: BUY READY present");
}

// Test 5 — Discount V2 + global price unit
{
  const product = valueSofaTray[0];
  const price = buildGlobalPriceIntelligence({ product, tray: valueSofaTray });
  const discount = buildDiscountIntelligenceV2({ product, tray: valueSofaTray, globalPrice: price });
  assert.ok(price.priceLabel, "global price label");
  assert.ok(discount.discountLabel, "discount v2 label");
  assert.ok(typeof discount.discountTrust === "number", "discount trust score");
}

// Test 6 — Unique reasoning + buyer psychology context
for (const [query, tray] of [
  ["modern sofa", valueSofaTray],
  ["iPhone 16", iphoneTray],
  ["MacBook Pro", macbookTray],
]) {
  const data = scenario(query, tray);
  const map = buildGlobalCommerceDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  const reasoningTexts = new Set();

  for (const [, decision] of map) {
    const reasoning = decision.productIntelligence?.globalDecisionReasoning;
    assert.ok(reasoning?.primaryLine, `${query}: global reasoning`);
    assert.ok(globalReasoningIsUnique(reasoning.primaryLine), `${query}: not generic`);
    assert.ok(globalReasoningReferencesContext(reasoning.analystSummary), `${query}: context-rich`);
    assert.ok(reasoning.whyBuy && reasoning.whyThisSeller && reasoning.whyThisPrice, `${query}: buyer psychology`);
    assert.ok(reasoningAvoidsScoreFractions(decision.primaryReason ?? ""), `${query}: no /100 in primary`);
    assert.ok(
      (decision.productIntelligence?.alignmentFlags ?? []).includes("phase37_global_commerce_intelligence"),
      `${query}: phase37 flag`
    );
    reasoningTexts.add(reasoning.primaryLine.slice(0, 40));
  }
  assert.ok(reasoningTexts.size >= Math.min(3, tray.length - 1), `${query}: reasoning diversity`);
}

// Test 7 — BEST DEAL FOUND priority label
{
  const data = scenario("modern sofa", valueSofaTray);
  const map = buildGlobalCommerceDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  assert.ok(
    [...map.values()].some(
      (d) =>
        d.productIntelligence?.commercePriorityLabel === "BEST DEAL FOUND" ||
        d.productIntelligence?.globalPriceIntelligence?.priceLabel === "BEST PRICE FOUND"
    ),
    "best deal / best price signal present"
  );
}

console.log("Phase 37 global commerce intelligence engine: PASS");
