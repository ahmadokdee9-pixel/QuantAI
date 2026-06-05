#!/usr/bin/env node
/**
 * Phase 27.0 — Confidence Authority + Alternative Authority tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { resolveConfidenceAuthority } from "../lib/ui/confidenceAuthority.ts";
import { resolveTrayAlternativeAuthority } from "../lib/ui/alternativeAuthority.ts";
import { buildPhase270ProductMap } from "../lib/ui/phase270PresentationActivation.ts";
import { surfaceEvidenceSupportsAuthority } from "../lib/ui/verdictReasonAuthority.ts";
import { primaryVerdictAlignment } from "../lib/ui/decisionLanguage.ts";

const base = {
  extensions: [],
  image: "",
  rating: 4.7,
  reviewsCount: 820,
  availability: "In stock",
  shipping: "Free delivery",
};

function product(id, store, price, oldPrice = price + 80) {
  return {
    ...base,
    id,
    link: `https://shop.example/${id}`,
    title: "Samsung Galaxy S24 Ultra 512GB flagship smartphone",
    store,
    price,
    oldPrice,
    priceTrend: "down",
  };
}

const lead = product(1, "Coolblue", 899, 1099);
const peer = product(2, "MediaMarkt", 929, 1049);
const valuePeer = product(3, "Amazon", 879, 999);
const tray = [lead, peer, valuePeer];

const brief = {
  headline: "Tray brief",
  recommendation: { label: "Top pick", title: lead.title, store: lead.store, link: lead.link, price: lead.price },
  why: [],
  alternatives: [],
  discountNote: null,
  confidence: 0.82,
  sparseTrayWarning: null,
  explanation: "Institutional brief supports checkout.",
  buyReasoning: "Trust and discount posture support moving forward.",
  riskSignals: [],
};

const trayCtx = buildTrayCoherenceContext({
  searchMeta: {
    verdictIntelligence: {
      version: "phase10-v1",
      verdict: "BUY READY",
      confidence: 0.82,
      rationale: "Lead clears institutional checks.",
      strengths: [],
      warnings: [],
      factorTrace: {},
    },
    phase93TrustDiscount: {
      version: "phase93-v1",
      trayAssessments: tray.map((p) => ({
        link: p.link,
        trustScore: 78,
        fakeDiscountRisk: "low",
        priceAnomaly: "normal",
        suspiciousSeller: false,
      })),
    },
  },
  decisionBrief: brief,
});

function coherenceFor(product, list, rank) {
  return activateProductDecisionCoherence({
    product,
    list,
    rank,
    tray: trayCtx,
    searchQuery: "samsung galaxy s24 ultra best camera",
  });
}

// ── Guards ─────────────────────────────────────────────────────────────────────
assert.ok(readFileSync(join(process.cwd(), "lib/ui/confidenceAuthority.ts"), "utf8").includes("resolveConfidenceAuthority"));
assert.ok(readFileSync(join(process.cwd(), "lib/ui/alternativeAuthority.ts"), "utf8").includes("resolveTrayAlternativeAuthority"));
assert.ok(readFileSync(join(process.cwd(), "lib/ui/phase270PresentationActivation.ts"), "utf8").includes("buildPhase270ProductMap"));

const unifiedSrc = readFileSync(join(process.cwd(), "lib/ui/unifiedVerdictAuthority.ts"), "utf8");
assert.ok(unifiedSrc.includes("QUANTAI_PHASE_26_2_STABLE_FROZEN"), "phase 26.2 verdict authority remains frozen");

// ── Confidence is not verdict-bucket fixed ─────────────────────────────────────
const cLead = coherenceFor(lead, tray, 0);
const cPeer = coherenceFor(peer, tray, 1);
const confLead = resolveConfidenceAuthority({
  verdict: cLead.verdict,
  intentIntelligence: cLead.intentIntelligence,
  trustRisk: cLead.trustRisk,
  discountTruth: cLead.discountTruth,
  priceTarget: cLead.priceTarget,
  buyWait: cLead.buyWait,
  categoryIntelligence: cLead.categoryIntelligence,
  alternativeAdvantage: cLead.alternativeAdvantage,
});
const confPeer = resolveConfidenceAuthority({
  verdict: cPeer.verdict,
  intentIntelligence: cPeer.intentIntelligence,
  trustRisk: cPeer.trustRisk,
  discountTruth: cPeer.discountTruth,
  priceTarget: cPeer.priceTarget,
  buyWait: cPeer.buyWait,
  categoryIntelligence: cPeer.categoryIntelligence,
  alternativeAdvantage: cPeer.alternativeAdvantage,
});

assert.notEqual(confLead.confidenceScore, primaryVerdictAlignment("BUY READY"), "buy confidence not fixed at 88");
assert.notEqual(confPeer.confidenceScore, primaryVerdictAlignment("COMPARE"), "compare confidence not fixed at 62");
assert.ok(confLead.confidenceTier.length > 0, "confidence tier present");
assert.ok(confLead.confidenceReason.length > 10, "confidence reason present");

// ── Multiple products with natural confidence spread ───────────────────────────
const coherenceMap = new Map([
  [lead.link, cLead],
  [peer.link, cPeer],
  [valuePeer.link, coherenceFor(valuePeer, tray, 2)],
]);
const phase270 = buildPhase270ProductMap(coherenceMap);
const scores = [...phase270.values()].map((row) => row.displayConfidenceScore);
assert.ok(scores.length === 3, "tray products scored");
assert.ok(scores.every((s) => s >= 0 && s <= 100), "scores in range");

// ── Alternative authority ──────────────────────────────────────────────────────
const closeAlt = resolveTrayAlternativeAuthority({
  presentations: [
    { link: "a", confidenceScore: 91, verdict: "BUY READY" },
    { link: "b", confidenceScore: 89, verdict: "BUY READY" },
  ],
});
assert.ok(closeAlt.label.includes("Strong Alternative"), "close gap shows strong alternative");

const dominantAlt = resolveTrayAlternativeAuthority({
  presentations: [
    { link: "a", confidenceScore: 91, verdict: "BUY READY" },
    { link: "b", confidenceScore: 71, verdict: "COMPARE" },
  ],
});
assert.ok(dominantAlt.label.includes("Decision Dominance"), "wide gap shows dominance");

// ── Chip alignment ───────────────────────────────────────────────────────────
for (const [link, presentation] of phase270) {
  const coherent = coherenceMap.get(link);
  assert.ok(
    surfaceEvidenceSupportsAuthority(presentation.displayChips, coherent.reasonAuthority) ||
      presentation.displayChips.length === 0,
    "display chips align when present"
  );
}

console.log("phase270-confidence-authority: ok");
