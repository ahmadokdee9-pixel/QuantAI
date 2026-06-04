#!/usr/bin/env node
/**
 * Phase 20.0 — Category Intelligence Activation Layer tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateCategoryIntelligence,
  mergeCategoryIntelligenceExpandedLines,
  mergeCategoryIntelligenceExpandedSignals,
} from "../lib/ui/categoryIntelligenceActivation.ts";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";

const base = {
  extensions: [],
  image: "",
  rating: 4.6,
  reviewsCount: 420,
  availability: "In stock",
  shipping: "Free delivery",
  store: "Coolblue",
  price: 999,
};

const phone = {
  ...base,
  id: 1,
  link: "https://shop.example/phone",
  title: "Samsung Galaxy S24 Ultra 512GB 200MP Pro Camera 5000mAh Android 14",
};

const laptop = {
  ...base,
  id: 2,
  link: "https://shop.example/laptop",
  title: "Lenovo ThinkPad X1 Carbon Ultra 7 32GB RAM RTX 4060 18 hour battery upgradeable",
};

const tv = {
  ...base,
  id: 3,
  link: "https://shop.example/tv",
  title: "LG OLED TV 55 inch 120Hz HDMI 2.1 Dolby Vision HDR10+ Game Mode",
};

const headphones = {
  ...base,
  id: 4,
  link: "https://shop.example/headphones",
  title: "Sony WH-1000XM5 ANC Headphones 30 hour battery LDAC comfort microphone array",
};

const generic = {
  ...base,
  id: 5,
  link: "https://shop.example/generic",
  title: "Universal storage box medium",
};

// ── UI wiring guards ───────────────────────────────────────────────────────────
const coherenceSrc = readFileSync(join(process.cwd(), "lib/ui/decisionCoherenceActivation.ts"), "utf8");
assert.ok(coherenceSrc.includes("activateCategoryIntelligence"), "coherence activates category intelligence");
assert.ok(coherenceSrc.includes("categoryIntelligence"), "coherent decision exposes category intelligence");

const cardBody = readFileSync(join(process.cwd(), "components/search/IntelligenceCardBody.tsx"), "utf8");
assert.ok(!cardBody.includes("qa-ref-intel-card__category-panel"), "no new UI panels");

const route = readFileSync(join(process.cwd(), "app/api/search/route.ts"), "utf8");
assert.ok(!route.includes("categoryIntelligenceActivation"), "search route unchanged");
assert.ok(route.includes("executeControlledRanking"), "ranking execution preserved");
assert.ok(route.includes("applyVerdictIntelligence"), "verdict system preserved");

const categorySrc = readFileSync(join(process.cwd(), "lib/ui/categoryIntelligenceActivation.ts"), "utf8");
assert.ok(!categorySrc.includes("buildDeterministicRanking"), "no ranking engine changes");
assert.ok(!categorySrc.includes("semanticRerankSearchResults"), "no search sorting changes");
assert.ok(!categorySrc.includes("openai"), "no new AI generation");

assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/alternativeAdvantageActivation.ts"), "utf8").includes(
    "activateAlternativeAdvantage"
  ),
  "phase 19 alternative advantage preserved"
);

// ── Category detection + scoring ───────────────────────────────────────────────
const phoneIntel = activateCategoryIntelligence({ product: phone });
assert.equal(phoneIntel.segment, "phones");
assert.ok(phoneIntel.categoryScore > 0);
assert.equal(phoneIntel.dimensions.length, 5);
assert.ok(phoneIntel.dimensions.some((d) => d.key === "camera_quality"));
assert.ok(phoneIntel.dimensions.some((d) => d.key === "software_longevity"));
assert.ok(phoneIntel.categoryReasons.length > 0);

const laptopIntel = activateCategoryIntelligence({ product: laptop });
assert.equal(laptopIntel.segment, "laptops");
assert.ok(laptopIntel.dimensions.some((d) => d.key === "cpu_value"));
assert.ok(laptopIntel.dimensions.some((d) => d.key === "upgrade_potential"));

const tvIntel = activateCategoryIntelligence({ product: tv });
assert.equal(tvIntel.segment, "tvs");
assert.ok(tvIntel.dimensions.some((d) => d.key === "display_technology"));
assert.ok(tvIntel.dimensions.some((d) => d.key === "hdr_quality"));

const headphoneIntel = activateCategoryIntelligence({ product: headphones });
assert.equal(headphoneIntel.segment, "headphones");
assert.ok(headphoneIntel.dimensions.some((d) => d.key === "anc_quality"));
assert.ok(headphoneIntel.dimensions.some((d) => d.key === "microphone_quality"));

const genericIntel = activateCategoryIntelligence({ product: generic });
assert.equal(genericIntel.segment, null);
assert.equal(genericIntel.categoryScore, 0);

const expanded = mergeCategoryIntelligenceExpandedSignals(["Existing signal"], phoneIntel, 3);
assert.ok(expanded.some((line) => line.includes("Camera") || line.includes("category")), "expanded signals merged");
const smart = mergeCategoryIntelligenceExpandedLines(["Existing decision"], phoneIntel, 3);
assert.ok(smart.length > 0, "smart decision lines merged");

// ── Phase 14 preservation ────────────────────────────────────────────────────────
const tray = buildTrayCoherenceContext({
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
      title: phone.title,
      store: phone.store,
      link: phone.link,
      price: phone.price,
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
  product: phone,
  list: [phone, laptop],
  rank: 0,
  tray,
  searchQuery: "samsung galaxy s24",
});
assert.equal(coherence.verdict, "BUY READY", "phase 14.0 verdict authority preserved");
assert.ok(
  coherence.summaryLines.some((line) => line.includes("Ranked first")) ||
    coherence.rankingRationaleLine.includes("Ranked first"),
  "phase 14.1 ranking rationale preserved"
);
assert.ok(coherence.categoryIntelligence.segment === "phones", "category intelligence bound on coherent decision");
assert.ok(
  coherence.expandedSignals.some((line) => line.includes("Camera") || line.includes("category")),
  "category intelligence exposed in expanded signals"
);

console.log("phase200-category-intelligence-activation: ok");
