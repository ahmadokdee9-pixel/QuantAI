#!/usr/bin/env node
/**
 * Phase 13.3 — Ranking Execution Preparation Layer tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyProductRanking } from "../lib/ranking/productRankingApplication.ts";
import { prepareRankingExecution } from "../lib/ranking/rankingExecutionPreparation.ts";

const VALID_TIERS = new Set(["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]);
const VALID_MODES = new Set(["ready", "caution", "blocked"]);
const VALID_BANDS = new Set(["primary", "secondary", "hold"]);

const MOCK_PRODUCTS = [
  { id: 101, link: "https://store.example/a", qiRank: 0 },
  { id: 102, link: "https://store.example/b", qiRank: 1 },
  { id: 103, link: "https://store.example/c", qiRank: 2 },
];

function assertShape(meta, label) {
  assert.equal(meta.version, "phase13.3-v1", `${label} version`);
  assert.ok(meta.candidateCount >= 0, `${label} candidateCount`);
  assert.equal(meta.candidateCount, meta.rankingCandidates.length, `${label} candidateCount matches candidates`);
  assert.ok(meta.executionConfidence >= 0 && meta.executionConfidence <= 1, `${label} executionConfidence`);
  assert.ok(Array.isArray(meta.executionWarnings), `${label} executionWarnings`);
  assert.equal(typeof meta.executionProfile, "object", `${label} executionProfile`);
  assert.ok(VALID_MODES.has(meta.executionProfile.executionMode), `${label} executionMode`);
  assert.equal(meta.executionProfile.metadata.preparedAtPhase, "phase13.3-v1", `${label} metadata phase`);
}

function assertCandidateShape(candidate, label) {
  assert.equal(typeof candidate.productId, "number", `${label} productId`);
  assert.equal(typeof candidate.link, "string", `${label} link`);
  assert.ok(candidate.candidateScore >= 0 && candidate.candidateScore <= 1, `${label} candidateScore`);
  assert.ok(VALID_TIERS.has(candidate.candidateTier), `${label} candidateTier`);
  assert.ok(VALID_BANDS.has(candidate.priorityBand), `${label} priorityBand`);
  assert.equal(typeof candidate.executionReady, "boolean", `${label} executionReady`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("prepareRankingExecution"), "route uses prepareRankingExecution");
assert.ok(route.includes("rankingExecution"), "route exposes rankingExecution meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("prepareRankingExecution"), "stabilization checks ranking execution preparation");
assert.ok(stabilization.includes("rankingExecution"), "stabilization checks rankingExecution meta");

// ── Consumes productRanking only ─────────────────────────────────────────────
const prepSrc = readFileSync(join(process.cwd(), "lib/ranking/rankingExecutionPreparation.ts"), "utf8");
assert.ok(prepSrc.includes("ProductRankingMeta"), "preparation typed against productRanking");
assert.ok(!prepSrc.includes("@/lib/intelligence/"), "preparation does not import Phase 12 intelligence");
assert.ok(!prepSrc.includes("RankingEngineMeta"), "preparation does not consume rankingEngine");
assert.ok(!prepSrc.includes("buildDeterministicRanking"), "preparation does not build rankingEngine");
assert.ok(!prepSrc.includes(".sort("), "no sorting mutations");
assert.ok(!prepSrc.includes("semanticRerank"), "no ranking execution");
assert.ok(!prepSrc.includes("QuantProduct"), "no tray mutations");

// ── Strong productRanking fixture ─────────────────────────────────────────────
const strongProductRanking = applyProductRanking({
  rankingEngine: {
    version: "phase13.1-v1",
    rankingScore: 0.82,
    rankingTier: "HIGH",
    trustWeight: 0.28,
    valueWeight: 0.26,
    buyerFitWeight: 0.24,
    confidenceWeight: 0.22,
    rankingReasons: ["Trust signals are strong across retailer and review posture."],
    rankingWarnings: [],
  },
  products: MOCK_PRODUCTS,
});

const strongExecution = prepareRankingExecution(strongProductRanking);
assertShape(strongExecution, "strong execution");
assert.equal(strongExecution.candidateCount, 3);
assert.ok(strongExecution.executionProfile.readyCandidateCount >= 2);
assert.ok(strongExecution.executionProfile.executionMode === "ready" || strongExecution.executionProfile.executionMode === "caution");
assert.ok(strongExecution.executionConfidence >= 0.45);
assert.deepEqual(
  strongExecution.executionProfile.metadata.reasons,
  strongProductRanking.rankingReasons
);
for (const candidate of strongExecution.rankingCandidates) {
  assertCandidateShape(candidate, "strong candidate");
}
assert.ok(strongExecution.rankingCandidates.some((candidate) => candidate.priorityBand === "primary"));

// ── Weak productRanking fixture ─────────────────────────────────────────────
const weakProductRanking = applyProductRanking({
  rankingEngine: {
    version: "phase13.1-v1",
    rankingScore: 0.28,
    rankingTier: "LOW",
    trustWeight: 0.3,
    valueWeight: 0.24,
    buyerFitWeight: 0.22,
    confidenceWeight: 0.24,
    rankingReasons: [],
    rankingWarnings: ["Trust signals are too weak for aggressive ranking.", "Review credibility is low."],
  },
  products: MOCK_PRODUCTS,
});

const weakExecution = prepareRankingExecution(weakProductRanking);
assertShape(weakExecution, "weak execution");
assert.equal(weakExecution.executionProfile.readyCandidateCount, 0);
assert.equal(weakExecution.executionProfile.executionMode, "blocked");
assert.ok(weakExecution.executionWarnings.length >= 2);
assert.ok(weakExecution.executionConfidence <= 0.45);
assert.ok(weakExecution.rankingCandidates.every((candidate) => candidate.priorityBand === "hold"));

// ── Blocked tier fixture ─────────────────────────────────────────────────────
const blockedProductRanking = {
  version: "phase13.2-v1",
  rankingScore: 0.15,
  rankingTier: "VERY_LOW",
  rankingReasons: [],
  rankingWarnings: ["Weak trust posture."],
  rankingConfidence: 0.18,
  rankingProfile: [
    {
      productId: 201,
      link: "https://store.example/x",
      currentRank: 0,
      preparedRankingScore: 0.2,
      preparedRankingTier: "VERY_LOW",
      trustAdjustment: 0.05,
      valueAdjustment: 0.04,
      buyerFitAdjustment: 0.03,
      confidenceAdjustment: 0.02,
      rankingReady: false,
    },
  ],
};

const blockedExecution = prepareRankingExecution(blockedProductRanking);
assertShape(blockedExecution, "blocked execution");
assert.equal(blockedExecution.executionProfile.executionMode, "blocked");
assert.ok(blockedExecution.executionWarnings.includes("No execution-ready ranking candidates were prepared."));

// ── Candidate order preservation ───────────────────────────────────────────────
assert.deepEqual(
  strongExecution.rankingCandidates.map((candidate) => candidate.productId),
  [101, 102, 103],
  "candidate order preserved"
);

// ── Deterministic stability ────────────────────────────────────────────────────
assert.deepEqual(
  prepareRankingExecution(strongProductRanking),
  prepareRankingExecution(strongProductRanking),
  "deterministic output"
);

console.log("phase133-ranking-execution: ok");
