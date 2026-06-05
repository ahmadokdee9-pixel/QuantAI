#!/usr/bin/env node
/**
 * Phase 27.1 — Decision Distribution Authority tests.
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
  buildPhase271ProductMap,
  resolveUnifiedTrayVerdictFromPhase271,
} from "../lib/ui/phase271PresentationActivation.ts";
import { resolveDecisionDistribution } from "../lib/ui/decisionDistributionAuthority.ts";
import { surfaceEvidenceSupportsAuthority } from "../lib/ui/verdictReasonAuthority.ts";

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
    link: `https://shop.example/${id}`,
    title: "Samsung Galaxy S24 Ultra 512GB flagship smartphone",
    store,
    price,
    oldPrice,
    priceTrend: "down",
  };
}

const lead = product(1, "Coolblue", 899, 1099);
const peer = product(2, "MediaMarkt", 929, 1049);
const valuePeer = product(3, "Amazon", 879, 999);
const overpriced = product(4, "Bol.com", 1049, 1099);
const risky = product(5, "RandomMarket", 799, 999);
const tray = [lead, peer, valuePeer, overpriced, risky];

const brief = {
  headline: "Tray brief",
  recommendation: { label: "Top pick", title: lead.title, store: lead.store, link: lead.link, price: lead.price },
  why: [],
  alternatives: [],
  discountNote: null,
  confidence: 0.82,
  sparseTrayWarning: null,
  explanation: "Institutional brief supports checkout.",
  buyReasoning: "Trust and discount posture support moving forward.",
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
        trustScore: p.store === "RandomMarket" ? 38 : i === 3 ? 72 : 78 - i * 2,
        fakeDiscountRisk: p.store === "RandomMarket" ? "high" : "low",
        priceAnomaly: p.store === "RandomMarket" ? "suspicious_low" : p.price >= 1000 ? "elevated" : "normal",
        suspiciousSeller: p.store === "RandomMarket",
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
  readFileSync(join(process.cwd(), "lib/ui/decisionDistributionAuthority.ts"), "utf8").includes(
    "resolveDecisionDistribution"
  )
);

const coherenceMap = new Map(
  tray.map((p, rank) => [p.link, coherenceFor(p, tray, rank)])
);
const phase271 = buildPhase271ProductMap(coherenceMap);
const unified = resolveUnifiedTrayVerdictFromPhase271(coherenceMap, phase271);

const verdicts = [...phase271.values()].map((row) => row.distributionVerdict);
const compareCount = verdicts.filter((v) => v === "COMPARE").length;
const buyCount = verdicts.filter((v) => v === "BUY READY").length;
const waitCount = verdicts.filter((v) => v === "WAIT").length;
const avoidCount = verdicts.filter((v) => v === "AVOID").length;

assert.ok(buyCount >= 1, "strong lead should surface BUY READY");
assert.ok(waitCount >= 1 || avoidCount >= 1, "weak price/timing or risk should not all be COMPARE");
assert.ok(compareCount < verdicts.length, "COMPARE must not dominate every product");
assert.ok(avoidCount >= 1, "risky listing should surface AVOID");

const leadPresentation = phase271.get(lead.link);
const riskyPresentation = phase271.get(risky.link);
assert.equal(leadPresentation.distributionVerdict, "BUY READY", "trusted lead with acceptable price is BUY READY");
assert.equal(riskyPresentation.distributionVerdict, "AVOID", "high-risk listing is AVOID not COMPARE");

// Frozen coherence may still label non-lead as COMPARE — distribution must override when inappropriate
for (const [link, coherent] of coherenceMap) {
  const row = phase271.get(link);
  assert.ok(row, "presentation exists");
  if (coherent.verdict === "COMPARE" && row.distributionVerdict === "BUY READY") {
    const effectiveTrust = Number.isFinite(coherent.trustRisk.trustScore)
      ? coherent.trustRisk.trustScore
      : 100 - coherent.trustRisk.riskScore;
    assert.ok(effectiveTrust >= 62, "COMPARE→BUY READY only when trust supports buy-ready");
  }
  assert.ok(
    surfaceEvidenceSupportsAuthority(row.displayChips, row.reasonAuthority) || row.displayChips.length === 0,
    "chips support distribution verdict reason authority"
  );
}

// Direct distribution: strong trust + fit + price → BUY READY (not COMPARE fallback)
const strongCoherent = coherenceFor(lead, tray, 0);
const strongDist = resolveDecisionDistribution(strongCoherent, {
  bestConfidence: 90,
  productConfidence: 88,
  confidenceGapFromBest: 2,
  closeAlternativeCount: 3,
  trayAlternativePressure: 72,
});
assert.equal(strongDist.verdict, "BUY READY", "strong product must not default to COMPARE");

// Overpriced but trusted → WAIT
const overCoherent = coherenceFor(overpriced, tray, 3);
const waitDist = resolveDecisionDistribution(overCoherent, {
  bestConfidence: 90,
  productConfidence: 55,
  confidenceGapFromBest: 35,
  closeAlternativeCount: 1,
  trayAlternativePressure: 30,
});
assert.equal(waitDist.verdict, "WAIT", "overpriced trusted listing becomes WAIT not COMPARE");

assert.notEqual(
  phase271.get(lead.link).spreadConfidence,
  primaryVerdictAlignment("BUY READY"),
  "display confidence not frozen bucket"
);

assert.ok(unified.verdict.length > 0, "tray verdict resolved from distribution labels");

console.log("phase271-decision-distribution: ok");
console.log(
  JSON.stringify({ buyCount, waitCount, compareCount, avoidCount, trayVerdict: unified.verdict })
);
