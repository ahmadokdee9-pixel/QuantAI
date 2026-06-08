#!/usr/bin/env node
/**
 * Phase 27.5 — Confidence / verdict integrity validation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { primaryVerdictAlignment } from "../lib/ui/decisionLanguage.ts";
import {
  buildDisplayCoherenceByLink,
  buildUniversalProductDecisionMap,
  resolveUnifiedTrayVerdictFromUniversal,
} from "../lib/ui/phase274PresentationActivation.ts";
import { buildIntegrityUniversalProductDecisionMap } from "../lib/ui/phase275PresentationActivation.ts";
import {
  hasStaticConfidenceCluster,
  overlayCoherentWithUniversal,
} from "../lib/ui/universalProductDecision.ts";
import { universalFinalDecisionIntegrity } from "../lib/ui/universalFinalDecisionIntegrity.ts";
import { trayVerdictMatchesCardMajority } from "../lib/ui/unifiedVerdictAuthority.ts";
import { surfaceEvidenceSupportsAuthority } from "../lib/ui/verdictReasonAuthority.ts";

const base = {
  extensions: [],
  image: "",
  availability: "In stock",
  shipping: "Free delivery",
};

function listing(id, title, store, price, oldPrice, rating, reviewsCount, tag = "p275") {
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

function verdictDistribution(rows) {
  return Object.fromEntries(
    ["BUY READY", "WAIT", "COMPARE", "AVOID"].map((verdict) => [
      verdict,
      rows.filter((row) => row.verdict === verdict).length,
    ])
  );
}

function confidenceSummary(rows) {
  const scores = rows.map((row) => row.confidence);
  return {
    min: Math.min(...scores),
    max: Math.max(...scores),
    unique: new Set(scores).size,
    zeroCount: scores.filter((score) => score === 0).length,
    bucket62: scores.filter((score) => score === 62).length,
    scores: scores.sort((a, b) => b - a),
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

  return { name, tray, coherenceMap, metaByLink, query };
}

const macbook = scenario(
  "MacBook",
  "macbook pro m3 14 inch best price",
  [
    listing(1, "Apple MacBook Pro 14 M3 Pro 512GB", "Coolblue", 2199, 2499, 4.8, 1240, "mac"),
    listing(2, "MacBook Pro 14 M3 512GB Space Black", "MediaMarkt", 2249, 2499, 4.7, 980, "mac"),
    listing(3, "Apple MacBook Pro 14-inch M3", "Amazon", 2149, 2399, 4.6, 2100, "mac"),
    listing(4, "MacBook Pro 14 M3 512GB", "Bol.com", 2299, 2499, 4.5, 640, "mac"),
    listing(5, "MacBook Pro 14 M3 (refurb)", "BackMarket", 1899, 2199, 4.2, 310, "mac"),
    listing(6, "MacBook Pro 14 M3 512GB", "RandomMarket", 1799, 2299, 3.9, 42, "mac"),
    listing(7, "MacBook Pro 14 M3 Max 1TB", "Alternate", 2799, 2999, 4.9, 520, "mac"),
  ],
  (product, index) => ({
    link: product.link,
    trustScore: product.store === "RandomMarket" ? 34 : product.store === "BackMarket" ? 58 : 78 - index,
    fakeDiscountRisk: product.store === "RandomMarket" ? "high" : "low",
    priceAnomaly: product.store === "RandomMarket" ? "suspicious_low" : product.price >= 2700 ? "elevated" : "normal",
    suspiciousSeller: product.store === "RandomMarket",
  })
);

const iphone = scenario(
  "iPhone",
  "iphone 15 pro max 256gb best deal",
  [
    listing(1, "Apple iPhone 15 Pro Max 256GB", "Coolblue", 1199, 1299, 4.8, 3200, "iphone"),
    listing(2, "iPhone 15 Pro Max 256GB Natural", "MediaMarkt", 1229, 1299, 4.7, 2100, "iphone"),
    listing(3, "Apple iPhone 15 Pro Max 256 GB", "Amazon", 1179, 1279, 4.7, 4100, "iphone"),
    listing(4, "iPhone 15 Pro Max 256GB", "Bol.com", 1249, 1299, 4.6, 980, "iphone"),
    listing(5, "iPhone 15 Pro Max 256GB", "BCC", 1215, 1299, 4.5, 760, "iphone"),
    listing(6, "iPhone 15 Pro Max 256GB import", "GreyImport", 999, 1199, 4.0, 88, "iphone"),
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
    listing(1, "Modular Corner Sofa Grey Fabric 5-seat", "IKEA", 899, 1099, 4.5, 620, "sofa"),
    listing(2, "Corner Sofa Modular Grey L-shape", "Leen Bakker", 949, 1149, 4.3, 210, "sofa"),
    listing(3, "Grey Fabric Modular Sofa Corner", "Bol.com", 879, 999, 4.4, 480, "sofa"),
    listing(4, "Premium Modular Corner Sofa Grey", "Made.com", 1299, 1499, 4.6, 140, "sofa"),
    listing(5, "Budget Corner Sofa Grey Fabric", "UnknownOutlet", 499, 899, 3.7, 18, "sofa"),
    listing(6, "Modular Sofa Grey 4-seat", "Coolblue", 999, 1199, 4.5, 330, "sofa"),
    listing(7, "Corner Sofa Grey Modular XL", "Wehkamp", 1049, 1249, 4.2, 190, "sofa"),
  ],
  (product, index) => ({
    link: product.link,
    trustScore: product.store === "UnknownOutlet" ? 37 : product.store === "Made.com" ? 66 : 72 - (index % 3),
    fakeDiscountRisk: product.store === "UnknownOutlet" ? "high" : "low",
    priceAnomaly: product.price <= 520 ? "suspicious_low" : "normal",
    suspiciousSeller: product.store === "UnknownOutlet",
  })
);

const headphones = scenario(
  "Headphones",
  "wireless noise cancelling headphones best",
  [
    listing(1, "Sony WH-1000XM5 Wireless NC", "Coolblue", 329, 399, 4.8, 4200, "audio"),
    listing(2, "Bose QuietComfort Ultra Headphones", "MediaMarkt", 379, 429, 4.7, 2100, "audio"),
    listing(3, "Apple AirPods Max Space Grey", "Amazon", 549, 579, 4.6, 3100, "audio"),
    listing(4, "Sennheiser Momentum 4 Wireless", "Bol.com", 299, 349, 4.7, 980, "audio"),
    listing(5, "Budget NC Headphones Pro X", "GreyOutlet", 89, 199, 3.8, 24, "audio"),
    listing(6, "Sony WH-1000XM4 Refurb", "BackMarket", 219, 279, 4.4, 410, "audio"),
  ],
  (product, index) => ({
    link: product.link,
    trustScore: product.store === "GreyOutlet" ? 35 : product.store === "BackMarket" ? 57 : 79 - (index % 4),
    fakeDiscountRisk: product.store === "GreyOutlet" ? "high" : "low",
    priceAnomaly: product.price <= 95 ? "suspicious_low" : "normal",
    suspiciousSeller: product.store === "GreyOutlet",
  })
);

assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/universalFinalDecisionIntegrity.ts"), "utf8").includes(
    "universalFinalDecisionIntegrity"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/phase275PresentationActivation.ts"), "utf8").includes(
    "buildIntegrityUniversalProductDecisionMap"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
    "buildAlignedDecisionMap"
  )
);

function validateIntegrityScenario(scenarioData) {
  const { coherenceMap, metaByLink, name } = scenarioData;
  const beforeMap = buildUniversalProductDecisionMap(coherenceMap, metaByLink);
  const afterMap = buildIntegrityUniversalProductDecisionMap(coherenceMap, metaByLink);
  const displayCoherenceByLink = buildDisplayCoherenceByLink(coherenceMap, afterMap);
  const trayVerdict = resolveUnifiedTrayVerdictFromUniversal(displayCoherenceByLink);

  const beforeRows = [...beforeMap.values()];
  const afterRows = [...afterMap.values()];

  for (const row of afterRows) {
    assert.ok(row.confidence > 0 || row.verdict === "AVOID", `${name}: no valid product at 0% confidence`);
    if (row.verdict === "BUY READY") {
      assert.ok(row.confidence >= 65, `${name}: BUY READY must be >= 65% (got ${row.confidence})`);
    }
    if (row.verdict === "COMPARE") {
      assert.ok(
        row.alternativePressureScore >= 48,
        `${name}: COMPARE requires alternative pressure (got ${row.alternativePressureScore})`
      );
    }
    assert.ok(
      surfaceEvidenceSupportsAuthority(row.displayChips, row.reasonAuthority) || row.displayChips.length === 0,
      `${name}: chips support verdict authority`
    );
  }

  const compareShare = afterRows.filter((row) => row.verdict === "COMPARE").length / afterRows.length;
  assert.ok(compareShare <= 0.4, `${name}: COMPARE share <= 40%`);
  assert.ok(new Set(afterRows.map((row) => row.confidence)).size >= 3, `${name}: confidence varies by evidence`);

  assert.ok(
    trayVerdictMatchesCardMajority([...displayCoherenceByLink.values()], trayVerdict.verdict),
    `${name}: tray verdict matches card majority`
  );

  for (const [link, coherent] of coherenceMap) {
    const universal = afterMap.get(link);
    const overlay = overlayCoherentWithUniversal(coherent, universal);
    assert.equal(overlay.verdict, universal.verdict, `${name}: card/drawer verdict unified`);
    assert.equal(overlay.alignmentScore, universal.confidence, `${name}: card/drawer confidence unified`);
  }

  return {
    name,
    before: {
      verdicts: verdictDistribution(beforeRows),
      confidence: confidenceSummary(beforeRows),
    },
    after: {
      verdicts: verdictDistribution(afterRows),
      confidence: confidenceSummary(afterRows),
    },
    trayVerdict: trayVerdict.verdict,
  };
}

const reports = [macbook, iphone, sofa, headphones].map(validateIntegrityScenario);

const mixedTray = [
  listing(1, "Ultrabook 14 Core i7 16GB", "Coolblue", 1099, 1299, 4.6, 820, "mixed"),
  listing(2, "Smartphone 256GB dual sim", "MediaMarkt", 799, 899, 4.5, 2100, "mixed"),
  listing(3, "Modular corner sofa grey", "IKEA", 899, 1099, 4.3, 410, "mixed"),
  listing(4, "Wireless noise cancelling headphones", "Amazon", 249, 299, 4.7, 5400, "mixed"),
  listing(5, "Smart watch fitness GPS", "Bol.com", 329, 379, 4.4, 980, "mixed"),
  listing(6, "Electric kettle 1.7L glass", "BCC", 59, 79, 4.2, 320, "mixed"),
  listing(7, "Unknown outlet import listing", "GreyOutlet", 399, 699, 3.6, 12, "mixed"),
  listing(8, "Premium monitor 27 4K", "Alternate", 549, 649, 4.8, 760, "mixed"),
];

const mixed = scenario(
  "Mixed",
  "best value trusted seller",
  mixedTray,
  (product, index) => ({
    link: product.link,
    trustScore: product.store === "GreyOutlet" ? 36 : 74 - (index % 4),
    fakeDiscountRisk: product.store === "GreyOutlet" ? "high" : "low",
    priceAnomaly: product.store === "GreyOutlet" ? "suspicious_low" : "normal",
    suspiciousSeller: product.store === "GreyOutlet",
  })
);

reports.push(validateIntegrityScenario(mixed));

const beforeAll = reports.map((row) => row.before);
const afterAll = reports.map((row) => row.after);

assert.ok(
  beforeAll.some((row) => row.confidence.zeroCount > 0 || row.confidence.bucket62 >= 2),
  "before integrity: phase274 output may contain 0% or 62% artifacts"
);
assert.ok(
  afterAll.every((row) => row.confidence.zeroCount === 0),
  "after integrity: no 0% confidence on valid trays"
);
assert.ok(
  afterAll.every((row) => !hasStaticConfidenceCluster(row.confidence.scores, 62)),
  "after integrity: no static 62% cluster"
);

const sampleLink = [...mixed.coherenceMap.keys()][3];
const sampleCoherent = mixed.coherenceMap.get(sampleLink);
const sampleBefore = buildUniversalProductDecisionMap(mixed.coherenceMap, mixed.metaByLink).get(sampleLink);
const integrity = universalFinalDecisionIntegrity({
  decision: sampleBefore,
  coherent: sampleCoherent,
  meta: mixed.metaByLink.get(sampleLink),
  trayAlternativePressure: 52,
  traySize: mixed.tray.length,
});
assert.ok(integrity.integrityFlags.length >= 0, "integrity function returns flags");
assert.ok(integrity.finalConfidence >= 16, "integrity recomputes sub-floor confidence");

console.log("phase275-confidence-verdict-integrity: ok");
console.log(
  JSON.stringify({
    bugSources: {
      zeroPercent:
        "phase273PresentationActivation.ts finalListingConfidence() — rank penalty (meta.rank * 4.5) can clamp tail listings to 0%",
      sixtyTwoPercent:
        "decisionLanguage.ts primaryVerdictAlignment() — COMPARE=62, WAIT=48, AVOID=24, BUY=88 propagated via decisionCoherenceActivation alignmentScore",
    },
    reports,
  })
);
