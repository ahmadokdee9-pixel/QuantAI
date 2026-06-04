#!/usr/bin/env node
/**
 * Phase 21.0 — Intent Intelligence Activation Layer tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { activateAlternativeAdvantage } from "../lib/ui/alternativeAdvantageActivation.ts";
import { activateBuyWait } from "../lib/ui/buyWaitActivation.ts";
import { activateCategoryIntelligence } from "../lib/ui/categoryIntelligenceActivation.ts";
import { activateDiscountTruth } from "../lib/ui/discountTruthActivation.ts";
import {
  activateIntentIntelligence,
  mergeIntentIntelligenceExpandedLines,
  mergeIntentIntelligenceExpandedSignals,
} from "../lib/ui/intentIntelligenceActivation.ts";
import { activatePriceTarget } from "../lib/ui/priceTargetActivation.ts";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";

const base = {
  extensions: [],
  image: "",
  rating: 4.7,
  reviewsCount: 820,
  availability: "In stock",
  shipping: "Free delivery",
  store: "Coolblue",
};

const leadPhone = {
  ...base,
  id: 1,
  link: "https://shop.example/lead-phone",
  title: "Samsung Galaxy S24 Ultra 512GB 200MP Pro Camera 5000mAh Android 14",
  price: 899,
  oldPrice: 1099,
  priceTrend: "down",
};

const altPhone = {
  ...base,
  id: 2,
  link: "https://shop.example/alt-phone",
  title: "Samsung Galaxy S24 Ultra 512GB",
  store: "Unknown Marketplace",
  price: 949,
  oldPrice: 1099,
  priceTrend: "stable",
  rating: 4.2,
  reviewsCount: 90,
};

const tray = [leadPhone, altPhone];

function buildLayers(product, list, searchQuery, isLead) {
  const discountTruth = activateDiscountTruth({ product, list });
  const buyWait = activateBuyWait({
    product,
    list,
    discountTruth,
    institutionalVerdict: "BUY READY",
  });
  const priceTarget = activatePriceTarget({ product, list, discountTruth, buyWait });
  const categoryIntelligence = activateCategoryIntelligence({ product, searchQuery });
  const alternativeAdvantage = activateAlternativeAdvantage({
    product,
    list,
    isLeadProduct: isLead,
    discountTruth,
    buyWait,
  });
  return { discountTruth, buyWait, priceTarget, categoryIntelligence, alternativeAdvantage };
}

// ── UI wiring guards ───────────────────────────────────────────────────────────
const coherenceSrc = readFileSync(join(process.cwd(), "lib/ui/decisionCoherenceActivation.ts"), "utf8");
assert.ok(coherenceSrc.includes("activateIntentIntelligence"), "coherence activates intent intelligence");
assert.ok(coherenceSrc.includes("intentIntelligence"), "coherent decision exposes intent intelligence");

const cardBody = readFileSync(join(process.cwd(), "components/search/IntelligenceCardBody.tsx"), "utf8");
assert.ok(!cardBody.includes("qa-ref-intel-card__intent-panel"), "no new UI panels");

const route = readFileSync(join(process.cwd(), "app/api/search/route.ts"), "utf8");
assert.ok(!route.includes("intentIntelligenceActivation"), "search route unchanged");
assert.ok(route.includes("executeControlledRanking"), "ranking execution preserved");
assert.ok(route.includes("applyVerdictIntelligence"), "verdict system preserved");

const intentSrc = readFileSync(join(process.cwd(), "lib/ui/intentIntelligenceActivation.ts"), "utf8");
assert.ok(!intentSrc.includes("buildDeterministicRanking"), "no ranking engine changes");
assert.ok(!intentSrc.includes("semanticRerankSearchResults"), "no search sorting changes");
assert.ok(!intentSrc.includes("openai"), "no new AI generation");

assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/categoryIntelligenceActivation.ts"), "utf8").includes(
    "activateCategoryIntelligence"
  ),
  "phase 20 category intelligence preserved"
);

// ── Intent detection + fit ─────────────────────────────────────────────────────
const cameraQuery = "best camera phone samsung ultra";
const leadLayers = buildLayers(leadPhone, tray, cameraQuery, true);
const cameraIntent = activateIntentIntelligence({
  product: leadPhone,
  list: tray,
  searchQuery: cameraQuery,
  isLeadProduct: true,
  ...leadLayers,
  rankingRationaleLine: "Ranked first — trust and seller signals lead this tray.",
});

assert.ok(cameraIntent.intentPriorities.some((p) => p.key === "camera"), "camera intent detected");
assert.ok(cameraIntent.intentMatchScore > 0, "intent match score computed");
assert.ok(cameraIntent.intentReasons.length > 0, "intent reasons generated");
assert.ok(
  cameraIntent.intentReasons.some((line) => line.includes("camera") || line.includes("alternatives")),
  "camera or lead advantage reason present"
);

const valueQuery = "cheap gaming laptop best value";
const laptop = {
  ...base,
  id: 3,
  link: "https://shop.example/laptop",
  title: "Lenovo ThinkPad gaming laptop RTX 4060 32GB RAM 120Hz",
  price: 999,
  oldPrice: 1199,
  priceTrend: "down",
};
const valueLayers = buildLayers(laptop, [laptop], valueQuery, true);
const valueIntent = activateIntentIntelligence({
  product: laptop,
  list: [laptop],
  searchQuery: valueQuery,
  isLeadProduct: true,
  ...valueLayers,
});
assert.ok(
  valueIntent.intentPriorities.some((p) => p.key === "value" || p.key === "gaming"),
  "value or gaming intent detected"
);

const ancQuery = "noise cancelling headphones sony";
const headphones = {
  ...base,
  id: 4,
  link: "https://shop.example/headphones",
  title: "Sony WH-1000XM5 ANC Headphones 30 hour battery LDAC",
  price: 249,
  oldPrice: 299,
};
const ancLayers = buildLayers(headphones, [headphones], ancQuery, true);
const ancIntent = activateIntentIntelligence({
  product: headphones,
  list: [headphones],
  searchQuery: ancQuery,
  isLeadProduct: true,
  ...ancLayers,
});
assert.ok(ancIntent.intentPriorities.some((p) => p.key === "anc"), "ANC intent detected");

const emptyIntent = activateIntentIntelligence({
  product: leadPhone,
  list: tray,
  searchQuery: "",
  isLeadProduct: true,
  ...leadLayers,
});
assert.equal(emptyIntent.intentMatchScore, 0, "empty query yields no intent activation");

const expanded = mergeIntentIntelligenceExpandedSignals(["Existing signal"], cameraIntent, 3);
assert.ok(expanded[0]?.includes("camera") || expanded[0]?.includes("alternatives"), "intent merged first in expanded signals");
const smart = mergeIntentIntelligenceExpandedLines(["Existing decision"], cameraIntent, 3);
assert.ok(smart.length > 0, "drawer/smart lines merged");

// ── Phase 14–20 preservation ───────────────────────────────────────────────────
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
  decisionBrief: {
    headline: "Buy lead",
    recommendation: {
      label: "Top pick",
      title: leadPhone.title,
      store: leadPhone.store,
      link: leadPhone.link,
      price: leadPhone.price,
    },
    why: [],
    alternatives: [],
    discountNote: null,
    confidence: 0.8,
    sparseTrayWarning: null,
    explanation: "Institutional brief.",
    buyReasoning: "Trust supports checkout.",
  },
});

const coherence = activateProductDecisionCoherence({
  product: leadPhone,
  list: tray,
  rank: 0,
  tray: trayCtx,
  searchQuery: cameraQuery,
});
assert.equal(coherence.verdict, "BUY READY", "phase 14.0 verdict authority preserved");
assert.ok(
  coherence.summaryLines.some((line) => line.includes("Ranked first")) ||
    coherence.rankingRationaleLine.includes("Ranked first"),
  "phase 14.1 ranking rationale preserved"
);
assert.ok(coherence.categoryIntelligence.segment === "phones", "phase 20 category intelligence preserved");
assert.ok(coherence.intentIntelligence.intentMatchScore > 0, "intent intelligence bound on coherent decision");
assert.ok(
  coherence.expandedSignals.some((line) => line.includes("camera") || line.includes("alternatives")),
  "intent exposed in expanded signals"
);
assert.ok(
  coherence.intelligenceExposure.expandSlots[0]?.includes("camera") ||
    coherence.intelligenceExposure.drawerModules.some((m) => m.id === "intent"),
  "intent exposed in structured expand slot or drawer module"
);

console.log("phase210-intent-intelligence-activation: ok");
