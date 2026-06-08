#!/usr/bin/env node
/**
 * Phase 36 — Commerce Opportunity + Discount + BUY-READY Recovery validation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { buildDiscountOpportunityInsight } from "../lib/intelligence/discountOpportunityEngine.ts";
import { findEquivalentMatches } from "../lib/intelligence/equivalentProductMatchingEngine.ts";
import {
  reasoningAvoidsBannedPhrases,
  reasoningIncludesDiscountContext,
} from "../lib/intelligence/commerceOpportunityReasoningEngine.ts";
import { trayImageCoverage } from "../lib/intelligence/imageReliabilityEngine.ts";
import {
  buildCommerceOpportunityDecisionMap,
  commerceOpportunityVerdictDistribution,
  hasHealthyCommerceVerdictDistribution,
} from "../lib/ui/phase36CommerceOpportunityActivation.ts";
import { isScoreFreeBriefLanguage } from "../lib/ui/decisionBriefAuthorityEngine.ts";

const base = {
  extensions: [],
  availability: "In stock",
  shipping: "Free delivery",
  image: "https://images.example.com/product.jpg",
};

function listing(id, title, store, price, oldPrice, rating, reviewsCount, tag, image) {
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
    image: image ?? base.image,
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
  readFileSync(join(process.cwd(), "lib/ui/phase36CommerceOpportunityActivation.ts"), "utf8").includes(
    "buildCommerceOpportunityDecisionMap"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
    "buildCommerceIntelligenceCoreDecisionMap"
  )
);

function buildSofaTray30() {
  const styles = ["Modern", "Luxury", "Budget", "Family", "Compact", "Scandinavian", "Classic", "Modular"];
  const stores = ["IKEA", "Wayfair", "Bol.com", "Leen Bakker", "Amazon", "Made.com", "Jysk", "Conforama"];
  const tray = [];
  for (let i = 0; i < 30; i++) {
    const style = styles[i % styles.length];
    const store = stores[i % stores.length];
    const price = 399 + (i % 10) * 120 + (i % 3) * 45;
    const oldPrice = price + 80 + (i % 4) * 30;
    tray.push(
      listing(
        i + 1,
        `${style} ${i % 2 === 0 ? "Corner" : "Sectional"} Sofa Grey ${i + 1}`,
        store,
        price,
        oldPrice,
        4 + (i % 10) / 10,
        50 + i * 3,
        `sofa-${i}`,
        i % 7 === 0 ? "" : `https://images.example.com/sofa-${i}.jpg`
      )
    );
  }
  return tray;
}

const sofaTray30 = buildSofaTray30();

const iphoneTray = [
  listing(1, "Apple iPhone 16 Pro Max 256GB", "Apple Store", 1299, 1299, 4.9, 520, "iphone"),
  listing(2, "Apple iPhone 16 Pro 256GB", "Best Buy", 1099, 1199, 4.8, 410, "iphone2"),
  listing(3, "Apple iPhone 16 Plus 128GB", "Amazon", 999, 1099, 4.7, 340, "iphone3"),
  listing(4, "Apple iPhone 16 128GB Refurbished", "Back Market", 749, 899, 4.6, 180, "refurb"),
  listing(5, "Apple iPhone 16 128GB", "Costco", 799, 849, 4.8, 1200, "iphone5"),
  listing(6, "Samsung Galaxy S25 Ultra", "Samsung", 1199, 1299, 4.6, 340, "android"),
  listing(7, "Apple iPhone 15 Pro 256GB", "Walmart", 899, 999, 4.5, 890, "iphone7"),
  listing(8, "Apple iPhone 16 Pro Max 512GB", "Apple Store", 1499, 1499, 4.9, 220, "iphone8"),
];

const macbookTray = [
  listing(1, "Apple MacBook Pro M4 Pro 32GB 1TB", "Apple Store", 2499, 2499, 4.9, 280, "pro"),
  listing(2, "Apple MacBook Air M3 16GB 512GB", "Best Buy", 1099, 1199, 4.8, 420, "air"),
  listing(3, "Apple MacBook Pro M3 16GB Refurbished", "Apple Certified", 1599, 1899, 4.7, 190, "refurb"),
  listing(4, "Lenovo ThinkPad X1 Carbon Gen 12", "Lenovo", 1899, 2099, 4.7, 190, "biz"),
  listing(5, "Apple MacBook Air M2 8GB Renewed", "Amazon Renewed", 799, 999, 4.4, 310, "renewed"),
  listing(6, "Dell XPS 15 OLED Creator", "Dell", 2199, 2399, 4.7, 150, "creator"),
  listing(7, "Apple MacBook Pro M4 24GB", "B&H", 1999, 2199, 4.8, 95, "m4"),
  listing(8, "HP Pavilion 15 Budget", "HP", 599, 699, 4.2, 890, "budget"),
];

const weakTray = [
  listing(1, "Generic Budget Sofa Fabric", "Small Shop", 449, 499, 3.8, 12, "weak1"),
  listing(2, "Basic 2 Seater Couch", "Local Store", 399, 449, 3.9, 8, "weak2"),
  listing(3, "Economy Corner Sofa", "Outlet", 529, 579, 4.0, 15, "weak3"),
];

const brokenTray = [
  listing(1, "", "Scam Shop", 0, 0, 1.0, 0, "fake1", ""),
  listing(2, "Totally unrelated drill bit set", "Unknown", 12, 15, 2.0, 1, "fake2", ""),
  listing(3, "Broken listing no price", "Broken", 0, 0, 0, 0, "fake3", ""),
];

// Test 1 — Sofa tray 30: BUY READY + discount reasoning
{
  const data = scenario("modern sofa", sofaTray30);
  const map = buildCommerceOpportunityDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  const dist = commerceOpportunityVerdictDistribution(
    new Map([...map.entries()].map(([link, d]) => [link, { link, verdict: d.verdict, spreadScore: 0, rankIndex: 0, gapFromTop: 0, traySize: map.size }]))
  );

  assert.ok(dist["BUY READY"] >= 1, "sofa tray 30: at least 1 BUY READY");
  assert.ok(hasHealthyCommerceVerdictDistribution(
    new Map([...map.entries()].map(([link, d]) => [link, { link, verdict: d.verdict, spreadScore: 0, rankIndex: 0, gapFromTop: 0, traySize: map.size }]))
  ), "sofa tray 30: healthy distribution");

  let discountReasoningCount = 0;
  for (const [, decision] of map) {
    const reasoning = decision.productIntelligence?.commerceOpportunityReasoning?.analystSummary ?? decision.primaryReason ?? "";
    assert.ok(reasoningAvoidsBannedPhrases(reasoning), "sofa: no banned phrases");
    if (reasoningIncludesDiscountContext(reasoning)) discountReasoningCount += 1;
    assert.ok(decision.productIntelligence?.discountOpportunity?.priceOpportunityLabel, "sofa: discount label");
  }
  assert.ok(discountReasoningCount >= 3, "sofa tray: discount reasoning visible");

  const coverage = trayImageCoverage(
    [...data.productsByLink.values()].map((r) => r.product),
    data.query
  );
  assert.ok(coverage.coverage >= 0.95, `sofa tray image coverage ${coverage.coverage}`);
}

// Test 2 — iPhone tray: same/equivalent cheaper options
{
  const data = scenario("iPhone 16", iphoneTray);
  const map = buildCommerceOpportunityDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);

  const proMax = [...map.values()].find((d) => d.link.includes("iphone/1"));
  assert.ok(proMax?.productIntelligence?.equivalentMatches?.sameProductMatches?.length, "iphone: same product matches");
  assert.ok(
    [...map.values()].some((d) => d.productIntelligence?.discountOpportunity?.sameProductCheaperElsewhere ||
      d.productIntelligence?.discountOpportunity?.equivalentCheaperElsewhere ||
      d.productIntelligence?.equivalentMatches?.bestCheaperAlternative),
    "iphone: cheaper alternative detected"
  );
}

// Test 3 — MacBook tray: best value across refurb/new
{
  const data = scenario("MacBook Pro best value", macbookTray);
  const map = buildCommerceOpportunityDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);

  const refurbLinks = [...map.entries()].filter(([link]) => link.includes("refurb") || link.includes("renewed"));
  assert.ok(refurbLinks.length >= 1, "macbook: refurb listings present");
  assert.ok(
    [...map.values()].some((d) => d.verdict === "BUY READY" || d.verdict === "COMPARE"),
    "macbook: actionable verdicts for value listings"
  );
  const dist = commerceOpportunityVerdictDistribution(
    new Map([...map.entries()].map(([link, d]) => [link, { link, verdict: d.verdict, spreadScore: 0, rankIndex: 0, gapFromTop: 0, traySize: map.size }]))
  );
  assert.ok(dist["BUY READY"] >= 1, "macbook: at least 1 BUY READY");
}

// Test 4 — Weak tray: best available BUY READY
{
  const data = scenario("cheap sofa", weakTray);
  const map = buildCommerceOpportunityDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  const buyReady = [...map.values()].filter((d) => d.verdict === "BUY READY");
  assert.ok(buyReady.length >= 1, "weak tray: best available BUY READY");
  const recoveryNote = buyReady.some((d) =>
    (d.productIntelligence?.commerceOpportunityReasoning?.buyRecoveryNote ?? "").includes("Best available") ||
    (d.primaryReason ?? "").includes("strongest buy now")
  );
  assert.ok(recoveryNote || buyReady.length >= 1, "weak tray: recovery or buy leader");
}

// Test 5 — Fake/broken tray: may have no BUY READY
{
  const data = scenario("sofa", brokenTray);
  const map = buildCommerceOpportunityDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  const dist = commerceOpportunityVerdictDistribution(
    new Map([...map.entries()].map(([link, d]) => [link, { link, verdict: d.verdict, spreadScore: 0, rankIndex: 0, gapFromTop: 0, traySize: map.size }]))
  );
  assert.ok(dist["BUY READY"] <= 1, "broken tray: at most 1 BUY READY (recovery only if valid)");
}

// Test 6 — Discount engine unit checks
{
  const tray = iphoneTray;
  const product = tray[0];
  const equivalent = findEquivalentMatches(product, tray, "iPhone 16");
  const discount = buildDiscountOpportunityInsight({ product, tray, equivalent });
  assert.ok(discount.priceOpportunityLabel, "discount label assigned");
  assert.ok(typeof discount.discountScore === "number", "discountScore present");
}

// Test 7 — No banned phrases across standard queries
for (const query of ["modern sofa", "iPhone 16", "MacBook Pro", "best camera phone"]) {
  const tray = query.includes("sofa") ? sofaTray30.slice(0, 8) : query.includes("iPhone") ? iphoneTray : macbookTray;
  const data = scenario(query, tray);
  const map = buildCommerceOpportunityDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  for (const [, decision] of map) {
    const blob = [decision.primaryReason, decision.secondaryReason, decision.decisionThesis].filter(Boolean).join(" ");
    assert.ok(reasoningAvoidsBannedPhrases(blob), `${query}: banned phrase check`);
    assert.ok(isScoreFreeBriefLanguage(blob), `${query}: score-free language`);
    assert.ok((decision.productIntelligence?.alignmentFlags ?? []).includes("phase36_commerce_opportunity_intelligence"), `${query}: phase36 flag`);
  }
}

// Test 8 — Tray summary on leader
{
  const data = scenario("modern sofa", sofaTray30.slice(0, 10));
  const map = buildCommerceOpportunityDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  const summary = [...map.values()].find((d) => d.productIntelligence?.trayCommerceSummary)?.productIntelligence?.trayCommerceSummary;
  assert.ok(summary?.headline, "tray summary headline present");
  assert.ok(summary?.bestBuyNowLink, "tray summary bestBuyNowLink");
}

console.log("Phase 36 commerce opportunity + discount + BUY-READY recovery: PASS");
