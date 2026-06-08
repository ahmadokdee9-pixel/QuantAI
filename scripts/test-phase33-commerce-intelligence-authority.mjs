#!/usr/bin/env node
/**
 * Phase 33 — Commerce Intelligence Authority validation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { detectIntentProfile, intentDetectionMatches } from "../lib/intelligence/intentUnderstandingEngine.ts";
import {
  enrichProductImageReliability,
  trayImageCoverage,
} from "../lib/intelligence/imageReliabilityEngine.ts";
import { resolveCategoryProfileKey } from "../lib/intelligence/categoryProfileRegistry.ts";
import {
  commerceReasoningReferencesMarket,
  computeMarketOpportunityScore,
} from "../lib/intelligence/commerceIntelligenceAuthorityEngine.ts";
import { trayVerdictDistribution } from "../lib/ui/marketOpportunityBalancingEngine.ts";
import { buildCommerceIntelligenceDecisionMap } from "../lib/ui/phase33CommerceIntelligenceActivation.ts";
import { isScoreFreeBriefLanguage } from "../lib/ui/decisionBriefAuthorityEngine.ts";

const base = {
  extensions: [],
  availability: "In stock",
  shipping: "Free delivery",
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
    image: image ?? "https://images.example.com/product.jpg",
  };
}

function scenario(name, query, tray, trustFactory) {
  const brief = {
    headline: `${name} tray`,
    recommendation: {
      label: "Top pick",
      title: tray[0].title,
      store: tray[0].store,
      link: tray[0].link,
      price: tray[0].price,
    },
    why: [],
    alternatives: [],
    discountNote: null,
    confidence: 0.84,
    sparseTrayWarning: null,
    explanation: `${name} institutional brief.`,
    buyReasoning: "Lead listing clears analyst checks.",
    riskSignals: [],
  };

  const trayCtx = buildTrayCoherenceContext({
    searchMeta: {
      verdictIntelligence: {
        version: "phase10-v1",
        verdict: "BUY READY",
        confidence: 0.86,
        rationale: `${name} lead rationale.`,
        strengths: [],
        warnings: [],
        factorTrace: {},
      },
      phase93TrustDiscount: {
        version: "phase93-v1",
        trayAssessments: tray.map((product, index) => trustFactory(product, index)),
      },
    },
    decisionBrief: brief,
  });

  const coherenceMap = new Map(
    tray.map((product, rank) => [
      product.link,
      activateProductDecisionCoherence({
        product,
        list: tray,
        rank,
        tray: trayCtx,
        searchQuery: query,
      }),
    ])
  );

  const metaByLink = new Map(
    tray.map((product, rank) => [
      product.link,
      {
        price: product.price,
        rank,
        rating: product.rating,
        reviewsCount: product.reviewsCount,
        store: product.store,
      },
    ])
  );

  const productsByLink = new Map(
    tray.map((product) => [product.link, { product, searchQuery: query }])
  );

  return { name, query, tray, coherenceMap, metaByLink, productsByLink };
}

assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/phase33CommerceIntelligenceActivation.ts"), "utf8").includes(
    "buildCommerceIntelligenceDecisionMap"
  ),
  "phase 33 activation present"
);
assert.ok(
  readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
    "buildCommerceIntelligenceCoreDecisionMap"
  ),
  "ProductResultsSurface wired to phase 33"
);

// Part 1 — Image reliability
const imageTray = [
  listing(1, "iPhone 17 Pro 256GB", "Apple Store", 1199, 1199, 4.8, 420, "iphone"),
  listing(2, "iPhone 17 128GB", "Best Buy", 999, 1099, 4.7, 310, "iphone"),
  listing(3, "iPhone 16 Pro", "Amazon", 1099, 1199, 4.6, 890, "iphone", ""),
  listing(4, "Galaxy S25 Ultra", "Samsung", 1299, 1299, 4.5, 220, "phone"),
];
const enrichedImages = imageTray.map(enrichProductImageReliability);
const coverage = trayImageCoverage(enrichedImages);
assert.ok(coverage.coverage >= 0.98, `image coverage ${(coverage.coverage * 100).toFixed(1)}% >= 98%`);
assert.ok(enrichedImages.every((p) => typeof p.image_confidence === "number"), "image_confidence on all rows");

// Part 3 — Intent understanding
const cheapSofa = detectIntentProfile("cheap sofa");
assert.ok(intentDetectionMatches(cheapSofa, ["budget", "value", "family"]), "cheap sofa intent");
const gamingLaptop = detectIntentProfile("gaming laptop");
assert.ok(intentDetectionMatches(gamingLaptop, ["gaming", "performance"]), "gaming laptop intent");
const bestIphone = detectIntentProfile("best iphone");
assert.ok(intentDetectionMatches(bestIphone, ["quality", "ecosystem", "premium"]), "best iphone intent");

// Scenarios
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

const iphoneTray = [
  listing(1, "Apple iPhone 17 Pro Max 256GB", "Apple Store", 1299, 1299, 4.9, 520, "iphone"),
  listing(2, "Apple iPhone 17 Pro 128GB", "Best Buy", 1099, 1199, 4.8, 410, "iphone"),
  listing(3, "Apple iPhone 17 128GB", "Amazon", 899, 999, 4.7, 890, "iphone"),
  listing(4, "Apple iPhone 16 Pro 256GB", "Costco", 999, 1099, 4.8, 1200, "iphone"),
  listing(5, "Samsung Galaxy S25 Ultra", "Samsung", 1199, 1299, 4.6, 340, "phone"),
  listing(6, "Google Pixel 10 Pro", "Google Store", 999, 1099, 4.7, 180, "phone"),
];

const laptopTray = [
  listing(1, "Apple MacBook Pro 14 M4 Pro 24GB", "Apple Store", 2499, 2499, 4.9, 280, "mac"),
  listing(2, "Apple MacBook Air 15 M3 16GB", "Best Buy", 1499, 1599, 4.8, 420, "mac"),
  listing(3, "Lenovo ThinkPad X1 Carbon Gen 12", "Lenovo", 1899, 2099, 4.7, 190, "laptop"),
  listing(4, "Dell XPS 14 Ultra 7 32GB", "Dell", 1799, 1999, 4.6, 150, "laptop"),
  listing(5, "ASUS ROG Zephyrus G14 RTX 4060", "ASUS", 1599, 1799, 4.5, 310, "gaming"),
  listing(6, "HP Pavilion 15 i5 16GB", "HP", 699, 799, 4.2, 890, "budget"),
  listing(7, "Acer Aspire 5 Ryzen 5", "Acer", 549, 649, 4.1, 1200, "budget"),
  listing(8, "Microsoft Surface Laptop 7", "Microsoft", 1299, 1399, 4.6, 95, "surface"),
];

const sofaTray = Array.from({ length: 12 }, (_, i) =>
  listing(
    i + 1,
    `Modern ${i % 2 === 0 ? "Sectional" : "Corner"} Sofa Fabric ${i + 1}`,
    i % 3 === 0 ? "IKEA" : i % 3 === 1 ? "Wayfair" : "Bol.com",
    699 + i * 80,
    899 + i * 70,
    4.1 + (i % 5) * 0.1,
    40 + i * 12,
    "sofa"
  )
);

for (const [query, tray] of [
  ["iphone 17", iphoneTray],
  ["apple laptop", laptopTray],
  ["hoekbank", sofaTray],
]) {
  const data = scenario(query, query, tray, trustFactory);
  const map = buildCommerceIntelligenceDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );

  assert.ok(map.size === tray.length, `${query}: decision map size`);
  for (const [, decision] of map) {
    const intel = decision.productIntelligence;
    assert.ok(intel?.marketOpportunityScore != null, `${query}: marketOpportunityScore`);
    assert.ok(intel?.marketValueScore != null, `${query}: marketValueScore`);
    assert.ok(intel?.merchantTrustScore != null, `${query}: merchantTrustScore`);
    assert.ok(intel?.intentProfile?.version === 1, `${query}: intentProfile`);
    assert.ok(intel?.commerceReasoning?.whyWon, `${query}: commerce reasoning whyWon`);
    assert.ok(
      commerceReasoningReferencesMarket(
        `${decision.decisionThesis ?? ""} ${decision.primaryReason ?? ""} ${intel?.commerceReasoning?.competitorEdge ?? ""}`
      ),
      `${query}: market-aware reasoning`
    );
    assert.ok(isScoreFreeBriefLanguage(decision.primaryReason ?? ""), `${query}: score-free primary`);
    assert.ok(
      (intel?.alignmentFlags ?? []).includes("phase33_commerce_intelligence_authority"),
      `${query}: phase33 flag`
    );
  }

  const profileKey = resolveCategoryProfileKey(
    map.values().next().value?.productIntelligence?.segment ?? null,
    tray[0].title,
    query
  );
  if (query.includes("iphone")) assert.equal(profileKey, "phones");
  if (query.includes("laptop")) assert.equal(profileKey, "laptops");
  if (query.includes("hoekbank")) assert.equal(profileKey, "sofas");
}

// Part 7 — Verdict diversity on sofa tray (12 items)
const sofaData = scenario("sofa", "hoekbank", sofaTray, trustFactory);
const sofaMap = buildCommerceIntelligenceDecisionMap(
  sofaData.coherenceMap,
  sofaData.metaByLink,
  sofaData.productsByLink
);
const authorityRows = new Map(
  [...sofaMap.entries()].map(([link, decision]) => [
    link,
    {
      link,
      verdict: decision.verdict,
      rankIndex: 0,
      rankScore: decision.productIntelligence?.marketOpportunityScore ?? 0,
      gapFromTop: 0,
      traySize: sofaTray.length,
      marketRole: "balanced",
    },
  ])
);
const distribution = trayVerdictDistribution(authorityRows);
console.log("Sofa verdict distribution:", distribution);
assert.ok(distribution["BUY READY"] >= 1, "at least one BUY READY");
assert.ok(distribution.COMPARE >= 1, "at least one COMPARE");
assert.ok(distribution.WAIT >= 1, "at least one WAIT");

// Market opportunity score sanity
const sampleDecision = sofaMap.values().next().value;
const opp = computeMarketOpportunityScore({
  intelligence: sampleDecision.productIntelligence,
  marketValueScore: sampleDecision.productIntelligence.marketValueScore,
  merchantTrustScore: sampleDecision.productIntelligence.merchantTrustScore,
  availabilityScore: 80,
  competitorPressure: 40,
  offerUniqueness: 55,
  intentAlignment: 60,
  priceAdvantage: 0.1,
});
assert.ok(opp >= 0 && opp <= 100, "marketOpportunityScore in range");

console.log("Phase 33 commerce intelligence authority: PASS");
console.log(`Image coverage: ${(coverage.coverage * 100).toFixed(1)}% (${coverage.showable}/${coverage.total})`);
console.log("Intent samples:", {
  cheapSofa: cheapSofa.dominantAxes,
  gamingLaptop: gamingLaptop.dominantAxes,
  bestIphone: bestIphone.dominantAxes,
});
