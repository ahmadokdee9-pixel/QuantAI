#!/usr/bin/env node
/**
 * Phase 27.1 — Confidence Spread Engine tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { primaryVerdictAlignment } from "../lib/ui/decisionLanguage.ts";
import { buildPhase271ProductMap } from "../lib/ui/phase271PresentationActivation.ts";
import {
  confidenceWithinVerdictBand,
  resolveConfidenceSpread,
} from "../lib/ui/confidenceSpreadEngine.ts";
import { resolveConfidenceAuthority } from "../lib/ui/confidenceAuthority.ts";

const base = {
  extensions: [],
  image: "",
  rating: 4.7,
  reviewsCount: 820,
  availability: "In stock",
  shipping: "Free delivery",
};

function product(id, store, price, oldPrice = price + 80) {
  return {
    ...base,
    id,
    link: `https://shop.example/spread/${id}`,
    title: "Samsung Galaxy S24 Ultra 512GB flagship smartphone",
    store,
    price,
    oldPrice,
    priceTrend: "down",
  };
}

const tray = [
  product(1, "Coolblue", 899, 1099),
  product(2, "MediaMarkt", 929, 1049),
  product(3, "Amazon", 879, 999),
  product(4, "Bol.com", 949, 1049),
  product(5, "Alternate", 919, 1039),
];

const brief = {
  headline: "Spread tray",
  recommendation: { label: "Top pick", title: tray[0].title, store: tray[0].store, link: tray[0].link, price: tray[0].price },
  why: [],
  alternatives: [],
  discountNote: null,
  confidence: 0.82,
  sparseTrayWarning: null,
  explanation: "Tray for spread validation.",
  buyReasoning: "Multiple close listings.",
  riskSignals: [],
};

const trayCtx = buildTrayCoherenceContext({
  searchMeta: {
    verdictIntelligence: {
      version: "phase10-v1",
      verdict: "BUY READY",
      confidence: 0.82,
      rationale: "Lead clears institutional checks.",
      strengths: [],
      warnings: [],
      factorTrace: {},
    },
    phase93TrustDiscount: {
      version: "phase93-v1",
      trayAssessments: tray.map((p, i) => ({
        link: p.link,
        trustScore: 76 - i,
        fakeDiscountRisk: "low",
        priceAnomaly: "normal",
        suspiciousSeller: false,
      })),
    },
  },
  decisionBrief: brief,
});

function coherenceFor(product, list, rank) {
  return activateProductDecisionCoherence({
    product,
    list,
    rank,
    tray: trayCtx,
    searchQuery: "samsung galaxy s24 ultra best camera",
  });
}

assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/confidenceSpreadEngine.ts"), "utf8").includes(
    "resolveConfidenceSpread"
  )
);

const coherenceMap = new Map(
  tray.map((p, rank) => [p.link, coherenceFor(p, tray, rank)])
);
const phase271 = buildPhase271ProductMap(coherenceMap);

const scores = [...phase271.values()].map((row) => row.spreadConfidence);
const uniqueScores = new Set(scores);

assert.ok(scores.length >= 3, "multiple products scored");
assert.ok(uniqueScores.size >= 3, "confidence values must spread across products");
assert.ok(!scores.includes(62), "no static 62% cluster");
assert.ok(!scores.every((s) => s === 88), "no static 88% cluster for buy-ready");

for (const row of phase271.values()) {
  assert.ok(
    confidenceWithinVerdictBand(row.distributionVerdict, row.spreadConfidence),
    `${row.distributionVerdict} score ${row.spreadConfidence} within band`
  );
  assert.ok(row.spreadConfidenceReason.length > 20, "spread reason present");
}

const compareRows = [...phase271.values()].filter((row) => row.distributionVerdict === "COMPARE");
if (compareRows.length >= 2) {
  const compareScores = compareRows.map((row) => row.spreadConfidence);
  assert.ok(new Set(compareScores).size >= 2, "COMPARE confidence must vary (e.g. 79,73,66,58,51)");
  for (const score of compareScores) {
    assert.ok(score >= 55 && score <= 82, "COMPARE within 55–82");
  }
}

const buyRows = [...phase271.values()].filter((row) => row.distributionVerdict === "BUY READY");
if (buyRows.length >= 1) {
  for (const row of buyRows) {
    assert.ok(row.spreadConfidence >= 78 && row.spreadConfidence <= 96, "BUY READY within 78–96");
    assert.notEqual(row.spreadConfidence, primaryVerdictAlignment("BUY READY"), "not fixed 88");
  }
}

// Engine unit: same verdict, different keys → different scores
const sample = coherenceMap.get(tray[0].link);
const factors = resolveConfidenceAuthority({
  verdict: sample.verdict,
  intentIntelligence: sample.intentIntelligence,
  trustRisk: sample.trustRisk,
  discountTruth: sample.discountTruth,
  priceTarget: sample.priceTarget,
  buyWait: sample.buyWait,
  categoryIntelligence: sample.categoryIntelligence,
  alternativeAdvantage: sample.alternativeAdvantage,
}).factors;

const a = resolveConfidenceSpread({ verdict: "COMPARE", factors, spreadKey: tray[0].link });
const b = resolveConfidenceSpread({ verdict: "COMPARE", factors, spreadKey: tray[1].link });
assert.notEqual(a.confidenceScore, b.confidenceScore, "spread key produces independent scores");

console.log("phase271-confidence-spread: ok");
console.log(JSON.stringify({ scores: scores.sort((x, y) => y - x) }));
