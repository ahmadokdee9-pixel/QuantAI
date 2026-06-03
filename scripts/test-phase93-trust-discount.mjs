#!/usr/bin/env node
/**
 * Phase 9.3 — Trust & discount intelligence hardening tests (offline, no network).
 */
import assert from "node:assert/strict";
import {
  applyPhase93TrustDiscountHardening,
  assessFakeDiscountHardened,
  assessProductTrustDiscount,
  assessSuspiciousSeller,
  buildHardenedDiscountIntelligence,
} from "../lib/intelligence/phase93TrustDiscountHardening.ts";
import { buildDiscountIntelligence } from "../lib/intelligence/discountIntelligenceLayer.ts";
import { assessPriceSanity, isHardPriceSanityReject } from "../lib/intelligence/priceSanityEngine.ts";
import { detectFakeDiscountSignals } from "../lib/intelligence/fakeDiscountDetector.ts";
import { applySearchIntelligenceUpgrade } from "../lib/search/searchIntelligenceUpgrade.ts";
import { applyPhase92TrayIntegrity } from "../lib/search/phase92TrayIntegrity.ts";
import { extractSearchIntent } from "../lib/search/intentExtractionEngine.ts";

let linkSeq = 0;
function p(title, store, price, extra = {}) {
  linkSeq += 1;
  return {
    title,
    store,
    price,
    link: extra.link ?? `https://example.com/item-${linkSeq}`,
    image: "",
    rating: 4.1,
    reviewsCount: 12,
    extensions: extra.extensions ?? [],
    oldPrice: extra.oldPrice ?? null,
    shipping: null,
    availability: extra.availability ?? null,
    qiComposite: extra.qiComposite ?? 70,
    qiBuyingDecision: { confidence: extra.qiComposite ?? 70, action: "STRONG_VALUE" },
  };
}

// ── Suspicious aggregator seller ─────────────────────────────────────────────
const airpodsTray = [
  p("Apple AirPods Pro 2 USB-C", "bol.com", 229, { qiComposite: 86 }),
  p("Apple AirPods Pro 2", "fruugo", 27, { oldPrice: 199, extensions: ["70% off"], qiComposite: 74 }),
  p("Apple AirPods Pro 2 USB-C", "coolblue", 239, { qiComposite: 82 }),
];
const fruugo = airpodsTray[1];
const suspicious = assessSuspiciousSeller(fruugo, airpodsTray);
assert.equal(suspicious.suspicious, true, "fruugo steep discount should flag suspicious seller");

const fakeFruugo = assessFakeDiscountHardened(fruugo, airpodsTray);
assert.equal(fakeFruugo.risk, "high", "fruugo inflated anchor should be high fake-discount risk");

// ── Hardened discount excludes suspicious aggregator ─────────────────────────
const assessments = new Map(
  airpodsTray.map((row) => [row.link, assessProductTrustDiscount(row, airpodsTray, "airpods")])
);
const baseDiscount = buildDiscountIntelligence(airpodsTray, "airpods");
const hardened = buildHardenedDiscountIntelligence(airpodsTray, "airpods", assessments);
assert.ok(
  !hardened.bestVerifiedDiscount || hardened.bestVerifiedDiscount.store !== "fruugo",
  "best verified discount must not be fruugo aggregator"
);
assert.ok(
  baseDiscount.offers.some((o) => o.store === "fruugo") || baseDiscount.offers.length === 0,
  "base layer may still surface offers — hardened layer should filter"
);

// ── Trusted discount passes hardening ─────────────────────────────────────────
const trustedTray = [
  p("Sony WH-1000XM5", "coolblue", 279, { oldPrice: 349, qiComposite: 84 }),
  p("Sony WH-1000XM5", "bol.com", 289, { qiComposite: 82 }),
  p("Sony WH-1000XM5", "amazon.nl", 299, { qiComposite: 80 }),
];
const trustedAssessments = new Map(
  trustedTray.map((row) => [row.link, assessProductTrustDiscount(row, trustedTray, "sony headphones")])
);
const trustedHardened = buildHardenedDiscountIntelligence(
  trustedTray,
  "sony headphones",
  trustedAssessments
);
assert.ok(
  trustedHardened.offers.length >= 1,
  "legitimate tray-relative discount should survive hardening"
);

// ── Price sanity regressions (Phase 8 protected) ─────────────────────────────
const tvSanity = assessPriceSanity(
  p("Samsung 65 inch QLED 4K TV", "Skala.nl", 33.71),
  [589, 400, 300],
  '65 inch 4k smart tv best value'
);
assert.equal(isHardPriceSanityReject(tvSanity), true);

const groverSanity = assessPriceSanity(
  p("MacBook Air 15 M3", "Grover", 35.99),
  [899, 1200, 1500],
  "macbook air m3 15 inch"
);
assert.equal(isHardPriceSanityReject(groverSanity), true);

// ── Fake discount detector aggregator boost ──────────────────────────────────
const manip = detectFakeDiscountSignals(
  p("AirPods clone mega deal", "fruugo", 29, { oldPrice: 220, extensions: ["75% off"] }),
  airpodsTray
);
assert.ok(manip.discountManipulationRisk >= 0.5);

// ── Full orchestrator: ranking order unchanged, meta hardened ───────────────
const query = "wireless gaming headset ps5";
const intent = extractSearchIntent(query);
const tray = [
  p("Ntech Gaming Headset RGB", "unknown-shop", 25, { qiComposite: 80 }),
  p("SteelSeries Arctis Nova 7P Wireless PS5", "bol.com", 149, { qiComposite: 64 }),
];
const upgraded = applySearchIntelligenceUpgrade(tray, query);
const phase92 = applyPhase92TrayIntegrity(upgraded.products, query, intent);
const beforeTop = phase92.products[0]?.link;
const phase93 = applyPhase93TrustDiscountHardening(phase92.products, query, {
  decisionBrief: upgraded.meta.decisionBrief,
  baseDiscount: upgraded.meta.discountIntelligence,
});
assert.equal(phase93.products[0]?.link, beforeTop, "phase 9.3 must not reorder tray");
assert.equal(phase93.meta.version, "phase9.3-v1");
assert.ok(phase93.meta.verdictConfidence.score >= 32);

console.log("phase9-trust-discount: ok");
