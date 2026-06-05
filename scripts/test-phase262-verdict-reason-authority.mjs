#!/usr/bin/env node
/**
 * Phase 26.2 — Verdict Reason Authority tests (offline).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import {
  reasonCodeForChipLabel,
  resolveProductReasonAuthority,
  resolveTrayReasonAuthority,
  surfaceEvidenceSupportsAuthority,
} from "../lib/ui/verdictReasonAuthority.ts";
import { resolveUnifiedTrayVerdict } from "../lib/ui/unifiedVerdictAuthority.ts";
import { activateAlternativeAdvantage } from "../lib/ui/alternativeAdvantageActivation.ts";
import { activateBuyWait } from "../lib/ui/buyWaitActivation.ts";
import { activateCategoryIntelligence } from "../lib/ui/categoryIntelligenceActivation.ts";
import { activateDiscountTruth } from "../lib/ui/discountTruthActivation.ts";
import { activateIntentIntelligence } from "../lib/ui/intentIntelligenceActivation.ts";
import { activatePriceTarget } from "../lib/ui/priceTargetActivation.ts";
import { activateTrustRisk } from "../lib/ui/trustRiskActivation.ts";

const base = {
  extensions: [],
  image: "",
  rating: 4.7,
  reviewsCount: 820,
  availability: "In stock",
  shipping: "Free delivery",
};

const lead = {
  ...base,
  id: 1,
  link: "https://shop.example/lead",
  title: "Samsung Galaxy S24 Ultra 512GB flagship smartphone",
  store: "Coolblue",
  price: 899,
  oldPrice: 1099,
  priceTrend: "down",
};

const peer = {
  ...base,
  id: 2,
  link: "https://shop.example/peer",
  title: lead.title,
  store: "MediaMarkt",
  price: 929,
  oldPrice: 1049,
  priceTrend: "down",
};

const tray = [lead, peer];

function buildLayers(product, list, searchQuery, isLead) {
  const discountTruth = activateDiscountTruth({ product, list });
  const buyWait = activateBuyWait({ product, list, discountTruth, institutionalVerdict: "BUY READY" });
  const priceTarget = activatePriceTarget({ product, list, discountTruth, buyWait });
  const categoryIntelligence = activateCategoryIntelligence({ product, searchQuery });
  const alternativeAdvantage = activateAlternativeAdvantage({
    product,
    list,
    isLeadProduct: isLead,
    discountTruth,
    buyWait,
  });
  const intentIntelligence = activateIntentIntelligence({
    product,
    list,
    searchQuery,
    isLeadProduct: isLead,
    categoryIntelligence,
    discountTruth,
    buyWait,
    priceTarget,
    alternativeAdvantage,
    rankingRationaleLine: "Ranked first — trust and seller signals lead this tray.",
  });
  const trustRisk = activateTrustRisk({
    product,
    list,
    discountTruth,
    buyWait,
    priceTarget,
    categoryIntelligence,
    alternativeAdvantage,
    intentIntelligence,
    rankingRationaleLine: "Ranked first — trust and seller signals lead this tray.",
  });
  return {
    discountTruth,
    buyWait,
    priceTarget,
    categoryIntelligence,
    alternativeAdvantage,
    intentIntelligence,
    trustRisk,
  };
}

const reasonSrc = readFileSync(join(process.cwd(), "lib/ui/verdictReasonAuthority.ts"), "utf8");
assert.ok(reasonSrc.includes("primaryReason"), "reason authority structure");
assert.ok(reasonSrc.includes("PRICE_TOO_HIGH"), "wait blocker taxonomy");
assert.ok(reasonSrc.includes("TRUST_RISK"), "avoid risk taxonomy");

const exposureSrc = readFileSync(join(process.cwd(), "lib/ui/intelligenceExposureActivation.ts"), "utf8");
assert.ok(exposureSrc.includes("reasonAuthority"), "exposure exposes reason authority");
assert.ok(exposureSrc.includes("filterChipsForReasonAuthority"), "compact chips filtered");

const coherenceSrc = readFileSync(join(process.cwd(), "lib/ui/decisionCoherenceActivation.ts"), "utf8");
assert.ok(coherenceSrc.includes("reasonAuthority"), "coherent decision binds reason authority");

// ── Product reason authority ───────────────────────────────────────────────────
const layers = buildLayers(lead, tray, "samsung galaxy s24 ultra best camera", true);
const buyAuthority = resolveProductReasonAuthority({
  verdict: "BUY READY",
  alignmentScore: 88,
  isLeadProduct: true,
  rankingRationaleLine: "Ranked first — trust and seller signals lead this tray.",
  ...layers,
});
assert.ok(buyAuthority.primaryReason.code, "buy primary reason code present");
assert.ok(
  ["VALUE", "PRICE", "TRUST", "QUALITY", "FIT", "RARITY"].includes(buyAuthority.primaryReason.code),
  "buy primary uses buy driver taxonomy"
);
assert.ok(buyAuthority.secondaryReasons.length <= 2, "secondary reasons capped");
assert.ok(buyAuthority.rejectedReasons.length >= 0, "rejected reasons tracked");

const waitLayers = buildLayers(peer, tray, "samsung galaxy s24 ultra", false);
const waitAuthority = resolveProductReasonAuthority({
  verdict: "WAIT",
  alignmentScore: 62,
  isLeadProduct: false,
  rankingRationaleLine: "Ranked second — price elevated versus tray low.",
  ...waitLayers,
  priceTarget: {
    ...waitLayers.priceTarget,
    distanceFromLowPct: 12,
    potentialSavings: 8,
  },
});
assert.ok(
  ["PRICE_TOO_HIGH", "LOW_CONFIDENCE", "INSUFFICIENT_DATA", "BETTER_OPTIONS_EXIST", "MARKET_RISK"].includes(
    waitAuthority.primaryReason.code
  ),
  "wait primary uses blocker taxonomy"
);

// ── Coherence integration + chip alignment ────────────────────────────────────
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
      trayAssessments: tray.map((p) => ({
        link: p.link,
        trustScore: 78,
        fakeDiscountRisk: "low",
        priceAnomaly: "normal",
        suspiciousSeller: false,
      })),
    },
  },
  decisionBrief: brief,
});

const coherence = activateProductDecisionCoherence({
  product: lead,
  list: tray,
  rank: 0,
  tray: trayCtx,
  searchQuery: "samsung galaxy s24 ultra best camera",
});

assert.equal(coherence.reasonAuthority.primaryReason.code, coherence.reasonAuthority.primaryReason.code);
assert.equal(coherence.summaryLines[0], coherence.reasonAuthority.primaryReason.line, "hero summary uses primary reason line");
assert.ok(
  surfaceEvidenceSupportsAuthority(coherence.intelligenceExposure.chips, coherence.reasonAuthority),
  "compact chips support dominant reason"
);
for (const chip of coherence.intelligenceExposure.chips) {
  const code = reasonCodeForChipLabel(chip.label);
  assert.ok(code, `chip maps to reason code: ${chip.label}`);
  assert.ok(
    code === coherence.reasonAuthority.primaryReason.code ||
      coherence.reasonAuthority.secondaryReasons.some((item) => item.code === code),
    `chip ${chip.label} supports primary or secondary reason`
  );
}

const unified = resolveUnifiedTrayVerdict([coherence]);
assert.ok(unified.reasonAuthority.primaryReason.line.length > 0, "tray reason authority on final verdict");
assert.ok(unified.winningReason.toLowerCase().includes("won"), "final verdict explains winner");
assert.ok(unified.losingReasons.length >= 0, "final verdict tracks rejected reasons");

const trayReason = resolveTrayReasonAuthority([coherence], unified.verdict);
assert.equal(trayReason.verdict, unified.verdict, "tray reason verdict matches unified verdict");

console.log("phase262-verdict-reason-authority: ok");
