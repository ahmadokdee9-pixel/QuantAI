#!/usr/bin/env node
/**
 * Phase 10.7 — Personalization Intelligence tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyPersonalizationIntelligence } from "../lib/intelligence/personalizationEngine.ts";
import { applyIntentAlignmentIntelligence } from "../lib/intelligence/intentAlignmentEngine.ts";
import { applyConfidenceIntelligence } from "../lib/intelligence/confidenceEngine.ts";
import { applyCompetitiveIntelligence } from "../lib/intelligence/competitiveIntelligenceEngine.ts";
import { applyMarketContextIntelligence } from "../lib/intelligence/marketContextEngine.ts";
import { applyAlternativeIntelligence } from "../lib/intelligence/alternativeIntelligenceEngine.ts";
import { applyExplainabilityIntelligence } from "../lib/intelligence/explainabilityEngine.ts";
import { applyVerdictIntelligence } from "../lib/intelligence/verdictEngine.ts";
import { applyPhase95CommerceMemory } from "../lib/intelligence/phase95CommerceMemory.ts";
import { applyPhase93TrustDiscountHardening } from "../lib/intelligence/phase93TrustDiscountHardening.ts";
import { applyPhase92TrayIntegrity } from "../lib/search/phase92TrayIntegrity.ts";
import { applySearchIntelligenceUpgrade } from "../lib/search/searchIntelligenceUpgrade.ts";
import { buildPhase94QueryIntelligence } from "../lib/search/phase94QueryIntelligence.ts";
import { extractSearchIntent } from "../lib/search/intentExtractionEngine.ts";
import { EMPTY_COMMERCE_SESSION_MEMORY } from "../lib/intelligence/commerceSessionMemory.ts";

const VALID_TIERS = new Set(["VERY_HIGH", "HIGH", "MEDIUM", "LOW", "VERY_LOW"]);

const APPLE_SESSION = {
  version: 1,
  preferredBrands: ["apple"],
  styleTags: ["trusted"],
  categoryAffinity: { audio: 4, laptop: 2 },
  priceComfortCenter: 240,
  priceComfortSamples: 5,
  emotionalToneTags: [],
  aestheticsRecurring: [],
  lastPersonas: [],
  interactionCount: 6,
};

let linkSeq = 0;
function p(title, store, price, extra = {}) {
  linkSeq += 1;
  return {
    title,
    store,
    price,
    link: extra.link ?? `https://example.com/item-${linkSeq}`,
    image: "",
    rating: 4.3,
    reviewsCount: extra.reviewsCount ?? 80,
    extensions: extra.extensions ?? [],
    oldPrice: extra.oldPrice ?? null,
    shipping: null,
    availability: extra.availability ?? "In stock",
    qiComposite: extra.qiComposite ?? 78,
    qiCategory: extra.qiCategory ?? "audio",
    qiBuyingDecision: { confidence: extra.qiComposite ?? 78, action: "STRONG_VALUE" },
  };
}

function fullPipeline(query, tray, session = EMPTY_COMMERCE_SESSION_MEMORY) {
  const phase94 = buildPhase94QueryIntelligence(query);
  const intent = extractSearchIntent(query, phase94.canonicalQuery);
  const upgraded = applySearchIntelligenceUpgrade(tray, query, phase94.canonicalQuery);
  const phase92 = applyPhase92TrayIntegrity(upgraded.products, query, intent, phase94.canonicalQuery);
  const phase93 = applyPhase93TrustDiscountHardening(phase92.products, query, {
    decisionBrief: upgraded.meta.decisionBrief,
    baseDiscount: upgraded.meta.discountIntelligence,
  });
  const phase95 = applyPhase95CommerceMemory(phase93.products, query, {
    canonicalQuery: phase94.canonicalQuery,
    sessionMemory: session,
    queryIntelligence: phase94.meta,
    intent,
    decisionBrief: phase93.decisionBrief,
  });
  const beforeOrder = phase95.products.map((x) => x.link);
  const verdict = applyVerdictIntelligence({
    query,
    products: phase95.products,
    decisionBrief: phase95.decisionBrief,
    phase93: phase93.meta,
    phase92: phase92.meta,
    queryIntelligence: phase94.meta,
    commerceMemory: phase95.meta,
    comparison: upgraded.meta.comparisonIntelligence,
    intent,
    canonicalQuery: phase94.canonicalQuery,
    sparse: upgraded.meta.sparseResult,
    trustRanking: upgraded.meta.trustRanking,
  });
  const explained = applyExplainabilityIntelligence({
    phase92: phase92.meta,
    phase93: phase93.meta,
    queryIntelligence: phase94.meta,
    commerceMemory: phase95.meta,
    verdictIntelligence: verdict.meta,
    decisionBrief: verdict.decisionBrief,
  });
  const alt = applyAlternativeIntelligence({
    products: phase95.products,
    decisionBrief: explained.decisionBrief,
    phase93: phase93.meta,
    comparison: upgraded.meta.comparisonIntelligence,
    queryIntelligence: phase94.meta,
    commerceMemory: phase95.meta,
    verdictIntelligence: explained.verdictIntelligence,
    explainability: explained.meta,
  });
  const market = applyMarketContextIntelligence({
    products: phase95.products,
    decisionBrief: alt.decisionBrief,
    phase93: phase93.meta,
    sparse: upgraded.meta.sparseResult,
    verdictIntelligence: explained.verdictIntelligence,
    explainability: explained.meta,
    alternativeIntelligence: alt.meta,
  });
  const competitive = applyCompetitiveIntelligence({
    products: phase95.products,
    decisionBrief: market.decisionBrief,
    phase93: phase93.meta,
    verdictIntelligence: explained.verdictIntelligence,
    explainability: explained.meta,
    alternativeIntelligence: alt.meta,
    comparison: upgraded.meta.comparisonIntelligence,
    marketContext: market.meta,
  });
  const confidence = applyConfidenceIntelligence({
    products: phase95.products,
    decisionBrief: competitive.decisionBrief,
    phase92: phase92.meta,
    phase93: phase93.meta,
    sparse: upgraded.meta.sparseResult,
    verdictIntelligence: explained.verdictIntelligence,
    explainability: explained.meta,
    alternativeIntelligence: alt.meta,
    marketContext: market.meta,
    competitiveIntelligence: competitive.meta,
  });
  const alignment = applyIntentAlignmentIntelligence({
    products: phase95.products,
    decisionBrief: confidence.decisionBrief,
    queryIntelligence: phase94.meta,
    commerceMemory: phase95.meta,
    verdictIntelligence: explained.verdictIntelligence,
    explainability: explained.meta,
    alternativeIntelligence: alt.meta,
    marketContext: market.meta,
    competitiveIntelligence: competitive.meta,
    confidenceIntelligence: confidence.meta,
  });
  const personalization = applyPersonalizationIntelligence({
    products: phase95.products,
    decisionBrief: alignment.decisionBrief,
    queryIntelligence: phase94.meta,
    commerceMemory: phase95.meta,
    verdictIntelligence: explained.verdictIntelligence,
    explainability: explained.meta,
    alternativeIntelligence: alt.meta,
    marketContext: market.meta,
    competitiveIntelligence: competitive.meta,
    confidenceIntelligence: confidence.meta,
    intentAlignment: alignment.meta,
  });
  return { personalization, beforeOrder, verdictMeta: verdict.meta };
}

function assertTierMatchesScore(meta) {
  const s = meta.personalizationScore;
  if (s >= 90) assert.equal(meta.personalizationTier, "VERY_HIGH");
  else if (s >= 75) assert.equal(meta.personalizationTier, "HIGH");
  else if (s >= 60) assert.equal(meta.personalizationTier, "MEDIUM");
  else if (s >= 40) assert.equal(meta.personalizationTier, "LOW");
  else assert.equal(meta.personalizationTier, "VERY_LOW");
}

const airpodsTray = [
  p("Apple AirPods Pro 2 USB-C", "bol.com", 229, { qiComposite: 84 }),
  p("Apple AirPods Pro 2 Mega Deal", "fruugo", 39, { oldPrice: 199, qiComposite: 74 }),
  p("Apple AirPods Pro 2", "coolblue", 239, { qiComposite: 82 }),
  p("Apple AirPods Pro 2", "amazon.nl", 245, { qiComposite: 80 }),
  p("Apple AirPods Pro 2", "mediamarkt", 249, { qiComposite: 78 }),
];

const sparse = fullPipeline("sony headphones", [p("Sony WH-1000XM5", "bol.com", 279)]);
assert.equal(sparse.personalization.meta.version, "phase10.7-v1");
assert.ok(sparse.personalization.meta.sparseMemory, "empty session should be sparse");
assert.ok(["LOW", "VERY_LOW", "MEDIUM"].includes(sparse.personalization.meta.personalizationTier));
assert.ok(sparse.personalization.meta.personalizationScore <= 74);
assert.ok(sparse.personalization.meta.conflicts.some((c) => /sparse session memory/i.test(c)));

const emptyAirpods = fullPipeline("apple airpods pro 2", airpodsTray);
const richAirpods = fullPipeline("apple airpods pro 2", airpodsTray, APPLE_SESSION);
assert.ok(!richAirpods.personalization.meta.sparseMemory, "rich session should not be sparse");
assert.ok(richAirpods.personalization.meta.brandAffinity >= emptyAirpods.personalization.meta.brandAffinity);
assert.ok(richAirpods.personalization.meta.personalizationScore >= emptyAirpods.personalization.meta.personalizationScore);

assert.ok(VALID_TIERS.has(richAirpods.personalization.meta.personalizationTier));
assertTierMatchesScore(richAirpods.personalization.meta);
assert.ok(richAirpods.personalization.meta.summary.length > 20);
assert.ok(Array.isArray(richAirpods.personalization.meta.preferenceDrivers));
assert.ok(richAirpods.personalization.meta.budgetAlignment >= 0);
assert.ok(richAirpods.personalization.meta.qualityPreferenceAlignment >= 0);
assert.ok(richAirpods.personalization.meta.valuePreferenceAlignment >= 0);
assert.deepEqual(
  richAirpods.personalization.products.map((x) => x.link),
  richAirpods.beforeOrder,
  "tray order unchanged"
);
assert.ok(richAirpods.personalization.decisionBrief?.personalizationSummary);
assert.equal(
  JSON.stringify(richAirpods.verdictMeta),
  JSON.stringify(richAirpods.verdictMeta),
  "verdict unchanged"
);

const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("applyPersonalizationIntelligence"));
assert.ok(route.includes("personalization: personalizationIntelligence.meta"));
assert.ok(route.includes("phase107_personalization"));

const src = readFileSync(join(process.cwd(), "lib", "intelligence", "personalizationEngine.ts"), "utf8");
assert.ok(!/\bfetch\s*\(/.test(src));
assert.ok(!/serpapi/i.test(src));

console.log("phase10.7-personalization: ok");
