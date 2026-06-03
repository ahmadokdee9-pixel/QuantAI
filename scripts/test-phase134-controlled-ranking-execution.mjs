#!/usr/bin/env node
/**
 * Phase 13.4 — Controlled Ranking Execution Layer tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyProductRanking } from "../lib/ranking/productRankingApplication.ts";
import { prepareRankingExecution } from "../lib/ranking/rankingExecutionPreparation.ts";
import { executeControlledRanking } from "../lib/ranking/controlledRankingExecution.ts";

const MOCK_PRODUCTS = [
  { id: 101, link: "https://store.example/weak", qiRank: 0 },
  { id: 102, link: "https://store.example/mid", qiRank: 1 },
  { id: 103, link: "https://store.example/strong", qiRank: 2 },
];

function buildReadyRankingExecution() {
  const productRanking = applyProductRanking({
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
  return prepareRankingExecution(productRanking);
}

function buildBlockedRankingExecution() {
  const productRanking = applyProductRanking({
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
  return prepareRankingExecution(productRanking);
}

function assertShape(meta, label) {
  assert.equal(meta.version, "phase13.4-v1", `${label} version`);
  assert.equal(typeof meta.executed, "boolean", `${label} executed`);
  assert.ok(meta.candidateCount >= 0, `${label} candidateCount`);
  assert.ok(meta.rerankedCount >= 0, `${label} rerankedCount`);
  assert.ok(meta.executionConfidence >= 0 && meta.executionConfidence <= 1, `${label} executionConfidence`);
  assert.ok(["ready", "caution", "blocked"].includes(meta.executionMode), `${label} executionMode`);
  assert.ok(Array.isArray(meta.rankingChanges), `${label} rankingChanges`);
  assert.equal(typeof meta.rankingSummary, "string", `${label} rankingSummary`);
  assert.ok(Array.isArray(meta.rankingWarnings), `${label} rankingWarnings`);
}

// ── Route + stabilization guards ─────────────────────────────────────────────
const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("executeControlledRanking"), "route uses executeControlledRanking");
assert.ok(route.includes("executedRanking"), "route exposes executedRanking meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("executeControlledRanking"), "stabilization checks controlled ranking execution");
assert.ok(stabilization.includes("executedRanking"), "stabilization checks executedRanking meta");

// ── Consumes rankingExecution only ───────────────────────────────────────────
const execSrc = readFileSync(join(process.cwd(), "lib/ranking/controlledRankingExecution.ts"), "utf8");
assert.ok(execSrc.includes("RankingExecutionMeta"), "execution typed against rankingExecution");
assert.ok(!execSrc.includes("@/lib/intelligence/"), "execution does not import Phase 12 intelligence");
assert.ok(!execSrc.includes("ProductRankingMeta"), "execution does not consume productRanking");
assert.ok(!execSrc.includes("Math.random"), "no randomization");
assert.ok(!execSrc.includes("openai"), "no AI-generated ranking");

// ── Ready execution moves stronger products upward ───────────────────────────
const readyExecution = buildReadyRankingExecution();
const readyResult = executeControlledRanking({
  rankingExecution: readyExecution,
  products: MOCK_PRODUCTS,
});
assertShape(readyResult.executedRanking, "ready executed ranking");
assert.equal(readyResult.executedRanking.executed, true);
assert.ok(readyResult.executedRanking.rerankedCount >= 1);
assert.equal(readyResult.executedRanking.executionMode, "ready");
assert.equal(
  readyResult.executedRanking.executionConfidence,
  readyExecution.executionConfidence
);

const scoreById = new Map(
  readyExecution.rankingCandidates.map((candidate) => [candidate.productId, candidate.candidateScore])
);
const readyOrder = readyResult.products.map((product) => product.id);
const readyScores = readyOrder.map((id) => scoreById.get(id));
assert.ok(
  readyScores.every((score, index) => index === 0 || readyScores[index - 1] >= score),
  "products ordered by candidate score descending"
);

const upChanges = readyResult.executedRanking.rankingChanges.filter((change) => change.direction === "up");
const downChanges = readyResult.executedRanking.rankingChanges.filter((change) => change.direction === "down");
assert.ok(upChanges.length >= 1, "at least one product should move up");
assert.ok(downChanges.length >= 1, "at least one product should move down");
const maxUpScore = Math.max(...upChanges.map((change) => change.candidateScore));
const maxDownScore = Math.max(...downChanges.map((change) => change.candidateScore));
assert.ok(maxUpScore >= maxDownScore, "upward moves should reflect stronger candidate scores");

assert.ok(
  readyResult.executedRanking.rankingSummary.includes("Trust signals are strong"),
  "ranking reasons preserved in summary"
);
assert.deepEqual(
  readyResult.executedRanking.rankingWarnings,
  readyExecution.executionWarnings,
  "ranking warnings preserved"
);

// ── Blocked execution preserves order ────────────────────────────────────────
const blockedExecution = buildBlockedRankingExecution();
const blockedResult = executeControlledRanking({
  rankingExecution: blockedExecution,
  products: MOCK_PRODUCTS,
});
assertShape(blockedResult.executedRanking, "blocked executed ranking");
assert.equal(blockedResult.executedRanking.executed, false);
assert.equal(blockedResult.executedRanking.rerankedCount, 0);
assert.equal(blockedResult.executedRanking.executionMode, "blocked");
assert.deepEqual(
  blockedResult.products.map((product) => product.id),
  MOCK_PRODUCTS.map((product) => product.id),
  "blocked mode preserves product order"
);
assert.ok(blockedResult.executedRanking.rankingWarnings.length >= 2);

// ── Direct fixture with explicit candidate scores ────────────────────────────
const explicitExecution = {
  version: "phase13.3-v1",
  candidateCount: 3,
  rankingCandidates: [
    {
      productId: 101,
      link: "https://store.example/weak",
      currentRank: 0,
      candidateScore: 0.25,
      candidateTier: "LOW",
      executionReady: false,
      priorityBand: "hold",
    },
    {
      productId: 102,
      link: "https://store.example/mid",
      currentRank: 1,
      candidateScore: 0.55,
      candidateTier: "MEDIUM",
      executionReady: true,
      priorityBand: "secondary",
    },
    {
      productId: 103,
      link: "https://store.example/strong",
      currentRank: 2,
      candidateScore: 0.9,
      candidateTier: "VERY_HIGH",
      executionReady: true,
      priorityBand: "primary",
    },
  ],
  executionConfidence: 0.72,
  executionWarnings: [],
  executionProfile: {
    globalRankingScore: 0.8,
    globalRankingTier: "HIGH",
    rankingConfidence: 0.68,
    readyCandidateCount: 2,
    holdCandidateCount: 1,
    executionMode: "ready",
    metadata: {
      profileVersion: "phase13.3-v1",
      preparedAtPhase: "phase13.3-v1",
      reasons: ["Strong value signal supports ranking execution."],
      warnings: [],
      globalRankingScore: 0.8,
      globalRankingTier: "HIGH",
      rankingConfidence: 0.68,
    },
  },
};

const explicitResult = executeControlledRanking({
  rankingExecution: explicitExecution,
  products: MOCK_PRODUCTS,
});
assert.equal(explicitResult.products.map((product) => product.id).join(","), "103,102,101");
assert.equal(explicitResult.executedRanking.rerankedCount, 2);
assert.ok(explicitResult.executedRanking.rankingSummary.includes("Strong value signal supports ranking execution"));

// ── Deterministic stability ──────────────────────────────────────────────────
assert.deepEqual(
  executeControlledRanking({ rankingExecution: explicitExecution, products: MOCK_PRODUCTS }),
  executeControlledRanking({ rankingExecution: explicitExecution, products: MOCK_PRODUCTS }),
  "deterministic output"
);

// ── qiRank updated after execution ─────────────────────────────────────────────
for (const [index, product] of explicitResult.products.entries()) {
  assert.equal(product.qiRank, index, "qiRank reflects executed order");
}

console.log("phase134-controlled-ranking-execution: ok");
