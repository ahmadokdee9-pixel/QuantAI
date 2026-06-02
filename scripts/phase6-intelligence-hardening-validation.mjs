#!/usr/bin/env node
/**
 * Phase 6 — Intelligence hardening validation (local pipeline + optional live API).
 * Usage: node scripts/phase6-intelligence-hardening-validation.mjs
 *        QUANTAI_VALIDATION_BASE_URL=http://localhost:3000 node scripts/phase6-intelligence-hardening-validation.mjs
 */
import assert from "node:assert/strict";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { applyHardIdentityGate } from "../lib/intelligence/productIdentity.ts";
import { applySearchIntelligenceUpgrade } from "../lib/search/searchIntelligenceUpgrade.ts";

const WEAK_QUERIES = [
  "standing desk electric height adjustable",
  "wireless gaming headset ps5",
  "running shoes flat feet men",
  "mechanical keyboard quiet tactile",
  "yoga mat thick non slip",
  "dual monitor arm desk mount",
];

const PHASE5_BEFORE = {
  "standing desk electric height adjustable": { count: 0, constraints: false, trustRanking: false },
  "wireless gaming headset ps5": { count: 0, constraints: false, trustRanking: false },
  "running shoes flat feet men": { count: 7, lifestyleTop3: true, constraints: false, trustRanking: false },
  "mechanical keyboard quiet tactile": { count: 1 },
  "yoga mat thick non slip": { count: 1 },
  "dual monitor arm desk mount": { count: 2 },
};

function mockProduct(title, store, price) {
  return {
    title,
    store,
    price,
    link: `https://example.com/${encodeURIComponent(title.slice(0, 24))}`,
    image: "",
    rating: 4.2,
    reviewsCount: 40,
    extensions: [],
    qiComposite: 68,
    qiBuyingDecision: { confidence: 70, action: "STRONG_VALUE" },
  };
}

function localPipeline(query, tray) {
  const cq = buildCanonicalQuery(query);
  const gated = applyHardIdentityGate(tray, cq);
  const upgraded = applySearchIntelligenceUpgrade(gated, query, cq);
  return { cq, gated, upgraded };
}

function lifestyleInTop3(products) {
  const top = products.slice(0, 3);
  return top.some((p) =>
    /\b(air\s+force|handball|spezial|3mc|dunk|samba|walking\s+shoe|lifestyle)\b/i.test(p.title) &&
      !/\b(running|stability|support|gel|kayano)\b/i.test(p.title)
  );
}

function runLocalFixtures() {
  const desk = localPipeline("standing desk electric height adjustable", [
    mockProduct("FlexiSpot E7 Electric Standing Desk", "Coolblue", 449),
    mockProduct("IKEA GLOSTAD sofa", "IKEA", 99),
  ]);
  assert.ok(desk.gated.length >= 1, "desk identity gate");
  assert.ok(desk.upgraded.products.length >= 1, "desk upgrade tray");

  const headset = localPipeline("wireless gaming headset ps5", [
    mockProduct("SteelSeries Arctis 7P Wireless Gaming Headset PS5", "bol.com", 149),
    mockProduct("SteelSeries Arctis Nova 7P Wireless PS5", "bol.com", 159),
  ]);
  assert.ok(headset.gated.length >= 1, "gaming headset listings survive identity gate");

  const shoes = localPipeline("running shoes flat feet men", [
    mockProduct("Nike Air Force 1 Women", "Zalando", 96),
    mockProduct("ASICS Gel-Kayano 30 Men Running", "Running Warehouse", 165),
    mockProduct("adidas 3MC", "Zalando", 75),
  ]);
  assert.match(shoes.upgraded.products[0].title, /Kayano|Running|Gel/i);
  assert.equal(lifestyleInTop3(shoes.upgraded.products), false);
  assert.ok(shoes.upgraded.meta.constraints);
  assert.ok(shoes.upgraded.meta.trustRanking?.applied);

  return { desk, headset, shoes };
}

async function runLive(baseUrl) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rows = [];
  for (const q of WEAK_QUERIES) {
    const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(q)}`);
    const json = await res.json();
    const products = json?.data?.products ?? [];
    const meta = json?.data?.meta ?? {};
    rows.push({
      query: q,
      count: products.length,
      hasConstraints: meta.constraints != null,
      hasTrustRanking: meta.trustRanking != null,
      upgrade: meta.searchIntelligenceUpgrade?.version ?? null,
      lifestyleTop3: lifestyleInTop3(products),
      top1: products[0]?.title?.slice(0, 72) ?? null,
    });
    await sleep(1800);
  }
  return rows;
}

runLocalFixtures();
console.log("Local Phase 6 fixture validation: PASS");

const base = process.env.QUANTAI_VALIDATION_BASE_URL?.replace(/\/$/, "");
if (base) {
  const live = await runLive(base);
  console.log("\n--- Live validation (%s) ---\n", base);
  for (const row of live) {
    const before = PHASE5_BEFORE[row.query] ?? {};
    console.log(JSON.stringify({ ...row, phase5Before: before }, null, 2));
  }
} else {
  console.log("\n(Set QUANTAI_VALIDATION_BASE_URL to run live API checks after deploy.)");
  console.log("\nPhase 5 production baseline (before fixes):");
  console.log(JSON.stringify(PHASE5_BEFORE, null, 2));
}
