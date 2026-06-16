#!/usr/bin/env node
/**
 * Phase 3C — Ranking decision record layer tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildRankExplanation } from "../lib/intelligence/rankExplanationEngine.ts";
import { buildTruthFoundationSnapshot } from "../lib/truth/truthEvidenceBuilder.ts";
import {
  buildCompositeBreakdown,
  buildRankingDecisionRecord,
  enrichDecisionWithRankingRecord,
  parseTruthRankingByLink,
  serializeTruthRankingByLink,
} from "../lib/truth/rankingDecisionRecord.ts";
import { attachTruthFoundationToDecision } from "../lib/truth/truthEvidenceBuilder.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("rankingDecisionRecord"), "no UI decision record import");
pass("no_ui_redesign");

const rankEnhance = readFileSync(join(process.cwd(), "lib/intelligence/searchRankEnhance.ts"), "utf8");
assert.ok(rankEnhance.includes("sortProductsByTrustDrivenRank"), "ranking uses trust-driven scorer");
pass("ranking_uses_trust_driven_scorer");

const phase45 = readFileSync(join(process.cwd(), "lib/ui/phase45ProductionReadinessActivation.ts"), "utf8");
assert.ok(phase45.includes("enrichDecisionWithRankingRecord"), "phase45 attaches decision records");
pass("phase45_attaches_records");

const searchRoute = readFileSync(join(process.cwd(), "app/api/search/route.ts"), "utf8");
assert.ok(searchRoute.includes("truthRankingByLink"), "search meta exposes truthRankingByLink");
pass("search_meta_truth_ranking");

const gamingLaptop = {
  id: 1,
  title: "ASUS ROG Strix G16 RTX 4070 165Hz Gaming Laptop",
  store: "Amazon.com",
  price: 1399,
  displayPrice: "€1399",
  rating: 4.7,
  link: "https://amazon.com/dp/gaming-laptop",
  image: "",
  reviewsCount: 420,
  shipping: "Free delivery",
  availability: "In stock",
  oldPrice: null,
  priceTrend: "stable",
  extensions: ["Gaming", "165Hz display"],
};

const foundation = buildTruthFoundationSnapshot({
  product: gamingLaptop,
  listingUrl: gamingLaptop.link,
  searchQuery: "best gaming laptop under 1500 euro",
});

const record = buildRankingDecisionRecord({
  link: gamingLaptop.link,
  foundation,
  baseScore: 72,
});

assert.equal(record.version, 1);
assert.equal(record.link, gamingLaptop.link);
assert.equal(record.baseScore, 72);
assert.ok(Number.isFinite(record.finalRankScore));
assert.ok(Number.isFinite(record.truthDelta));
assert.equal(record.finalRankScore, Math.round((record.baseScore + record.truthDelta) * 10) / 10);
assert.equal(record.layers.length, 9);
assert.ok(record.whyRanked.length > 0);
assert.ok(Array.isArray(record.influencedLayers));
assert.ok(record.evidenceChain.length > 0);
assert.ok(record.evidenceChain.length <= 8);
pass("ranking_decision_record_shape");

const breakdown = buildCompositeBreakdown(foundation);
assert.ok(breakdown.relevance >= 0 && breakdown.relevance <= 100);
assert.ok(breakdown.trust >= 0 && breakdown.trust <= 100);
assert.ok(breakdown.recommendation >= 0 && breakdown.recommendation <= 100);
assert.ok(breakdown.taste >= 0 && breakdown.taste <= 100);
assert.ok(breakdown.motivation >= 0 && breakdown.motivation <= 100);
assert.ok(breakdown.constraints >= 0 && breakdown.constraints <= 100);
assert.ok(breakdown.decision >= 0 && breakdown.decision <= 100);
assert.deepEqual(record.compositeBreakdown, breakdown);
pass("composite_breakdown_fields");

const serialized = serializeTruthRankingByLink(new Map([[gamingLaptop.link, record]]));
const parsed = parseTruthRankingByLink(serialized);
assert.ok(parsed.has(gamingLaptop.link));
assert.equal(parsed.get(gamingLaptop.link)?.whyRanked, record.whyRanked);
pass("serialize_parse_truth_ranking_by_link");

const baseDecision = attachTruthFoundationToDecision(
  {
    link: gamingLaptop.link,
    verdict: "COMPARE",
    confidence: 68,
    confidenceReason: "test",
    reasonLine: "baseline",
    reasonAuthority: { primary: "baseline", secondary: "", evidence: [] },
    displayChips: [],
    summaryLines: ["baseline", ""],
    alternativePressureScore: 0,
    buyerAuthority: 50,
    productIntelligence: {
      finalVerdict: "COMPARE",
      segment: null,
      segmentLabel: "",
      dimensions: [],
      productUnderstandingLine: "",
      searchRank: {
        version: 1,
        link: gamingLaptop.link,
        rank: 1,
        label: "Best Overall Choice",
        rankHeadline: "#1 Best Overall Choice",
        rankScore: 72,
      },
      globalCategoryIntelligence: {
        version: 1,
        categoryKey: "electronics",
        categoryLabel: "Electronics",
        profile: {
          key: "electronics",
          label: "Electronics",
          dimensions: [],
        },
        categoryFitScore: 78,
        dimensions: [],
        categoryReasoning: "Strong gaming fit",
      },
    },
  },
  {
    product: gamingLaptop,
    searchQuery: "best gaming laptop under 1500 euro",
  }
);

const enriched = enrichDecisionWithRankingRecord(baseDecision, { productTitle: gamingLaptop.title });
assert.ok(enriched.productIntelligence?.rankingDecisionRecord);
assert.equal(enriched.productIntelligence?.rankingDecisionRecord?.link, gamingLaptop.link);
assert.ok(enriched.productIntelligence?.commerceReasoning?.whyWon.includes("Base score"));
assert.ok(enriched.productIntelligence?.rankExplanation?.whyThisRank.includes("#1 Best Overall Choice"));
pass("enrich_decision_attaches_record_and_reasoning");

const explanation = buildRankExplanation({
  productTitle: gamingLaptop.title,
  searchRank: baseDecision.productIntelligence.searchRank,
  verdict: "COMPARE",
  categoryIntel: baseDecision.productIntelligence.globalCategoryIntelligence,
  isGlobalWinner: true,
  rankingDecisionRecord: record,
});
assert.ok(explanation.whyThisRank.includes(record.whyRanked.split(".")[0].slice(0, 20)));
assert.ok(explanation.whyStillUseful.length > 0);
pass("rank_explanation_consumes_decision_record");

console.log(`\nPhase 3C ranking decision record: ${passed} checks passed.`);
