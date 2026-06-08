#!/usr/bin/env node
/**
 * Phase 31 — Decision brief authority validation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import {
  briefCoversRequiredElements,
  isScoreFreeBriefLanguage,
} from "../lib/ui/decisionBriefAuthorityEngine.ts";
import { buildBriefAuthorityDecisionMap } from "../lib/ui/phase31DecisionBriefActivation.ts";
import { overlayCoherentWithUniversal } from "../lib/ui/universalProductDecision.ts";

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

  return { name, coherenceMap, metaByLink, productsByLink };
}

assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/decisionBriefAuthorityEngine.ts"), "utf8").includes(
    "resolveDecisionBriefAuthority"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/phase31DecisionBriefActivation.ts"), "utf8").includes(
    "buildBriefAuthorityDecisionMap"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
    "buildCommerceIntelligenceCoreDecisionMap"
  )
);

function validateScenario(data) {
  const map = buildBriefAuthorityDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  const rows = [...map.values()];

  for (const row of rows) {
    const intel = row.productIntelligence;
    assert.ok(intel?.alignmentFlags?.includes("phase31_decision_brief_authority"), `${data.name}: phase31 flag`);
    assert.ok(row.decisionThesis && row.decisionThesis.length > 20, `${data.name}: decision thesis exists`);
    assert.ok(isScoreFreeBriefLanguage(row.decisionThesis), `${data.name}: thesis is score-free`);
    assert.ok(isScoreFreeBriefLanguage(row.reasonLine), `${data.name}: primary reason is score-free`);

    assert.ok(
      briefCoversRequiredElements({
        decisionThesis: row.decisionThesis,
        primaryReason: row.reasonLine,
        secondaryReason: row.secondaryReason ?? "",
        purchaseReasoning: row.secondaryReason ?? "",
      }),
      `${data.name}: brief covers required elements`
    );

    if (row.verdict === "BUY READY") {
      assert.ok(
        row.decisionThesis.toLowerCase().includes("strongest") ||
          row.decisionThesis.toLowerCase().includes("best purchase") ||
          row.decisionThesis.toLowerCase().includes("value-quality balance"),
        `${data.name}: BUY thesis explains opportunity`
      );
      assert.ok(
        row.reasonLine.toLowerCase().includes("best purchase opportunity"),
        `${data.name}: BUY answers why now`
      );
    }

    if (row.verdict === "COMPARE") {
      assert.ok(
        row.decisionThesis.toLowerCase().includes("competing listings") ||
          row.decisionThesis.toLowerCase().includes("similar capability"),
        `${data.name}: COMPARE thesis cites competitor pressure`
      );
      assert.ok(
        row.reasonLine.toLowerCase().includes("cannot reach buy ready") ||
          row.reasonLine.toLowerCase().includes("competitor"),
        `${data.name}: COMPARE answers blocker`
      );
    }

    if (row.verdict === "WAIT") {
      assert.ok(
        row.decisionThesis.toLowerCase().includes("do not justify purchase") ||
          row.decisionThesis.toLowerCase().includes("nearby alternatives"),
        `${data.name}: WAIT thesis explains delay`
      );
      assert.ok(
        row.reasonLine.toLowerCase().includes("would make this purchase attractive") ||
          row.reasonLine.toLowerCase().includes("should wait"),
        `${data.name}: WAIT answers improvement path`
      );
    }
  }

  return {
    name: data.name,
    verdicts: Object.fromEntries(
      ["BUY READY", "WAIT", "COMPARE", "AVOID"].map((verdict) => [
        verdict,
        rows.filter((row) => row.verdict === verdict).length,
      ])
    ),
    samples: rows.slice(0, 2).map((row) => ({
      verdict: row.verdict,
      thesis: row.decisionThesis,
      reason: row.reasonLine,
    })),
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

const laptop = scenario(
  "Laptop",
  "dell xps 15 laptop 32gb ram best price",
  [
    listing(1, "Dell XPS 15 9530 Intel i7 32GB RAM 1TB SSD OLED", "Coolblue", 1899, 2199, 4.7, 820, "laptop"),
    listing(2, "Dell XPS 15 Laptop 32GB RAM 1TB", "MediaMarkt", 1949, 2199, 4.6, 540, "laptop"),
    listing(3, "Dell XPS 15 9530 32GB RAM Ultrabook", "Amazon", 1849, 2099, 4.5, 1100, "laptop"),
    listing(4, "Dell XPS 15 32GB RAM Notebook", "Bol.com", 1999, 2299, 4.4, 260, "laptop"),
    listing(5, "Dell XPS 15 32GB RAM (refurb)", "BackMarket", 1599, 1899, 4.1, 140, "laptop"),
  ],
  (product, index) => ({
    link: product.link,
    trustScore: 76 - index,
    fakeDiscountRisk: "low",
    priceAnomaly: "normal",
    suspiciousSeller: false,
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

const reports = [iphone, macbook, laptop, sofa].map(validateScenario);

for (const [link, coherent] of iphone.coherenceMap) {
  const universal = buildBriefAuthorityDecisionMap(
    iphone.coherenceMap,
    iphone.metaByLink,
    iphone.productsByLink
  ).get(link);
  const overlay = overlayCoherentWithUniversal(coherent, universal);
  assert.equal(overlay.reasonLine, universal.reasonLine, "drawer reason matches brief authority card");
  assert.equal(overlay.summaryLines[0], universal.decisionThesis, "drawer summary leads with thesis");
}

console.log("phase31-decision-brief-authority: ok");
console.log(JSON.stringify({ reports }));
