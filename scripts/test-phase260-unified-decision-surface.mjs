#!/usr/bin/env node
/**
 * Phase 26.0 — Unified Decision Surface (hierarchy only; no new intelligence).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { activateIntelligenceExposure } from "../lib/ui/intelligenceExposureActivation.ts";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { activateAlternativeAdvantage } from "../lib/ui/alternativeAdvantageActivation.ts";
import { activateBuyWait } from "../lib/ui/buyWaitActivation.ts";
import { activateCategoryIntelligence } from "../lib/ui/categoryIntelligenceActivation.ts";
import { activateDiscountTruth } from "../lib/ui/discountTruthActivation.ts";
import { activateIntentIntelligence } from "../lib/ui/intentIntelligenceActivation.ts";
import { activatePriceTarget } from "../lib/ui/priceTargetActivation.ts";
import { activateTrustRisk } from "../lib/ui/trustRiskActivation.ts";
import { activateUnifiedDecision } from "../lib/ui/unifiedDecisionActivation.ts";
import { resolveActivatedBriefPresentation } from "../lib/ui/activatedDecisionBriefPresentation.ts";
import { optimizeVerdictSurface } from "../lib/ui/verdictSurfaceOptimization.ts";

const base = {
  extensions: [],
  image: "",
  rating: 4.7,
  reviewsCount: 820,
  availability: "In stock",
  shipping: "Free delivery",
};

const trustedLead = {
  ...base,
  id: 1,
  link: "https://shop.example/trusted",
  title: "Samsung Galaxy S24 Ultra 512GB 200MP Pro Camera 5000mAh Android 14",
  store: "Coolblue",
  price: 899,
  oldPrice: 1099,
  priceTrend: "down",
};

const peerOffer = {
  ...base,
  id: 2,
  link: "https://shop.example/peer",
  title: trustedLead.title,
  store: "MediaMarkt",
  price: 929,
  oldPrice: 1049,
  priceTrend: "down",
};

const buyTray = [trustedLead, peerOffer];

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
  const unifiedDecision = activateUnifiedDecision({
    institutionalVerdict: "BUY READY",
    isLeadProduct: isLead,
    rankingRationaleLine: "Ranked first — trust and seller signals lead this tray.",
    discountTruth,
    buyWait,
    priceTarget,
    alternativeAdvantage,
    categoryIntelligence,
    intentIntelligence,
    trustRisk,
  });
  return {
    discountTruth,
    buyWait,
    priceTarget,
    categoryIntelligence,
    alternativeAdvantage,
    intentIntelligence,
    trustRisk,
    unifiedDecision,
  };
}

const exposureSrc = readFileSync(join(process.cwd(), "lib/ui/intelligenceExposureActivation.ts"), "utf8");
assert.ok(exposureSrc.includes("lineCompetesWithBand"), "phase 26 band competition guard");
assert.ok(exposureSrc.includes("buildEvidenceChips"), "evidence chips builder");
assert.ok(!exposureSrc.includes("mergeBuyWaitChip"), "abstract metric chips removed from card");

const cardBody = readFileSync(join(process.cwd(), "components/search/IntelligenceCardBody.tsx"), "utf8");
assert.ok(cardBody.includes("summary-line--hero"), "hero summary styling");
assert.ok(cardBody.includes("showLegacyQuantVerdict"), "legacy quant verdict hidden when coherent");

const layers = buildLayers(trustedLead, buyTray, "samsung galaxy s24 ultra best camera", true);
const brief = {
  headline: "Buy lead",
  recommendation: {
    label: "Top pick",
    title: trustedLead.title,
    store: trustedLead.store,
    link: trustedLead.link,
    price: trustedLead.price,
  },
  why: [],
  alternatives: [],
  discountNote: null,
  confidence: 0.8,
  sparseTrayWarning: null,
  explanation: "Institutional brief supports checkout.",
  buyReasoning: "Trust and discount posture support moving forward.",
  riskSignals: ["Confirm warranty terms."],
};
const activatedBrief = resolveActivatedBriefPresentation(brief, "BUY READY");
const optimizedSurface = optimizeVerdictSurface({
  verdict: "BUY READY",
  fallbackReason: "Lead clears trust checks.",
  decisionBrief: brief,
});

const exposure = activateIntelligenceExposure({
  verdict: "BUY READY",
  alignmentScore: 88,
  isLeadProduct: true,
  decisionBrief: brief,
  activatedBrief,
  rankingRationaleLine: "Ranked first — trust and seller signals lead this tray.",
  optimizedSurface,
  ...layers,
});

const hero = exposure.summaryLines[0] ?? "";
assert.ok(hero.length > 0, "hero summary present");
assert.ok(!/\bbuy now\b/i.test(hero), "hero does not repeat unified buy-now language");
assert.ok(!/\d{1,3}\s*%/.test(hero), "hero avoids naked decision percentages");
assert.ok(!hero.toLowerCase().includes("unified"), "hero avoids unified narrative");

assert.equal(exposure.expandSlots.length, 4, "four expand slots preserved");
assert.ok(exposure.expandSlots[0]?.startsWith("Intent ·"), "expand slot 1 intent prefix");
assert.ok(exposure.expandSlots[1]?.startsWith("Trust ·"), "expand slot 2 trust prefix");
assert.ok(exposure.expandSlots[2]?.startsWith("Competitive ·"), "expand slot 3 competitive prefix");
assert.ok(exposure.expandSlots[3]?.startsWith("Price ·"), "expand slot 4 price prefix");

assert.ok(exposure.chips.length >= 2 && exposure.chips.length <= 3, "evidence chips capped");
assert.ok(
  exposure.chips.every((c) => c.label.startsWith("✓") || c.label.startsWith("⚠")),
  "chips use evidence markers"
);
assert.ok(
  exposure.chips.some((c) => /Trusted Seller|Ranked First|Buy Window|Genuine Discount|Intent Match/i.test(c.label)),
  "BUY evidence chips reinforce verdict"
);
assert.ok(
  !exposure.chips.some((c) => /\bTrust\s+\d+%|\bBUY NOW\s*·/i.test(c.label)),
  "no abstract metric chips on card"
);

const chipLabels = exposure.chips.map((c) => c.label.toLowerCase()).join(" ");
assert.ok(!chipLabels.includes(hero.toLowerCase().slice(0, 18)), "hero not duplicated as chip");

assert.equal(exposure.drawerHero.finalDecision, layers.unifiedDecision.finalDecision);
assert.ok(exposure.drawerModules.length >= 7, "drawer depth preserved");

const trayCtx = buildTrayCoherenceContext({
  searchMeta: {
    verdictIntelligence: {
      version: "phase10-v1",
      verdict: "BUY READY",
      confidence: 0.8,
      rationale: "Lead clears trust checks.",
      strengths: [],
      warnings: [],
      factorTrace: {},
    },
    executedRanking: {
      version: "phase13.4-v1",
      executed: true,
      candidateCount: 2,
      rerankedCount: 2,
      executionConfidence: 0.72,
      executionMode: "ready",
      rankingChanges: [],
      rankingSummary: "Ranked first after controlled execution.",
      rankingWarnings: [],
    },
  },
  decisionBrief: brief,
});

const coherence = activateProductDecisionCoherence({
  product: trustedLead,
  list: buyTray,
  rank: 0,
  tray: trayCtx,
  searchQuery: "samsung galaxy s24 ultra best camera",
});

assert.equal(coherence.verdict, "BUY READY", "band remains institutional authority");
assert.ok(!coherence.summaryLines[0]?.toLowerCase().includes("buy now"), "card summary supports band without competing label");
assert.ok(
  coherence.intelligenceExposure.chips.some((c) => /Ranked First/i.test(c.label)),
  "ranking moved to evidence chip"
);
assert.ok(
  coherence.rankingRationaleLine.includes("Ranked first") ||
    coherence.intelligenceExposure.chips.some((c) => /Ranked First/i.test(c.label)),
  "ranking signal still exposed"
);
assert.ok(coherence.unifiedDecision.finalDecision.length > 0, "phase 23 preserved in drawer");
assert.ok(
  !coherence.drawerDecisionLane.toLowerCase().includes("buy now ·"),
  "drawer lane uses hero not unified summary"
);

console.log("phase260-unified-decision-surface: ok");
