/**
 * Stage 1 shadow metrics — production telemetry without ranking mutation.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { NormalizationShadowTelemetry, NormalizationTrayMeta } from "./types";
import { computeTop3DuplicateRate } from "./dedupPipeline";
import { equivalenceGroupHasVariantBoundaryViolation } from "./variantBoundary";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function defaultKeyFn(p: QuantProduct): string {
  const n = p.qiNormalizedCommerce;
  if (n?.rankingIdentityKey) return n.rankingIdentityKey;
  return `${p.store}::${p.link}::${p.title.slice(0, 40)}`;
}

/** Fraction of tray with qiNormalizedCommerce attached. */
export function canonicalIdentityCoverage(products: QuantProduct[]): number {
  if (products.length === 0) return 0;
  const covered = products.filter((p) => p.qiNormalizedCommerce?.commerceId).length;
  return round4(covered / products.length);
}

/** Unique merchants in top-N / N — diversity score 0–1. */
export function merchantDiversityScore(products: QuantProduct[], n = 5): number {
  const top = products.slice(0, n);
  if (top.length === 0) return 0;
  const stores = new Set(top.map((p) => p.store.trim().toLowerCase()).filter(Boolean));
  return round4(stores.size / top.length);
}

/**
 * Semantic rerank coherence: unique rankingIdentityKeys in top-N / N.
 * Higher = less duplicate identity pollution in ranked output.
 */
export function semanticCoherenceScore(products: QuantProduct[], n = 5): number {
  const top = products.slice(0, n);
  if (top.length === 0) return 1;
  const keys = top.map((p) => p.qiNormalizedCommerce?.rankingIdentityKey ?? defaultKeyFn(p));
  return round4(new Set(keys).size / top.length);
}

/**
 * Detect would-be false collapses: equivalence groups where paired members have
 * conflicting storage, color, size, or model-tier axes (not merely different variantKey strings).
 */
export function detectFalseCollapseIncidents(
  products: QuantProduct[],
  meta: NormalizationTrayMeta
): number {
  let incidents = 0;

  for (const group of meta.groups) {
    if (group.memberLinks.length < 2) continue;
    const check = equivalenceGroupHasVariantBoundaryViolation(products, group.memberLinks);
    if (check.violation) incidents++;
  }

  return incidents;
}

/** Projected top-3 duplicate rate if APPLY were enabled (representatives only). */
export function projectedTop3DuplicateRate(products: QuantProduct[]): number {
  const representatives = products.filter(
    (p) => p.qiNormalizedCommerce?.isRepresentative !== false
  );
  return computeTop3DuplicateRate(representatives.length ? representatives : products, defaultKeyFn);
}

export type Stage1ShadowMetrics = {
  canonicalIdentityCoverage: number;
  merchantDiversityScoreBefore: number;
  merchantDiversityScoreAfter: number;
  merchantDiversityDelta: number;
  semanticCoherenceScore: number;
  falseCollapseIncidents: number;
  projectedTop3DuplicateRate: number;
  projectedRankingLift: number;
};

export function buildStage1ShadowMetrics(
  before: QuantProduct[],
  after: QuantProduct[],
  meta: NormalizationTrayMeta
): Stage1ShadowMetrics {
  const projected = projectedTop3DuplicateRate(after);
  const beforeDup = meta.top3DuplicateRateBefore;
  return {
    canonicalIdentityCoverage: canonicalIdentityCoverage(after),
    merchantDiversityScoreBefore: merchantDiversityScore(before, 5),
    merchantDiversityScoreAfter: merchantDiversityScore(after, 5),
    merchantDiversityDelta: round4(
      merchantDiversityScore(after, 5) - merchantDiversityScore(before, 5)
    ),
    semanticCoherenceScore: semanticCoherenceScore(after, 5),
    falseCollapseIncidents: detectFalseCollapseIncidents(after, meta),
    projectedTop3DuplicateRate: projected,
    projectedRankingLift: round4(beforeDup - projected),
  };
}

export type RolloutReadinessInput = {
  shadow: NormalizationShadowTelemetry;
  stage1: Stage1ShadowMetrics;
  searchLatencyMs: number;
};

/** 0–100 readiness score for APPLY=true gate (Stage 1 observation period). */
export function computeRolloutReadinessScore(input: RolloutReadinessInput): number {
  let score = 0;
  const { shadow, stage1, searchLatencyMs } = input;

  if (shadow.enabled && shadow.mode === "shadow" && !shadow.apply) score += 15;
  if (stage1.canonicalIdentityCoverage >= 0.85) score += 15;
  else if (stage1.canonicalIdentityCoverage >= 0.6) score += 8;

  if (shadow.equivalenceGroupCount > 0) score += 10;
  if (shadow.top3DuplicateRateBefore >= 0.15) score += 10;
  if (stage1.projectedRankingLift >= 0.2) score += 15;
  else if (stage1.projectedRankingLift > 0) score += 8;

  if (stage1.falseCollapseIncidents === 0) score += 20;
  else if (stage1.falseCollapseIncidents <= 1) score += 10;

  if (stage1.semanticCoherenceScore >= 0.8) score += 10;
  else if (stage1.semanticCoherenceScore >= 0.6) score += 5;

  if (shadow.latencyMs <= 5) score += 5;
  if (searchLatencyMs > 0 && shadow.latencyMs / searchLatencyMs <= 0.05) score += 5;

  if (stage1.merchantDiversityDelta >= 0) score += 5;

  return Math.min(100, score);
}

export function rolloutReadinessGrade(score: number): "NOT_READY" | "OBSERVING" | "NEAR_READY" | "READY_FOR_APPLY_REVIEW" {
  if (score >= 85) return "READY_FOR_APPLY_REVIEW";
  if (score >= 65) return "NEAR_READY";
  if (score >= 40) return "OBSERVING";
  return "NOT_READY";
}

export function enrichShadowTelemetry(
  base: NormalizationShadowTelemetry,
  before: QuantProduct[],
  after: QuantProduct[],
  meta: NormalizationTrayMeta,
  searchLatencyMs: number
): NormalizationShadowTelemetry {
  const stage1Metrics = buildStage1ShadowMetrics(before, after, meta);
  const rolloutReadinessScore = computeRolloutReadinessScore({
    shadow: base,
    stage1: stage1Metrics,
    searchLatencyMs,
  });

  return {
    ...base,
    canonicalIdentityCoverage: stage1Metrics.canonicalIdentityCoverage,
    merchantDiversityScoreBefore: stage1Metrics.merchantDiversityScoreBefore,
    merchantDiversityScoreAfter: stage1Metrics.merchantDiversityScoreAfter,
    merchantDiversityDelta: stage1Metrics.merchantDiversityDelta,
    semanticCoherenceScore: stage1Metrics.semanticCoherenceScore,
    falseCollapseIncidents: stage1Metrics.falseCollapseIncidents,
    projectedTop3DuplicateRate: stage1Metrics.projectedTop3DuplicateRate,
    projectedRankingLift: stage1Metrics.projectedRankingLift,
    rolloutReadinessScore,
    rolloutReadinessGrade: rolloutReadinessGrade(rolloutReadinessScore),
  };
}
