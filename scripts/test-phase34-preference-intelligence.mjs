#!/usr/bin/env node
/**
 * Phase 34 — Preference Intelligence + Taste Engine + Buyer Identity validation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { buyerIdentityMatches, detectBuyerIdentity } from "../lib/intelligence/buyerIdentityEngine.ts";
import { reasoningIsAnalystGrade } from "../lib/intelligence/advancedCommerceReasoningEngine.ts";
import {
  detectTastePreferences,
  computeTasteMatchScore,
  listCategoryTasteProfiles,
} from "../lib/intelligence/tasteMatchEngine.ts";
import {
  buildPersonalizedDecisionScores,
  hasStrongScoreSeparation,
} from "../lib/intelligence/personalizedDecisionScoringEngine.ts";
import { preferenceMemoryHook } from "../lib/intelligence/preferenceMemoryHooks.ts";
import {
  isStricterVerdictDistribution,
  preferenceVerdictDistribution,
} from "../lib/ui/preferenceVerdictEngine.ts";
import { buildPreferenceIntelligenceDecisionMap } from "../lib/ui/phase34PreferenceIntelligenceActivation.ts";
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

function scenario(name, query, tray, trustFactory) {
  const brief = {
    headline: `${name} tray`,
    recommendation: { label: "Top pick", title: tray[0].title, store: tray[0].store, link: tray[0].link, price: tray[0].price },
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
  return { name, query, tray, coherenceMap, metaByLink, productsByLink };
}

assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/phase34PreferenceIntelligenceActivation.ts"), "utf8").includes(
    "buildPreferenceIntelligenceDecisionMap"
  )
);
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
assert.ok(listCategoryTasteProfiles().length >= 5, "category taste registry");
assert.equal(preferenceMemoryHook.loadMemory(), null, "memory hook stub returns null");

// Part 1 — Buyer identity
const devBuyer = detectBuyerIdentity("best laptop for AI development");
assert.ok(buyerIdentityMatches(devBuyer, ["developer", "power_user", "performance_focused"]), "developer identity");

const budgetSofa = detectBuyerIdentity("cheap sofa for small apartment");
assert.ok(buyerIdentityMatches(budgetSofa, ["budget_conscious", "space_constrained", "value_focused"]), "budget sofa identity");

const luxurySofa = detectBuyerIdentity("luxury modern sofa");
assert.ok(buyerIdentityMatches(luxurySofa, ["premium_buyer", "design_focused", "aesthetics_focused"]), "luxury sofa identity");

const photoIphone = detectBuyerIdentity("best iphone for photos");
assert.ok(buyerIdentityMatches(photoIphone, ["camera_focused", "content_creator"]), "camera iphone identity");

// Part 2 — Taste
const modernLuxurySofa = detectTastePreferences("modern luxury corner sofa", "sofas");
assert.ok(modernLuxurySofa.queryDimensions.includes("modern"), "modern taste detected");
assert.ok(modernLuxurySofa.queryDimensions.includes("luxury"), "luxury taste detected");

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

const laptopTray = [
  listing(1, "Apple MacBook Pro 14 M4 Pro 32GB AI Workstation", "Apple Store", 2499, 2499, 4.9, 280, "mac"),
  listing(2, "Apple MacBook Air 15 M3 16GB", "Best Buy", 1499, 1599, 4.8, 420, "mac"),
  listing(3, "Lenovo ThinkPad X1 Carbon Gen 12 32GB", "Lenovo", 1899, 2099, 4.7, 190, "laptop"),
  listing(4, "Dell XPS 14 Ultra 7 32GB Developer Edition", "Dell", 1799, 1999, 4.6, 150, "laptop"),
  listing(5, "ASUS ROG Zephyrus G14 RTX 4060 Gaming", "ASUS", 1599, 1799, 4.5, 310, "gaming"),
  listing(6, "HP Pavilion 15 i5 16GB Budget", "HP", 699, 799, 4.2, 890, "budget"),
  listing(7, "Acer Aspire 5 Ryzen 5 Student", "Acer", 549, 649, 4.1, 1200, "budget"),
  listing(8, "Microsoft Surface Laptop 7 Business", "Microsoft", 1299, 1399, 4.6, 95, "surface"),
  listing(9, "Refurb Dell Latitude 7420 16GB", "eBay Seller", 499, 899, 3.8, 12, "refurb"),
  listing(10, "No-name Laptop 4GB Celeron", "Unknown Shop", 299, 399, 3.2, 3, "junk"),
];

const sofaTray = Array.from({ length: 12 }, (_, i) =>
  listing(
    i + 1,
    `${i % 2 === 0 ? "Modern Luxury" : "Compact Corner"} Fabric Sofa ${i + 1}`,
    i % 3 === 0 ? "IKEA" : i % 3 === 1 ? "Wayfair" : "Bol.com",
    699 + i * 80,
    899 + i * 70,
    4.1 + (i % 5) * 0.1,
    40 + i * 12,
    "sofa"
  )
);

for (const [query, tray] of [
  ["best laptop for AI development", laptopTray],
  ["modern luxury corner sofa", sofaTray],
  ["best value laptop", laptopTray],
]) {
  const data = scenario(query, query, tray, trustFactory);
  const map = buildPreferenceIntelligenceDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);

  assert.ok(map.size === tray.length, `${query}: map size`);
  const spreadScores = [];

  for (const [, decision] of map) {
    const intel = decision.productIntelligence;
    assert.ok(intel?.buyerIdentity?.version === 1, `${query}: buyer identity`);
    assert.ok(typeof intel?.tasteMatchScore === "number", `${query}: tasteMatchScore`);
    assert.ok(intel?.personalizedDecisionScore?.spreadScore != null, `${query}: spreadScore`);
    assert.ok(intel?.advancedCommerceReasoning?.analystSummary, `${query}: analyst reasoning`);
    assert.ok(
      reasoningIsAnalystGrade(intel?.advancedCommerceReasoning?.analystSummary ?? ""),
      `${query}: analyst-grade reasoning`
    );
    assert.ok(isScoreFreeBriefLanguage(decision.primaryReason ?? ""), `${query}: score-free primary`);
    assert.ok(
      (intel?.alignmentFlags ?? []).includes("phase34_preference_intelligence"),
      `${query}: phase34 flag`
    );
    spreadScores.push(intel.personalizedDecisionScore);
  }

  assert.ok(hasStrongScoreSeparation(spreadScores), `${query}: score separation`);
}

// Taste match ranking — modern luxury sofa should favor modern/luxury titles
const sofaData = scenario("sofa", "modern luxury corner sofa", sofaTray, trustFactory);
const sofaMap = buildPreferenceIntelligenceDecisionMap(sofaData.coherenceMap, sofaData.metaByLink, sofaData.productsByLink);
const sortedSofa = [...sofaMap.entries()].sort(
  (a, b) =>
    (b[1].productIntelligence?.personalizedDecisionScore?.spreadScore ?? 0) -
    (a[1].productIntelligence?.personalizedDecisionScore?.spreadScore ?? 0)
);
const topSofaTitle = sofaData.tray.find((p) => p.link === sortedSofa[0]?.[0])?.title ?? "";
assert.ok(/modern|luxury|corner/i.test(topSofaTitle), "taste influences sofa ranking");

// Part 5 — Stricter verdict distribution on laptop tray
const laptopData = scenario("laptop", "best laptop for AI development", laptopTray, trustFactory);
const laptopMap = buildPreferenceIntelligenceDecisionMap(
  laptopData.coherenceMap,
  laptopData.metaByLink,
  laptopData.productsByLink
);
const verdictRows = new Map(
  [...laptopMap.entries()].map(([link, decision]) => [
    link,
    {
      link,
      verdict: decision.verdict,
      spreadScore: decision.productIntelligence?.spreadScore ?? 0,
      rankIndex: 0,
      gapFromTop: 0,
      traySize: laptopTray.length,
    },
  ])
);
const dist = preferenceVerdictDistribution(verdictRows);
console.log("Laptop verdict distribution:", dist);
console.log(
  "Spread scores:",
  [...laptopMap.values()]
    .map((d) => d.productIntelligence?.spreadScore)
    .sort((a, b) => b - a)
);
assert.ok(dist["BUY READY"] >= 1, "at least one BUY READY");
assert.ok(dist.AVOID >= 1, "at least one AVOID");
assert.ok(isStricterVerdictDistribution(verdictRows), "stricter distribution");

console.log("Phase 34 preference intelligence: PASS");
