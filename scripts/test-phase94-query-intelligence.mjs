#!/usr/bin/env node
/**
 * Phase 9.4 — Query intelligence hardening tests (offline, no network).
 */
import assert from "node:assert/strict";
import { buildPhase94QueryIntelligence } from "../lib/search/phase94QueryIntelligence.ts";

function qi(query) {
  return buildPhase94QueryIntelligence(query);
}

// ── Arabic query ──────────────────────────────────────────────────────────────
const arabicHeadphones = qi("افضل سماعة للرياضة");
assert.equal(arabicHeadphones.meta.version, "phase9.4-v1");
assert.equal(arabicHeadphones.meta.originalQuery, "افضل سماعة للرياضة");
assert.ok(["arabic", "mixed"].includes(arabicHeadphones.meta.language));
assert.ok(
  /headphones|fitness|gym|workout|best/i.test(arabicHeadphones.meta.canonicalQuery),
  "Arabic sport headphones should gloss into English upstream tokens"
);
assert.ok(arabicHeadphones.meta.confidence >= 0.4);

// ── Mixed Arabic/English query ────────────────────────────────────────────────
const mixedPhone = qi("iphone 15 pro max اصلي under 1200");
assert.equal(mixedPhone.meta.detectedIntent.brand, "apple");
assert.ok(mixedPhone.meta.detectedIntent.model?.includes("iphone"), "mixed query keeps iphone model");
assert.equal(mixedPhone.meta.constraints.budget.active, true);
assert.ok(mixedPhone.meta.constraints.budget.maxPrice === 1200);
assert.ok(/iphone|apple/i.test(mixedPhone.meta.canonicalQuery));

// ── Compare query (English) ───────────────────────────────────────────────────
const compareEn = qi("compare airpods pro vs airpods 4");
assert.deepEqual(compareEn.meta.compareEntities, ["airpods pro", "airpods 4"]);
assert.equal(compareEn.meta.detectedIntent.comparisonIntent, true);
assert.equal(compareEn.meta.detectedIntent.skuIntent, "compare");
assert.ok(/airpods/i.test(compareEn.meta.canonicalQuery));

// ── Compare query (Arabic) ────────────────────────────────────────────────────
const compareAr = qi("مقارنة airpods pro و airpods 4");
assert.deepEqual(compareAr.meta.compareEntities, ["airpods pro", "airpods 4"]);
assert.equal(compareAr.meta.detectedIntent.comparisonIntent, true);

// ── Budget query ──────────────────────────────────────────────────────────────
const budget = qi("gaming monitor 144hz 27 inch under 500");
assert.equal(budget.meta.constraints.budget.active, true);
assert.equal(budget.meta.constraints.budget.maxPrice, 500);
assert.equal(budget.meta.constraints.size, "27 inch");
assert.ok(["budget", "value"].includes(budget.meta.detectedIntent.priceIntent));

// ── Exact SKU query ───────────────────────────────────────────────────────────
const exactSku = qi("samsung galaxy s24 ultra 256gb");
assert.equal(exactSku.meta.detectedIntent.skuIntent, "exact");
assert.equal(exactSku.meta.detectedIntent.brand, "samsung");
assert.ok(/s24|galaxy|256/i.test(exactSku.meta.canonicalQuery));
assert.ok(exactSku.meta.confidence >= 0.5);

// ── Premium query ─────────────────────────────────────────────────────────────
const premium = qi("premium luxury watch swiss automatic");
assert.equal(premium.meta.detectedIntent.priceIntent, "premium");
assert.ok(premium.meta.detectedIntent.category === "watch" || premium.meta.detectedIntent.productType === "watch");

// ── Discount query ────────────────────────────────────────────────────────────
const discount = qi("airpods pro تخفيض ديسكاونت");
assert.equal(discount.meta.detectedIntent.priceIntent, "discount");
assert.ok(/airpods|apple/i.test(discount.meta.canonicalQuery));

// ── Product-category ambiguity ────────────────────────────────────────────────
const ambiguous = qi("apple");
assert.ok(ambiguous.meta.detectedIntent.brand === "apple" || ambiguous.meta.detectedIntent.category != null);
assert.ok(ambiguous.meta.confidence < 0.75, "vague single-token query should stay lower confidence");

// ── Protected queries must not collapse upstream ──────────────────────────────
const protectedQueries = [
  "running shoes flat feet men",
  "wireless gaming headset ps5",
  "standing desk",
  "adidas samba og white",
  "best gpu for ai training",
  "monitor for programming 27 inch",
  "mechanical keyboard quiet tactile",
];
for (const q of protectedQueries) {
  const row = qi(q);
  assert.ok(row.meta.canonicalQuery.length >= 8, `${q} upstream should stay substantive`);
  assert.equal(row.meta.originalQuery, q);
}

// ── Meta shape ────────────────────────────────────────────────────────────────
const metaShape = qi("wireless gaming headset ps5").meta;
assert.ok(metaShape.originalQuery);
assert.ok(metaShape.canonicalQuery);
assert.ok(metaShape.detectedIntent);
assert.ok(metaShape.constraints);
assert.ok(typeof metaShape.confidence === "number");

console.log("phase9.4-query-intelligence: ok");
