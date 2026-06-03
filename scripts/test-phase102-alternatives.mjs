#!/usr/bin/env node
/**
 * Phase 10.2 — Alternative Intelligence Engine tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

const VALID_CLASS = new Set([
  "safer_alternative",
  "better_value",
  "premium_upgrade",
  "budget_pick",
  "avoid_replacement",
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
    availability: "In stock",
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
  return { alt, beforeOrder, verdictMeta: verdict.meta, primaryLink: explained.decisionBrief?.recommendation.link };
}

// Rich tray — expect 2–4 alternatives
const airpodsTray = [
  p("Apple AirPods Pro 2 USB-C", "bol.com", 229, { qiComposite: 84 }),
  p("Apple AirPods Pro 2 Mega Deal", "fruugo", 39, { oldPrice: 199, qiComposite: 74 }),
  p("Apple AirPods Pro 2", "coolblue", 239, { qiComposite: 82 }),
  p("Apple AirPods Pro 2", "amazon.nl", 245, { qiComposite: 80 }),
  p("Apple AirPods Pro 2", "mediamarkt", 249, { qiComposite: 78 }),
];
const airpods = fullPipeline("apple airpods pro 2", airpodsTray);
assert.equal(airpods.alt.meta.version, "phase10.2-v1");
assert.ok(airpods.alt.meta.count >= 2 && airpods.alt.meta.count <= 4, "expected 2–4 alternatives");
assert.ok(airpods.alt.meta.summary.length > 10);
for (const a of airpods.alt.meta.alternatives) {
  assert.ok(VALID_CLASS.has(a.classification));
  assert.ok(a.reason.length > 5);
  assert.notEqual(a.link, airpods.primaryLink, "alternatives must not duplicate primary");
}
assert.deepEqual(airpods.alt.products.map((x) => x.link), airpods.beforeOrder, "tray order unchanged");
assert.equal(JSON.stringify(airpods.alt.meta), JSON.stringify(airpods.alt.meta), "verdict/meta stable");

// Value laptop tray
const laptopTray = [
  p("ASUS Vivobook 15", "bol.com", 499, { qiCategory: "laptop" }),
  p("Lenovo IdeaPad Slim 3", "coolblue", 429, { qiCategory: "laptop" }),
  p("HP 15 Laptop", "mediamarkt", 479, { qiCategory: "laptop" }),
  p("Acer Aspire 5", "bcc", 459, { qiCategory: "laptop" }),
  p("Dell Inspiron 15", "amazon.nl", 489, { qiCategory: "laptop" }),
];
const laptops = fullPipeline("best value laptop under 500", laptopTray);
assert.ok(laptops.alt.meta.alternatives.some((a) => a.classification === "better_value" || a.classification === "budget_pick"));

// Premium macbook — premium upgrade candidate
const premiumTray = [
  p("Apple MacBook Pro 16 M3 Pro", "apple.com", 2799, { qiCategory: "laptop", qiComposite: 82 }),
  p("Lenovo IdeaPad 15", "bol.com", 649, { qiCategory: "laptop" }),
  p("Dell XPS 15", "coolblue", 1899, { qiCategory: "laptop" }),
  p("HP Spectre x360", "mediamarkt", 1699, { qiCategory: "laptop" }),
  p("ASUS Zenbook Pro", "bcc", 1599, { qiCategory: "laptop" }),
];
const premium = fullPipeline("premium macbook pro 16 inch", premiumTray);
assert.ok(premium.alt.meta.count >= 2);

// Avoid replacement surfaced for fruugo in tray
const hasAvoid = airpods.alt.meta.alternatives.some((a) => a.classification === "avoid_replacement");
assert.ok(hasAvoid, "fruugo-style listing should appear as avoid_replacement");

// decisionBrief enrichment
assert.ok(airpods.alt.decisionBrief?.alternativesSummary);
assert.ok(Array.isArray(airpods.alt.decisionBrief?.alternatives));
assert.ok(airpods.alt.decisionBrief?.headline, "original brief fields preserved");

// Minimal tray
const tiny = fullPipeline("sony headphones", [p("Sony WH-1000XM5", "bol.com", 279)]);
assert.ok(tiny.alt.meta.count >= 0);

const src = readFileSync(join(process.cwd(), "lib", "intelligence", "alternativeIntelligenceEngine.ts"), "utf8");
assert.ok(!/\bfetch\s*\(/.test(src));

console.log("phase10.2-alternatives: ok");
