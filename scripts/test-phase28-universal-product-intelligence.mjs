#!/usr/bin/env node
/**
 * Phase 28 — Universal Product Intelligence validation.
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
import { overlayCoherentWithUniversal } from "../lib/ui/universalProductDecision.ts";
import {
  detectProductIntelligenceSegment,
  isPriceDominatedReason,
} from "../lib/ui/universalProductIntelligenceEngine.ts";
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

const CATEGORY_KEYWORDS = {
  iPhone: /camera|battery|storage|ecosystem|performance|phone/i,
  MacBook: /cpu|ram|storage|display|portability|longevity|laptop/i,
  Sofa: /material|construction|comfort|dimensions|durability|style|sofa/i,
  Headphones: /sound|anc|comfort|battery|codec|headphone/i,
};

const macbook = scenario(
  "MacBook",
  "macbook pro m3 14 inch best price",
  [
    listing(1, "Apple MacBook Pro 14 M3 Pro 512GB 32GB RAM", "Coolblue", 2199, 2499, 4.8, 1240, "mac"),
    listing(2, "MacBook Pro 14 M3 512GB Space Black 16GB RAM", "MediaMarkt", 2249, 2499, 4.7, 980, "mac"),
    listing(3, "Apple MacBook Pro 14-inch M3 512GB SSD Retina", "Amazon", 2149, 2399, 4.6, 2100, "mac"),
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

const sofa = scenario(
  "Sofa",
  "modular corner sofa grey fabric",
  [
    listing(1, "Modular Corner Sofa Grey Fabric 5-seat L-shape", "IKEA", 899, 1099, 4.5, 620, "sofa"),
    listing(2, "Corner Sofa Modular Grey L-shape velvet", "Leen Bakker", 949, 1149, 4.3, 210, "sofa"),
    listing(3, "Grey Fabric Modular Sofa Corner deep seat", "Bol.com", 879, 999, 4.4, 480, "sofa"),
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
    listing(1, "Sony WH-1000XM5 Wireless NC LDAC hi-res", "Coolblue", 329, 399, 4.8, 4200, "audio"),
    listing(2, "Bose QuietComfort Ultra Headphones ANC", "MediaMarkt", 379, 429, 4.7, 2100, "audio"),
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

assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/universalProductIntelligenceEngine.ts"), "utf8").includes(
    "resolveUniversalProductIntelligence"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/phase28ProductIntelligenceActivation.ts"), "utf8").includes(
    "buildUniversalProductIntelligenceMap"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
    "buildAlignedDecisionMap"
  )
);

function validateScenario(data, keywordPattern) {
  const map = buildUniversalProductIntelligenceMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  const display = buildDisplayCoherenceByLink(data.coherenceMap, map);
  const trayVerdict = resolveUnifiedTrayVerdictFromUniversal(display);
  const rows = [...map.values()];

  assert.ok(rows.length > 0, `${data.name}: rows exist`);

  for (const row of rows) {
    const intel = row.productIntelligence;
    assert.ok(intel, `${data.name}: productIntelligence snapshot exists`);
    assert.ok(intel.productQualityScore >= 0, `${data.name}: productQualityScore`);
    assert.ok(intel.categoryFitScore >= 0, `${data.name}: categoryFitScore`);
    assert.ok(intel.valueScore >= 0, `${data.name}: valueScore`);
    assert.ok(intel.trustScore >= 0, `${data.name}: trustScore`);
    assert.ok(intel.pricingScore >= 0, `${data.name}: pricingScore`);
    assert.ok(intel.alternativePressure >= 0, `${data.name}: alternativePressure`);
    assert.equal(row.verdict, intel.finalVerdict, `${data.name}: verdict matches intelligence`);
    assert.ok(!isPriceDominatedReason(row.reasonLine), `${data.name}: primary reason is product-first`);
    assert.ok(
      keywordPattern.test(row.reasonLine) || keywordPattern.test(row.secondaryReason ?? ""),
      `${data.name}: category-specific product language present`
    );
    assert.ok(intel.dimensions.length >= 5, `${data.name}: category dimensions generated`);
  }

  assert.ok(
    trayVerdictMatchesCardMajority([...display.values()], trayVerdict.verdict),
    `${data.name}: tray matches card majority`
  );

  for (const [link, coherent] of data.coherenceMap) {
    const universal = map.get(link);
    const overlay = overlayCoherentWithUniversal(coherent, universal);
    assert.equal(overlay.reasonLine, universal.reasonLine, `${data.name}: card/drawer reason unified`);
  }

  const lead = rows[0];
  return {
    name: data.name,
    segment: lead.productIntelligence?.segment,
    sampleReason: lead.reasonLine,
    scores: {
      quality: lead.productIntelligence?.productQualityScore,
      fit: lead.productIntelligence?.categoryFitScore,
      value: lead.productIntelligence?.valueScore,
      trust: lead.productIntelligence?.trustScore,
      pricing: lead.productIntelligence?.pricingScore,
    },
    verdicts: Object.fromEntries(
      ["BUY READY", "WAIT", "COMPARE", "AVOID"].map((verdict) => [
        verdict,
        rows.filter((row) => row.verdict === verdict).length,
      ])
    ),
  };
}

const reports = [
  validateScenario(iphone, CATEGORY_KEYWORDS.iPhone),
  validateScenario(macbook, CATEGORY_KEYWORDS.MacBook),
  validateScenario(sofa, CATEGORY_KEYWORDS.Sofa),
  validateScenario(headphones, CATEGORY_KEYWORDS.Headphones),
];

assert.equal(detectProductIntelligenceSegment(iphone.tray[0], iphone.query), "phones");
assert.equal(detectProductIntelligenceSegment(macbook.tray[0], macbook.query), "laptops");
assert.equal(detectProductIntelligenceSegment(sofa.tray[0], sofa.query), "sofas");
assert.equal(detectProductIntelligenceSegment(headphones.tray[0], headphones.query), "headphones");

console.log("phase28-universal-product-intelligence: ok");
console.log(JSON.stringify({ reports }));
