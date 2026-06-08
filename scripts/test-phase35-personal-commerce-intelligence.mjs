#!/usr/bin/env node
/**
 * Phase 35 — Personal Commerce Intelligence validation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { buyerReasoningIsAnalystGrade } from "../lib/intelligence/buyerReasoningEngine.ts";
import { inferPersonalBuyerIdentity, personalBuyerMatches } from "../lib/intelligence/personalBuyerIdentityEngine.ts";
import {
  capturePreferenceSignal,
  inferPreferenceProfile,
  updatePreferenceVector,
} from "../lib/intelligence/preferenceMemoryLayer.ts";
import {
  CONFIDENCE_BANDS,
  hasExpandedConfidenceSpread,
} from "../lib/intelligence/personalCommerceScoreEngine.ts";
import { inferPersonalTasteProfile } from "../lib/intelligence/personalTasteIntelligenceEngine.ts";
import { buildPersonalCommerceDecisionMap } from "../lib/ui/phase35PersonalCommerceActivation.ts";
import { personalCommerceBriefLines } from "../lib/ui/personalCommerceBriefEnrichment.ts";
import { isScoreFreeBriefLanguage } from "../lib/ui/decisionBriefAuthorityEngine.ts";

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
        trayAssessments: tray.map((product, index) => trustFactory(product, index)),
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

function topLink(map) {
  const sorted = [...map.entries()].sort(
    (a, b) =>
      (b[1].productIntelligence?.personalCommerceScore?.personalCommerceScore ?? 0) -
      (a[1].productIntelligence?.personalCommerceScore?.personalCommerceScore ?? 0)
  );
  return sorted[0]?.[0] ?? null;
}

assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/phase35PersonalCommerceActivation.ts"), "utf8").includes(
    "buildPersonalCommerceDecisionMap"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
    "buildCommerceIntelligenceCoreDecisionMap"
  )
);

// Part 1 — Buyer identity examples
assert.ok(personalBuyerMatches(inferPersonalBuyerIdentity("best laptop for work"), ["Professional Buyer"]));
assert.ok(personalBuyerMatches(inferPersonalBuyerIdentity("cheap sofa"), ["Budget Buyer"]));
assert.ok(personalBuyerMatches(inferPersonalBuyerIdentity("best camera phone"), ["Creator"]));
assert.ok(personalBuyerMatches(inferPersonalBuyerIdentity("luxury modern couch"), ["Luxury Buyer"]));

// Part 7 — Memory layer stubs
const profile = inferPreferenceProfile([]);
assert.equal(profile.signalCount, 0);
capturePreferenceSignal({ kind: "query", query: "modern sofa", taste: "Modern" });
const updated = updatePreferenceVector(profile.vector, { kind: "click", query: "modern sofa", taste: "Modern" });
assert.ok(updated.styleAxes.Modern > 0);

const laptopTray = [
  listing(1, "Apple MacBook Pro M4 Pro 32GB Workstation", "Apple Store", 2499, 2499, 4.9, 280, "pro"),
  listing(2, "Apple MacBook Air M3 16GB Student Light", "Best Buy", 1099, 1199, 4.8, 420, "air"),
  listing(3, "Lenovo ThinkPad X1 Carbon Business", "Lenovo", 1899, 2099, 4.7, 190, "biz"),
  listing(4, "ASUS ROG Zephyrus G14 RTX 4060 Gaming", "ASUS", 1599, 1799, 4.5, 310, "gaming"),
  listing(5, "HP Pavilion 15 Budget Laptop", "HP", 599, 699, 4.2, 890, "budget"),
  listing(6, "Acer Aspire 5 Student Edition", "Acer", 499, 599, 4.1, 1200, "student"),
  listing(7, "Dell XPS 15 OLED Creator Edition", "Dell", 2199, 2399, 4.7, 150, "creator"),
  listing(8, "Refurb Unknown Celeron 4GB", "Unknown Shop", 299, 399, 3.2, 3, "junk"),
];

const sofaTray = [
  listing(1, "Modern Minimalist Corner Sofa Grey", "IKEA", 799, 899, 4.5, 120, "modern"),
  listing(2, "Luxury Leather Designer Sofa Black", "Wayfair", 1899, 2199, 4.7, 45, "luxury"),
  listing(3, "Budget Fabric 2 Seater Sofa", "Bol.com", 399, 499, 4.0, 200, "budget"),
  listing(4, "Family Sectional Modular Sofa", "Leen Bakker", 999, 1199, 4.4, 88, "family"),
  listing(5, "Compact Apartment Sofa Bed", "Amazon", 549, 649, 4.2, 310, "compact"),
  listing(6, "Scandinavian Oak Frame Sofa", "Made.com", 1299, 1399, 4.6, 62, "scandi"),
];

const phoneTray = [
  listing(1, "Apple iPhone 17 Pro Max 256GB", "Apple Store", 1299, 1299, 4.9, 520, "iphone"),
  listing(2, "Apple iPhone 17 Pro Camera Edition", "Best Buy", 1099, 1199, 4.8, 410, "iphone"),
  listing(3, "Samsung Galaxy S25 Ultra Business", "Samsung", 1199, 1299, 4.6, 340, "android"),
  listing(4, "Google Pixel 10 Pro Photography", "Google Store", 999, 1099, 4.7, 180, "pixel"),
  listing(5, "Budget Android Phone 64GB", "Amazon", 249, 299, 3.9, 890, "budget"),
  listing(6, "iPhone SE Business Reliable", "Costco", 499, 549, 4.5, 1200, "se"),
];

const rankingByQuery = new Map();

for (const query of [
  "best laptop",
  "best value laptop",
  "best laptop for work",
  "best laptop for programming",
  "best luxury laptop",
  "cheap sofa",
  "modern sofa",
  "luxury sofa",
  "best iphone",
  "best camera phone",
  "best phone for business",
]) {
  const tray = query.includes("sofa") || query.includes("couch") ? sofaTray : query.includes("phone") || query.includes("iphone") ? phoneTray : laptopTray;
  const data = scenario(query, tray);
  const map = buildPersonalCommerceDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);

  assert.ok(map.size === tray.length, `${query}: map size`);

  const confidences = [];
  for (const [, decision] of map) {
    const intel = decision.productIntelligence;
    assert.ok(intel?.personalBuyerIdentity?.buyerIdentity, `${query}: buyerIdentity`);
    assert.ok(intel?.personalBuyerIdentity?.buyerConfidence != null, `${query}: buyerConfidence`);
    assert.ok(intel?.personalCommerceScore?.personalCommerceScore != null, `${query}: personalCommerceScore`);
    assert.ok(intel?.buyerReasoning?.primaryLine, `${query}: buyer reasoning`);
    assert.ok(buyerReasoningIsAnalystGrade(intel.buyerReasoning.primaryLine), `${query}: analyst grade`);
    assert.ok(isScoreFreeBriefLanguage(decision.primaryReason ?? ""), `${query}: score-free primary`);
    assert.ok((intel.alignmentFlags ?? []).includes("phase35_personal_commerce_intelligence"), `${query}: flag`);
    confidences.push(intel.personalCommerceScore);
  }

  assert.ok(hasExpandedConfidenceSpread(confidences), `${query}: confidence spread`);
  assert.ok(CONFIDENCE_BANDS.includes(confidences[0]?.expandedConfidence ?? 0), `${query}: top confidence band`);

  const taste = inferPersonalTasteProfile(query, intelSegment(map));
  const briefLines = personalCommerceBriefLines({
    detectedBuyer: map.values().next().value?.productIntelligence?.personalBuyerIdentity?.buyerIdentity ?? "Casual Buyer",
    detectedTaste: taste.detectedTaste,
    buyerMatchPct: map.values().next().value?.productIntelligence?.buyerMatchPct ?? 50,
    tasteMatchPct: map.values().next().value?.productIntelligence?.tasteMatchPct ?? 50,
  });
  assert.ok(briefLines.some((line) => line.startsWith("Detected Buyer:")), `${query}: brief enrichment`);

  rankingByQuery.set(query, topLink(map));
}

function intelSegment(map) {
  return map.values().next().value?.productIntelligence?.segment ?? null;
}

// Part 9 — Same tray, different rankings by buyer/taste query
assert.notEqual(rankingByQuery.get("best value laptop"), rankingByQuery.get("best luxury laptop"), "value vs luxury laptop ranking differs");
assert.notEqual(rankingByQuery.get("cheap sofa"), rankingByQuery.get("luxury sofa"), "cheap vs luxury sofa ranking differs");
assert.notEqual(rankingByQuery.get("best camera phone"), rankingByQuery.get("best phone for business"), "camera vs business phone ranking differs");

console.log("Phase 35 personal commerce intelligence: PASS");
console.log("Sample rankings:", Object.fromEntries([...rankingByQuery.entries()].slice(0, 6)));
