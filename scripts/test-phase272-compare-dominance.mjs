#!/usr/bin/env node
/**
 * Phase 27.2 — Compare dominance elimination tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { buildPhase272ProductMap } from "../lib/ui/phase272PresentationActivation.ts";
import {
  compareShareWithinTarget,
  resolveCompareDominanceVerdict,
  strictCompareQualifies,
} from "../lib/ui/compareDominanceAuthority.ts";
import { buildPhase271ProductMap } from "../lib/ui/phase271PresentationActivation.ts";
import { surfaceEvidenceSupportsAuthority } from "../lib/ui/verdictReasonAuthority.ts";

const base = {
  extensions: [],
  image: "",
  rating: 4.7,
  reviewsCount: 820,
  availability: "In stock",
  shipping: "Free delivery",
};

function product(id, store, price, oldPrice = price + 40) {
  return {
    ...base,
    id,
    link: `https://shop.example/p272/${id}`,
    title: "Samsung Galaxy S24 Ultra 512GB flagship smartphone",
    store,
    price,
    oldPrice,
    priceTrend: "down",
  };
}

function buildTray(count = 8) {
  const stores = ["Coolblue", "MediaMarkt", "Amazon", "Bol.com", "Alternate", "BCC", "Fnac", "Expert"];
  const rows = stores.slice(0, count - 1).map((store, index) => product(index + 1, store, 899 + index * 8, 1049));
  rows.push(product(count, "RandomMarket", 799, 999));
  return rows;
}

const tray = buildTray(8);
const brief = {
  headline: "Compare dominance tray",
  recommendation: { label: "Top pick", title: tray[0].title, store: tray[0].store, link: tray[0].link, price: tray[0].price },
  why: [],
  alternatives: [],
  discountNote: null,
  confidence: 0.82,
  sparseTrayWarning: null,
  explanation: "Close peer listings in tray.",
  buyReasoning: "Lead trust is strong.",
  riskSignals: [],
};

const trayCtx = buildTrayCoherenceContext({
  searchMeta: {
    verdictIntelligence: {
      version: "phase10-v1",
      verdict: "BUY READY",
      confidence: 0.88,
      rationale: "Lead clears institutional checks.",
      strengths: [],
      warnings: [],
      factorTrace: {},
    },
    phase93TrustDiscount: {
      version: "phase93-v1",
      trayAssessments: tray.map((p, i) => ({
        link: p.link,
        trustScore: p.store === "RandomMarket" ? 36 : 76 - (i % 3),
        fakeDiscountRisk: p.store === "RandomMarket" ? "high" : "low",
        priceAnomaly: p.store === "RandomMarket" ? "suspicious_low" : "normal",
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
  readFileSync(join(process.cwd(), "lib/ui/compareDominanceAuthority.ts"), "utf8").includes(
    "strictCompareQualifies"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/phase272PresentationActivation.ts"), "utf8").includes(
    "buildPhase272ProductMap"
  )
);

const coherenceMap = new Map(tray.map((p, rank) => [p.link, coherenceFor(p, tray, rank)]));
const priceByLink = new Map(tray.map((p) => [p.link, p.price]));
const phase271 = buildPhase271ProductMap(coherenceMap);
const phase272 = buildPhase272ProductMap(coherenceMap, priceByLink);

const phase271Compare = [...phase271.values()].filter((row) => row.distributionVerdict === "COMPARE").length;
const phase272Verdicts = [...phase272.values()].map((row) => row.distributionVerdict);
const phase272Compare = phase272Verdicts.filter((verdict) => verdict === "COMPARE").length;

assert.ok(phase272Compare <= phase271Compare + 1, "phase 27.2 does not increase COMPARE population");
assert.ok(compareShareWithinTarget(phase272Verdicts), "COMPARE share within 0–10% target");
assert.ok(phase272Compare <= Math.ceil(tray.length * 0.1), "COMPARE is rare in tray");

const buyShare = phase272Verdicts.filter((v) => v === "BUY READY").length / tray.length;
const waitShare = phase272Verdicts.filter((v) => v === "WAIT").length / tray.length;
const avoidShare = phase272Verdicts.filter((v) => v === "AVOID").length / tray.length;

assert.ok(buyShare >= 0.25 && buyShare <= 0.6, "BUY READY within practical target band");
assert.ok(waitShare >= 0.15, "WAIT has meaningful tray presence");
assert.ok(avoidShare >= 0.05, "AVOID has meaningful tray presence");

const dominantBuy = [...phase272.values()].find(
  (row) => row.distributionVerdict === "BUY READY" && row.spreadConfidence > 85
);
if (dominantBuy) {
  const suppressed = [...phase272.values()].every(
    (row) => row.link === dominantBuy.link || row.distributionVerdict !== "COMPARE"
  );
  assert.ok(suppressed, "BUY READY >85 suppresses COMPARE below it");
}

for (const [link, row] of phase272) {
  assert.ok(
    surfaceEvidenceSupportsAuthority(row.displayChips, row.reasonAuthority) || row.displayChips.length === 0,
    "chips align with final 27.2 verdict"
  );
}

// Alternative pressure alone must not qualify COMPARE
const pressureSignals = tray.slice(0, 3).map((p, index) => {
  const coherent = coherenceMap.get(p.link);
  const p271 = phase271.get(p.link);
  return {
    link: p.link,
    price: 899 + index * 220,
    trust: 72 + index * 12,
    spreadConfidence: 68 + index * 9,
    verdict: "COMPARE",
    coherent,
    alternativePressureScore: 95,
  };
});
const pressureSelf = pressureSignals[1];
assert.ok(!strictCompareQualifies(pressureSignals, pressureSelf), "wide peer gaps block compare qualification");

const pressureOnly = resolveCompareDominanceVerdict(
  pressureSignals,
  pressureSelf,
  "COMPARE",
  "High alternative pressure"
);
assert.notEqual(pressureOnly.verdict, "COMPARE", "alternative pressure alone never emits COMPARE");

const frozen271 = readFileSync(join(process.cwd(), "lib/ui/decisionDistributionAuthority.ts"), "utf8");
const frozenSpread = readFileSync(join(process.cwd(), "lib/ui/confidenceSpreadEngine.ts"), "utf8");
assert.ok(frozen271.includes("QUANTAI_PHASE_27_1_STABLE_FROZEN"), "27.1 distribution module remains frozen");
assert.ok(frozenSpread.includes("QUANTAI_PHASE_27_1_STABLE_FROZEN"), "27.1 spread module remains frozen");

console.log("phase272-compare-dominance: ok");
console.log(
  JSON.stringify({
    phase271Compare,
    phase272Compare,
    buyShare: Number(buyShare.toFixed(2)),
    waitShare: Number(waitShare.toFixed(2)),
    avoidShare: Number(avoidShare.toFixed(2)),
  })
);
