/**
 * Phase 2 — APPLY readiness gates (shadow observation → canary → production APPLY).
 * Does NOT enable APPLY — evaluates metrics only.
 */

import type { NormalizationShadowTelemetry } from "./types";

export type Phase2ProbeSample = {
  id: string;
  query?: string;
  success?: boolean;
  normalizationEnabled?: boolean;
  mode?: string | null;
  apply?: boolean | null;
  top3DuplicateRateBefore?: number | null;
  top3DuplicateRateAfter?: number | null;
  projectedTop3DuplicateRate?: number | null;
  projectedRankingLift?: number | null;
  top3DuplicateReduction?: number | null;
  canonicalIdentityCoverage?: number | null;
  merchantDiversityDelta?: number | null;
  falseCollapseIncidents?: number | null;
  semanticCoherenceScore?: number | null;
  normalizationLatencyMs?: number | null;
  searchLatencyMs?: number | null;
  traySizeUnchanged?: boolean;
  inputCount?: number | null;
  outputCount?: number | null;
  uniqueCommerceIdCount?: number | null;
  rankingMutation?: boolean;
};

export type Phase2AggregateMetrics = {
  generatedAt: string;
  baseUrl?: string;
  queryCount: number;
  successCount: number;
  shadowEnabledCount: number;
  applyDisabledCount: number;
  trayUnchangedCount: number;
  totalFalseCollapseIncidents: number;
  avgTop3DuplicateRateBefore: number;
  avgTop3DuplicateRateAfter: number;
  avgProjectedTop3DuplicateRate: number;
  avgTop3DuplicateReduction: number;
  avgProjectedRankingLift: number;
  avgCanonicalIdentityCoverage: number;
  avgMerchantDiversityDelta: number;
  avgSemanticCoherenceScore: number;
  avgRolloutReadinessScore: number;
  normalizationLatencyP50: number;
  normalizationLatencyP95: number;
  searchLatencyP95: number;
  offlineApplyTop5DriftMax?: number;
  offlineApplyFalseCollapse?: number;
};

export type Phase2ApplyGate = {
  id: string;
  passed: boolean;
  value: string | number | boolean;
  threshold: string;
  critical: boolean;
};

export type Phase2ApplyReadinessVerdict = {
  gates: Phase2ApplyGate[];
  allCriticalPassed: boolean;
  passedCount: number;
  totalGates: number;
  score: number;
  verdict: "BLOCKED" | "OBSERVING" | "NEAR_READY" | "READY_FOR_CANARY" | "NOT_READY";
  applyEnabled: false;
  rankingMutation: false;
  recommendation: string;
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function top3DuplicateReduction(
  before: number | null | undefined,
  projected: number | null | undefined
): number {
  const b = before ?? 0;
  const p = projected ?? b;
  return round4(Math.max(0, b - p));
}

/** Build per-probe reduction from shadow telemetry fields. */
export function probeMetricsFromShadow(
  sample: Partial<Phase2ProbeSample> & Pick<Phase2ProbeSample, "id">,
  shadow?: Partial<NormalizationShadowTelemetry> | null
): Phase2ProbeSample {
  const before =
    sample.top3DuplicateRateBefore ?? shadow?.top3DuplicateRateBefore ?? null;
  const projected =
    sample.projectedTop3DuplicateRate ??
    shadow?.projectedTop3DuplicateRate ??
    sample.top3DuplicateRateAfter ??
    shadow?.top3DuplicateRateAfter ??
    null;
  return {
    ...sample,
    top3DuplicateRateBefore: before,
    projectedTop3DuplicateRate: projected,
    top3DuplicateReduction: top3DuplicateReduction(before, projected),
    projectedRankingLift:
      sample.projectedRankingLift ??
      shadow?.projectedRankingLift ??
      (before != null && projected != null ? round4(before - projected) : null),
    falseCollapseIncidents:
      sample.falseCollapseIncidents ?? shadow?.falseCollapseIncidents ?? null,
    canonicalIdentityCoverage:
      sample.canonicalIdentityCoverage ?? shadow?.canonicalIdentityCoverage ?? null,
    merchantDiversityDelta:
      sample.merchantDiversityDelta ?? shadow?.merchantDiversityDelta ?? null,
    traySizeUnchanged:
      sample.traySizeUnchanged ??
      (shadow != null ? shadow.inputCount === shadow.outputCount : undefined),
  };
}

export function evaluatePhase2ApplyReadiness(
  metrics: Phase2AggregateMetrics
): Phase2ApplyReadinessVerdict {
  const gates: Phase2ApplyGate[] = [
    {
      id: "shadow_telemetry_active",
      passed: metrics.shadowEnabledCount === metrics.successCount && metrics.successCount > 0,
      value: `${metrics.shadowEnabledCount}/${metrics.successCount}`,
      threshold: "100% probes shadow-enabled",
      critical: true,
    },
    {
      id: "apply_disabled_live",
      passed: metrics.applyDisabledCount === metrics.successCount,
      value: `${metrics.applyDisabledCount}/${metrics.successCount}`,
      threshold: "APPLY=false on all live probes",
      critical: true,
    },
    {
      id: "tray_size_invariant",
      passed: metrics.trayUnchangedCount === metrics.successCount,
      value: `${metrics.trayUnchangedCount}/${metrics.successCount}`,
      threshold: "inputCount === outputCount (shadow)",
      critical: true,
    },
    {
      id: "false_collapse_zero",
      passed: metrics.totalFalseCollapseIncidents === 0,
      value: metrics.totalFalseCollapseIncidents,
      threshold: "0 total falseCollapseIncidents",
      critical: true,
    },
    {
      id: "canonical_identity_coverage",
      passed: metrics.avgCanonicalIdentityCoverage >= 0.85,
      value: round4(metrics.avgCanonicalIdentityCoverage),
      threshold: ">= 0.85 avg coverage",
      critical: true,
    },
    {
      id: "semantic_coherence",
      passed: metrics.avgSemanticCoherenceScore >= 0.8,
      value: round4(metrics.avgSemanticCoherenceScore),
      threshold: ">= 0.80 top-5 coherence",
      critical: false,
    },
    {
      id: "projected_duplicate_reduction",
      passed:
        metrics.avgTop3DuplicateReduction > 0 ||
        metrics.avgProjectedRankingLift > 0 ||
        metrics.avgTop3DuplicateRateBefore < 0.05,
      value: round4(metrics.avgTop3DuplicateReduction),
      threshold: ">0 projected reduction OR low baseline dup rate",
      critical: false,
    },
    {
      id: "merchant_diversity_non_negative",
      passed: metrics.avgMerchantDiversityDelta >= 0,
      value: round4(metrics.avgMerchantDiversityDelta),
      threshold: ">= 0 avg merchant diversity delta",
      critical: false,
    },
    {
      id: "normalization_latency_p95",
      passed: metrics.normalizationLatencyP95 <= 250,
      value: metrics.normalizationLatencyP95,
      threshold: "<= 250ms p95 (interim gate)",
      critical: false,
    },
    {
      id: "offline_apply_false_collapse",
      passed: (metrics.offlineApplyFalseCollapse ?? 0) === 0,
      value: metrics.offlineApplyFalseCollapse ?? 0,
      threshold: "0 offline APPLY false collapses",
      critical: true,
    },
    {
      id: "offline_apply_top5_drift",
      passed: (metrics.offlineApplyTop5DriftMax ?? 0) <= 3,
      value: metrics.offlineApplyTop5DriftMax ?? 0,
      threshold: "<= 3 top-5 drift slots (offline simulation)",
      critical: false,
    },
  ];

  const passedCount = gates.filter((g) => g.passed).length;
  const criticalGates = gates.filter((g) => g.critical);
  const allCriticalPassed = criticalGates.every((g) => g.passed);
  const score = Math.round((passedCount / gates.length) * 100);

  let verdict: Phase2ApplyReadinessVerdict["verdict"] = "NOT_READY";
  if (allCriticalPassed && score >= 85) verdict = "READY_FOR_CANARY";
  else if (allCriticalPassed && score >= 65) verdict = "NEAR_READY";
  else if (score >= 40) verdict = "OBSERVING";
  else verdict = "BLOCKED";

  let recommendation =
    "Continue shadow observation. DO NOT enable QUANTAI_NORMALIZATION_APPLY=true.";
  if (verdict === "READY_FOR_CANARY") {
    recommendation =
      "Critical gates passed. Eligible for offline canary APPLY on staging only — keep production APPLY=false until 14-day shadow window completes.";
  } else if (verdict === "NEAR_READY") {
    recommendation =
      "Address failing critical gates (especially falseCollapse and coverage) before canary.";
  } else if (!gates.find((g) => g.id === "false_collapse_zero")?.passed) {
    recommendation =
      "BLOCKED: falseCollapseIncidents > 0. Fix variant boundaries before any APPLY discussion.";
  }

  return {
    gates,
    allCriticalPassed,
    passedCount,
    totalGates: gates.length,
    score,
    verdict,
    applyEnabled: false,
    rankingMutation: false,
    recommendation,
  };
}
