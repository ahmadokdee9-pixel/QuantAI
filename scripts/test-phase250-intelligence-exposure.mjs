#!/usr/bin/env node
/**
 * Phase 25.0 — Intelligence Exposure Activation tests (offline, no network).
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

// ── Guards ─────────────────────────────────────────────────────────────────────
const exposureSrc = readFileSync(join(process.cwd(), "lib/ui/intelligenceExposureActivation.ts"), "utf8");
assert.ok(!exposureSrc.includes("buildDeterministicRanking"), "no ranking changes");
assert.ok(!exposureSrc.includes("openai"), "no new AI");
assert.ok(!exposureSrc.includes("activateUnifiedDecision("), "exposure does not re-run unified engine");

const coherenceSrc = readFileSync(join(process.cwd(), "lib/ui/decisionCoherenceActivation.ts"), "utf8");
assert.ok(coherenceSrc.includes("activateIntelligenceExposure"), "coherence wires exposure layer");
assert.ok(coherenceSrc.includes("intelligenceExposure"), "coherent decision exposes exposure");

const cardBody = readFileSync(join(process.cwd(), "components/search/IntelligenceCardBody.tsx"), "utf8");
assert.ok(!cardBody.includes("qa-ref-intel-card__exposure-panel"), "no new card panels");
assert.ok(cardBody.includes("intelligenceExposure"), "card consumes exposure");

const route = readFileSync(join(process.cwd(), "app/api/search/route.ts"), "utf8");
assert.ok(!route.includes("intelligenceExposureActivation"), "search route unchanged");

// ── Exposure builder ───────────────────────────────────────────────────────────
const layers = buildLayers(trustedLead, buyTray, "samsung galaxy s24 ultra best camera", true);
const brief = {
  headline: "Buy lead",
  recommendation: { label: "Top pick", title: trustedLead.title, store: trustedLead.store, link: trustedLead.link, price: trustedLead.price },
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
  decisionBrief: brief,
  activatedBrief,
  rankingRationaleLine: "Ranked first — trust and seller signals lead this tray.",
  optimizedSurface,
  ...layers,
});

assert.ok(exposure.summaryLines[0]?.includes("Buy now"), "summary dominated by unified decision");
assert.equal(exposure.expandSlots.length, 4, "four fixed expand slots");
assert.ok(exposure.expandSlots[0]?.length > 0, "slot 1 intent");
assert.ok(/trust|risk|seller/i.test(exposure.expandSlots[1] ?? ""), "slot 2 trust/risk");
assert.ok(exposure.expandSlots[2]?.length > 0, "slot 3 competitive");
assert.ok(exposure.expandSlots[3]?.length > 0, "slot 4 price opportunity");
assert.equal(exposure.smartDecisionLines.length, 3, "three smart decision lines");
assert.ok(exposure.chips.length >= 2 && exposure.chips.length <= 3, "chips capped at three");
assert.ok(
  exposure.chips.some((c) => /Genuine|Likely|Inflated|Uncertain/i.test(c.label)),
  "discount chip present"
);
assert.ok(
  exposure.chips.some((c) => /BUY NOW|WAIT|COMPARE/i.test(c.label)),
  "buy/wait chip present"
);
assert.ok(
  exposure.chips.some((c) => /Trust|Risk/i.test(c.label)),
  "trust/risk chip present"
);

const chipLabels = exposure.chips.map((c) => c.label.toLowerCase()).join(" ");
assert.ok(!chipLabels.includes(exposure.summaryLines[0]?.toLowerCase().slice(0, 20) ?? "___"), "summary not duplicated as chip");

assert.equal(exposure.drawerHero.finalDecision, layers.unifiedDecision.finalDecision);
assert.ok(exposure.drawerHero.finalReasoning.includes("Unified recommendation"), "drawer hero uses unified reasoning");
assert.ok(exposure.drawerModules.length >= 7, "drawer modules expose layers");
assert.equal(exposure.drawerModules[0]?.id, "unified", "module 1 unified");
assert.equal(exposure.drawerModules.find((m) => m.id === "factors")?.bullets.length, 8, "factor trace capped at 8");

// ── Coherence integration ──────────────────────────────────────────────────────
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

assert.equal(coherence.verdict, "BUY READY", "phase 14 verdict preserved");
assert.ok(coherence.intelligenceExposure.summaryLines[0]?.includes("Buy now"), "coherence summary unified-dominant");
assert.equal(coherence.expandedSignals.length, 4, "coherence expanded uses four slots");
assert.equal(coherence.smartDecisionLines.length, 3, "coherence smart lines capped at three");
assert.ok(coherence.unifiedDecision.finalDecision.length > 0, "phase 23 layer preserved");
assert.ok(coherence.trustRisk.trustScore > 0, "phase 22 layer preserved");

console.log("phase250-intelligence-exposure-activation: ok");
