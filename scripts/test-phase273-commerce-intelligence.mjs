#!/usr/bin/env node
/**
 * Phase 27.3 — Commerce Intelligence Authority tests (MacBook, iPhone, Sofa).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { buildPhase273ProductMap } from "../lib/ui/phase273PresentationActivation.ts";
import { verdictDistributionWithinTargets } from "../lib/ui/commerceVerdictAuthority.ts";
import { trayReasonsAreDistinct } from "../lib/ui/reasonDiversityAuthority.ts";
import { surfaceEvidenceSupportsAuthority } from "../lib/ui/verdictReasonAuthority.ts";

const base = {
  extensions: [],
  image: "",
  availability: "In stock",
  shipping: "Free delivery",
};

function listing(id, title, store, price, oldPrice, rating, reviewsCount) {
  return {
    ...base,
    id,
    link: `https://shop.example/p273/${id}`,
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

  return { name, tray, coherenceMap, metaByLink, query };
}

const macbook = scenario(
  "MacBook",
  "macbook pro m3 14 inch best price",
  [
    listing(1, "Apple MacBook Pro 14 M3 Pro 512GB", "Coolblue", 2199, 2499, 4.8, 1240),
    listing(2, "MacBook Pro 14 M3 512GB Space Black", "MediaMarkt", 2249, 2499, 4.7, 980),
    listing(3, "Apple MacBook Pro 14-inch M3", "Amazon", 2149, 2399, 4.6, 2100),
    listing(4, "MacBook Pro 14 M3 512GB", "Bol.com", 2299, 2499, 4.5, 640),
    listing(5, "MacBook Pro 14 M3 (refurb)", "BackMarket", 1899, 2199, 4.2, 310),
    listing(6, "MacBook Pro 14 M3 512GB", "RandomMarket", 1799, 2299, 3.9, 42),
    listing(7, "MacBook Pro 14 M3 Max 1TB", "Alternate", 2799, 2999, 4.9, 520),
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
    listing(1, "Apple iPhone 15 Pro Max 256GB", "Coolblue", 1199, 1299, 4.8, 3200),
    listing(2, "iPhone 15 Pro Max 256GB Natural", "MediaMarkt", 1229, 1299, 4.7, 2100),
    listing(3, "Apple iPhone 15 Pro Max 256 GB", "Amazon", 1179, 1279, 4.7, 4100),
    listing(4, "iPhone 15 Pro Max 256GB", "Bol.com", 1249, 1299, 4.6, 980),
    listing(5, "iPhone 15 Pro Max 256GB", "BCC", 1215, 1299, 4.5, 760),
    listing(6, "iPhone 15 Pro Max 256GB import", "GreyImport", 999, 1199, 4.0, 88),
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
    listing(1, "Modular Corner Sofa Grey Fabric 5-seat", "IKEA", 899, 1099, 4.5, 620),
    listing(2, "Corner Sofa Modular Grey L-shape", "Leen Bakker", 949, 1149, 4.3, 210),
    listing(3, "Grey Fabric Modular Sofa Corner", "Bol.com", 879, 999, 4.4, 480),
    listing(4, "Premium Modular Corner Sofa Grey", "Made.com", 1299, 1499, 4.6, 140),
    listing(5, "Budget Corner Sofa Grey Fabric", "UnknownOutlet", 499, 899, 3.7, 18),
    listing(6, "Modular Sofa Grey 4-seat", "Coolblue", 999, 1199, 4.5, 330),
    listing(7, "Corner Sofa Grey Modular XL", "Wehkamp", 1049, 1249, 4.2, 190),
  ],
  (product, index) => ({
    link: product.link,
    trustScore: product.store === "UnknownOutlet" ? 37 : product.store === "Made.com" ? 66 : 72 - (index % 3),
    fakeDiscountRisk: product.store === "UnknownOutlet" ? "high" : "low",
    priceAnomaly: product.price <= 520 ? "suspicious_low" : "normal",
    suspiciousSeller: product.store === "UnknownOutlet",
  })
);

assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/evidenceConfidenceAuthority.ts"), "utf8").includes(
    "resolveEvidenceConfidence"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/phase273PresentationActivation.ts"), "utf8").includes(
    "buildPhase273ProductMap"
  )
);

function confidenceSpread(scores) {
  if (scores.length < 2) return 0;
  const mean = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const variance = scores.reduce((sum, value) => sum + (value - mean) ** 2, 0) / scores.length;
  return Math.sqrt(variance);
}

function validateScenario(scenarioData) {
  const phase273 = buildPhase273ProductMap(scenarioData.coherenceMap, scenarioData.metaByLink);
  const rows = [...phase273.values()];
  const verdicts = rows.map((row) => row.distributionVerdict);
  const confidences = rows.map((row) => row.spreadConfidence);
  const reasons = rows.map((row) => row.distributionReason);
  const uniqueConfidence = new Set(confidences);
  const uniqueVerdicts = new Set(verdicts);

  const ranked = [...phase273.entries()].sort(
    (a, b) => (scenarioData.metaByLink.get(a[0])?.rank ?? 99) - (scenarioData.metaByLink.get(b[0])?.rank ?? 99)
  );
  const top = ranked[0][1];
  const bottom = ranked[ranked.length - 1][1];

  assert.ok(uniqueConfidence.size >= Math.min(4, rows.length - 1), `${scenarioData.name}: confidence must spread`);
  assert.ok(confidenceSpread(confidences) >= 6, `${scenarioData.name}: confidence must be non-linear`);
  assert.ok(uniqueVerdicts.size >= 2, `${scenarioData.name}: verdict diversity required`);
  assert.ok(verdictDistributionWithinTargets(verdicts), `${scenarioData.name}: verdict distribution in target bands`);
  assert.ok(trayReasonsAreDistinct(reasons), `${scenarioData.name}: reasons must be distinct`);
  assert.ok(
    top.distributionVerdict === "BUY READY" || top.spreadConfidence >= Math.max(...confidences) - 2,
    `${scenarioData.name}: top ranked product should lead confidence/buy posture`
  );
  assert.ok(
    bottom.distributionVerdict === "AVOID" ||
      bottom.distributionVerdict === "WAIT" ||
      bottom.spreadConfidence <= top.spreadConfidence - 8,
    `${scenarioData.name}: weak tail should wait/avoid or trail confidence`
  );

  const buyConfidences = rows
    .filter((row) => row.distributionVerdict === "BUY READY")
    .map((row) => row.spreadConfidence);
  if (buyConfidences.length >= 2) {
    assert.ok(
      Math.max(...buyConfidences) - Math.min(...buyConfidences) >= 8,
      `${scenarioData.name}: same-verdict BUY confidence must differ`
    );
  }

  const compareShare = verdicts.filter((verdict) => verdict === "COMPARE").length / verdicts.length;
  assert.ok(compareShare <= 0.3, `${scenarioData.name}: COMPARE must not dominate tray`);

  for (const [link, row] of phase273) {
    assert.ok(
      surfaceEvidenceSupportsAuthority(row.displayChips, row.reasonAuthority) || row.displayChips.length === 0,
      `${scenarioData.name}: chips support verdict for ${link}`
    );
  }

  return {
    name: scenarioData.name,
    verdicts: Object.fromEntries(
      ["BUY READY", "WAIT", "COMPARE", "AVOID"].map((verdict) => [
        verdict,
        verdicts.filter((value) => value === verdict).length,
      ])
    ),
    confidences: confidences.sort((a, b) => b - a),
    top: top.distributionVerdict,
    bottom: bottom.distributionVerdict,
  };
}

const reports = [macbook, iphone, sofa].map(validateScenario);
console.log("phase273-commerce-intelligence: ok");
console.log(JSON.stringify(reports, null, 2));
