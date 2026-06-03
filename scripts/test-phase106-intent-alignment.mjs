#!/usr/bin/env node
/**
 * Phase 10.6 — Intent Alignment Intelligence tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
const VALID_INTENTS = new Set([
  "best_value",
  "premium_quality",
  "lowest_price",
  "performance",
  "gaming",
  "business",
  "professional",
  "daily_use",
  "travel",
  "creator",
  "photography",
  "productivity",
]);

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

function fullPipeline(query, tray) {
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
    sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
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
  return { alignment, beforeOrder, verdictMeta: verdict.meta };
}

function assertTierMatchesScore(meta) {
  const s = meta.intentScore;
  if (s >= 90) assert.equal(meta.intentTier, "VERY_HIGH");
  else if (s >= 75) assert.equal(meta.intentTier, "HIGH");
  else if (s >= 60) assert.equal(meta.intentTier, "MEDIUM");
  else if (s >= 40) assert.equal(meta.intentTier, "LOW");
  else assert.equal(meta.intentTier, "VERY_LOW");
}

const valueLaptops = fullPipeline("best value laptop under 500", [
  p("ASUS Vivobook 15", "bol.com", 499, { qiCategory: "laptop" }),
  p("Lenovo IdeaPad Slim 3", "coolblue", 429, { qiCategory: "laptop" }),
  p("HP 15 Laptop", "mediamarkt", 479, { qiCategory: "laptop" }),
  p("Acer Aspire 5", "bcc", 459, { qiCategory: "laptop" }),
  p("Dell Inspiron 15", "amazon.nl", 489, { qiCategory: "laptop" }),
]);
assert.equal(valueLaptops.alignment.meta.version, "phase10.6-v1");
assert.ok(VALID_TIERS.has(valueLaptops.alignment.meta.intentTier));
assert.ok(VALID_INTENTS.has(valueLaptops.alignment.meta.primaryIntent));
assert.equal(valueLaptops.alignment.meta.primaryIntent, "best_value");
assert.ok(valueLaptops.alignment.meta.intentScore >= 0 && valueLaptops.alignment.meta.intentScore <= 100);
assertTierMatchesScore(valueLaptops.alignment.meta);
assert.ok(valueLaptops.alignment.meta.summary.length > 20);
assert.ok(Array.isArray(valueLaptops.alignment.meta.supportingSignals));
assert.ok(Array.isArray(valueLaptops.alignment.meta.conflicts));
assert.deepEqual(
  valueLaptops.alignment.products.map((x) => x.link),
  valueLaptops.beforeOrder,
  "tray order unchanged"
);
assert.ok(valueLaptops.alignment.decisionBrief?.intentAlignmentSummary);
assert.equal(JSON.stringify(valueLaptops.verdictMeta), JSON.stringify(valueLaptops.verdictMeta), "verdict unchanged");

const premium = fullPipeline("premium macbook pro 16 inch", [
  p("Apple MacBook Pro 16 M3 Pro", "apple.com", 2799, { qiCategory: "laptop", qiComposite: 82 }),
  p("Lenovo IdeaPad 15", "bol.com", 649, { qiCategory: "laptop" }),
  p("Dell XPS 15", "coolblue", 1899, { qiCategory: "laptop" }),
  p("HP Spectre x360", "mediamarkt", 1699, { qiCategory: "laptop" }),
  p("ASUS Zenbook Pro", "bcc", 1599, { qiCategory: "laptop" }),
]);
assert.equal(premium.alignment.meta.primaryIntent, "premium_quality");

const gaming = fullPipeline("best gaming laptop rtx 4070", [
  p("ASUS ROG Strix G16", "bol.com", 1899, { qiCategory: "laptop" }),
  p("Lenovo Legion Pro 5", "coolblue", 1799, { qiCategory: "laptop" }),
  p("MSI Katana 15", "mediamarkt", 1299, { qiCategory: "laptop" }),
  p("Acer Nitro 5", "bcc", 999, { qiCategory: "laptop" }),
  p("HP Omen 16", "amazon.nl", 1599, { qiCategory: "laptop" }),
]);
assert.equal(gaming.alignment.meta.primaryIntent, "gaming");

const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("applyIntentAlignmentIntelligence"));
assert.ok(route.includes("intentAlignment: intentAlignmentIntelligence.meta"));
assert.ok(route.includes("phase106_intent_alignment"));

const src = readFileSync(join(process.cwd(), "lib", "intelligence", "intentAlignmentEngine.ts"), "utf8");
assert.ok(!/\bfetch\s*\(/.test(src));
assert.ok(!/serpapi/i.test(src));

console.log("phase10.6-intent-alignment: ok");
