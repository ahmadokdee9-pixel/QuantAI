#!/usr/bin/env node
/**
 * Phase 29 — Buy Opportunity Engine validation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import {
  buildDisplayCoherenceByLink,
  resolveUnifiedTrayVerdictFromUniversal,
} from "../lib/ui/phase274PresentationActivation.ts";
import { buildUniversalProductIntelligenceMap } from "../lib/ui/phase28ProductIntelligenceActivation.ts";
import { buildBuyOpportunityDecisionMap } from "../lib/ui/phase29BuyOpportunityActivation.ts";
import {
  computeBuyOpportunityScore,
  verdictDistribution,
  verdictShare,
} from "../lib/ui/buyOpportunityEngine.ts";
import { isPriceDominatedReason } from "../lib/ui/universalProductIntelligenceEngine.ts";
import { overlayCoherentWithUniversal } from "../lib/ui/universalProductDecision.ts";
import { trayVerdictMatchesCardMajority } from "../lib/ui/unifiedVerdictAuthority.ts";

const base = {
  extensions: [],
  image: "",
  availability: "In stock",
  shipping: "Free delivery",
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
  readFileSync(join(process.cwd(), "lib/ui/buyOpportunityEngine.ts"), "utf8").includes(
    "computeBuyOpportunityScore"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/phase29BuyOpportunityActivation.ts"), "utf8").includes(
    "buildBuyOpportunityDecisionMap"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
    "buildAlignedDecisionMap"
  )
);

function validateScenario(data) {
  const before = buildUniversalProductIntelligenceMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  const after = buildBuyOpportunityDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  const display = buildDisplayCoherenceByLink(data.coherenceMap, after);
  const trayVerdict = resolveUnifiedTrayVerdictFromUniversal(display);

  const beforeRows = [...before.values()];
  const afterRows = [...after.values()];
  const beforeDist = verdictDistribution(beforeRows);
  const afterDist = verdictDistribution(afterRows);
  const n = afterRows.length;

  for (const row of afterRows) {
    const intel = row.productIntelligence;
    assert.ok(intel, `${data.name}: productIntelligence exists`);
    assert.ok(Number.isFinite(intel.buyOpportunityScore), `${data.name}: buyOpportunityScore computed`);

    const expectedScore = computeBuyOpportunityScore(intel);
    assert.equal(intel.buyOpportunityScore, expectedScore, `${data.name}: score formula`);

    if (row.verdict === "BUY READY") {
      assert.ok(intel.buyEligible, `${data.name}: BUY rows must be buy-eligible`);
      assert.ok(!isPriceDominatedReason(row.reasonLine), `${data.name}: BUY reason is product-led`);
      assert.ok(
        row.reasonLine.toLowerCase().includes("buy opportunity") ||
          row.reasonLine.toLowerCase().includes("justify") ||
          row.reasonLine.toLowerCase().includes("strong value") ||
          row.reasonLine.toLowerCase().includes("limited competitive pressure"),
        `${data.name}: BUY opportunity language present`
      );
    }
  }

  if (afterRows.length >= 4) {
    assert.ok(
      trayVerdictMatchesCardMajority([...display.values()], trayVerdict.verdict),
      `${data.name}: tray matches card majority`
    );
  }

  for (const [link, coherent] of data.coherenceMap) {
    const universal = after.get(link);
    const overlay = overlayCoherentWithUniversal(coherent, universal);
    assert.equal(overlay.verdict, universal.verdict, `${data.name}: unified verdict object`);
  }

  return {
    name: data.name,
    before: beforeDist,
    after: afterDist,
    shares: {
      buy: verdictShare(afterDist, "BUY READY", n),
      compare: verdictShare(afterDist, "COMPARE", n),
      wait: verdictShare(afterDist, "WAIT", n),
      avoid: verdictShare(afterDist, "AVOID", n),
    },
    buyCountDelta: afterDist["BUY READY"] - beforeDist["BUY READY"],
  };
}

const iphone = scenario(
  "iPhone",
  "iphone 15 pro max 256gb best deal",
  [
    listing(1, "Apple iPhone 15 Pro Max 256GB Titanium", "Coolblue", 1199, 1299, 4.8, 3200, "iphone"),
    listing(2, "iPhone 15 Pro Max 256GB Natural Titanium", "MediaMarkt", 1229, 1299, 4.7, 2100, "iphone"),
    listing(3, "Apple iPhone 15 Pro Max 256 GB", "Amazon", 1179, 1279, 4.7, 4100, "iphone"),
    listing(4, "iPhone 15 Pro Max 256GB", "Bol.com", 1249, 1299, 4.6, 980, "iphone"),
    listing(5, "iPhone 15 Pro Max 256GB import", "GreyImport", 999, 1199, 4.0, 88, "iphone"),
  ],
  (product, index) => ({
    link: product.link,
    trustScore: product.store === "GreyImport" ? 41 : 80 - (index % 4),
    fakeDiscountRisk: product.store === "GreyImport" ? "high" : "low",
    priceAnomaly: product.store === "GreyImport" ? "suspicious_low" : "normal",
    suspiciousSeller: product.store === "GreyImport",
  })
);

const macbook = scenario(
  "MacBook",
  "macbook pro m3 14 inch best price",
  [
    listing(1, "Apple MacBook Pro 14 M3 Pro 512GB 32GB RAM Retina", "Coolblue", 2199, 2499, 4.8, 1240, "mac"),
    listing(2, "MacBook Pro 14 M3 512GB Space Black 16GB RAM", "MediaMarkt", 2249, 2499, 4.7, 980, "mac"),
    listing(3, "Apple MacBook Pro 14-inch M3 512GB SSD", "Amazon", 2149, 2399, 4.6, 2100, "mac"),
    listing(4, "MacBook Pro 14 M3 512GB", "Bol.com", 2299, 2499, 4.5, 640, "mac"),
    listing(5, "MacBook Pro 14 M3 (refurb)", "BackMarket", 1899, 2199, 4.2, 310, "mac"),
    listing(6, "MacBook Pro 14 M3 512GB", "RandomMarket", 1799, 2299, 3.9, 42, "mac"),
  ],
  (product, index) => ({
    link: product.link,
    trustScore: product.store === "RandomMarket" ? 34 : 78 - index,
    fakeDiscountRisk: product.store === "RandomMarket" ? "high" : "low",
    priceAnomaly: product.store === "RandomMarket" ? "suspicious_low" : "normal",
    suspiciousSeller: product.store === "RandomMarket",
  })
);

const sofa = scenario(
  "Sofa",
  "modular corner sofa grey fabric",
  [
    listing(1, "Modular Corner Sofa Grey Fabric 5-seat L-shape deep seat", "IKEA", 899, 1099, 4.5, 620, "sofa"),
    listing(2, "Corner Sofa Modular Grey L-shape velvet", "Leen Bakker", 949, 1149, 4.3, 210, "sofa"),
    listing(3, "Grey Fabric Modular Sofa Corner", "Bol.com", 879, 999, 4.4, 480, "sofa"),
    listing(4, "Premium Modular Corner Sofa Grey solid wood frame", "Made.com", 1299, 1499, 4.6, 140, "sofa"),
    listing(5, "Budget Corner Sofa Grey Fabric particle board", "UnknownOutlet", 499, 899, 3.7, 18, "sofa"),
    listing(6, "Modular Sofa Grey 4-seat stain resistant", "Coolblue", 999, 1199, 4.5, 330, "sofa"),
  ],
  (product, index) => ({
    link: product.link,
    trustScore: product.store === "UnknownOutlet" ? 37 : 72 - (index % 3),
    fakeDiscountRisk: product.store === "UnknownOutlet" ? "high" : "low",
    priceAnomaly: product.price <= 520 ? "suspicious_low" : "normal",
    suspiciousSeller: product.store === "UnknownOutlet",
  })
);

const headphones = scenario(
  "Headphones",
  "wireless noise cancelling headphones best",
  [
    listing(1, "Sony WH-1000XM5 Wireless NC LDAC hi-res over-ear", "Coolblue", 329, 399, 4.8, 4200, "audio"),
    listing(2, "Bose QuietComfort Ultra Headphones ANC 30 hour", "MediaMarkt", 379, 429, 4.7, 2100, "audio"),
    listing(3, "Apple AirPods Max Space Grey", "Amazon", 549, 579, 4.6, 3100, "audio"),
    listing(4, "Sennheiser Momentum 4 Wireless aptX adaptive", "Bol.com", 299, 349, 4.7, 980, "audio"),
    listing(5, "Budget NC Headphones Pro X", "GreyOutlet", 89, 199, 3.8, 24, "audio"),
  ],
  (product, index) => ({
    link: product.link,
    trustScore: product.store === "GreyOutlet" ? 35 : 79 - (index % 4),
    fakeDiscountRisk: product.store === "GreyOutlet" ? "high" : "low",
    priceAnomaly: product.price <= 95 ? "suspicious_low" : "normal",
    suspiciousSeller: product.store === "GreyOutlet",
  })
);

const sparseBuyTray = scenario(
  "SparseBuyLead",
  "iphone 15 pro max 256gb unlocked",
  [
    listing(1, "Apple iPhone 15 Pro Max 256GB Titanium unlocked", "Coolblue", 1199, 1299, 4.9, 5200, "sparse"),
    listing(2, "Phone case bundle only", "RandomAccessory", 19, 29, 3.2, 4, "sparse"),
    listing(3, "Charger cable USB-C", "RandomAccessory", 12, 18, 3.5, 8, "sparse"),
  ],
  (product) => ({
    link: product.link,
    trustScore: product.store === "Coolblue" ? 82 : 40,
    fakeDiscountRisk: "low",
    priceAnomaly: "normal",
    suspiciousSeller: product.store !== "Coolblue",
  })
);

const sparseReport = validateScenario(sparseBuyTray);

const reports = [
  validateScenario(iphone),
  validateScenario(macbook),
  validateScenario(sofa),
  validateScenario(headphones),
  sparseReport,
];

assert.ok(
  sparseReport.after["BUY READY"] >= 1,
  "sparse lead tray promotes genuine BUY opportunity"
);
assert.ok(
  sparseReport.after["BUY READY"] <= 1,
  "accessory listings must not all become BUY"
);

const totalBuy = reports.reduce((sum, row) => sum + row.after["BUY READY"], 0);
const totalRows = reports.reduce(
  (sum, row) => sum + Object.values(row.after).reduce((a, b) => a + b, 0),
  0
);

assert.ok(
  reports.filter((row) => ["iPhone", "MacBook", "Sofa", "Headphones"].includes(row.name)).some(
    (row) => row.after["BUY READY"] >= 1
  ),
  "competitive category tray promotes at least one BUY opportunity"
);
assert.ok(totalBuy >= 1, "BUY READY appears when product intelligence supports opportunity");

console.log("phase29-buy-opportunity-engine: ok");
console.log(
  JSON.stringify({
    aggregateBuyShare: totalBuy / totalRows,
    targetGuidance: { buy: "10-20%", compare: "30-40%", wait: "30-40%", avoid: "10-20%" },
    reports,
  })
);
