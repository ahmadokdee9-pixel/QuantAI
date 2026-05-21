/**
 * P5.0 — Controlled real intelligence runtime activation (bounded, deterministic, rollback-safe).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { IntentApplyMeta } from "@/lib/intent/intentApply";
import {
  computeIntentApplyDelta,
  intentListingHardSuppressed,
  isIntentApplyEligible,
} from "@/lib/intent/intentApply";
import type { IntentCanaryMeta } from "@/lib/intent/intentCanaryController";
import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentEvaluationMeta } from "@/lib/intent/intentEvaluationEngine";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentIntelligenceMeta } from "@/lib/intent/intentIntelligenceEngine";
import type { IntentObservabilityMeta } from "@/lib/intent/intentObservability";
import type { IntentOptimizationMeta } from "@/lib/intent/intentOptimizationEngine";
import type { IntentProductionApplyMeta } from "@/lib/intent/intentProductionApply";
import {
  INTENT_RUNTIME_HARD_ROLLBACK_DRIFT,
  INTENT_RUNTIME_VERSION,
  isIntentRuntimeEnabled,
  isIntentRuntimeEnvironmentAllowed,
  isIntentRuntimeMutationEnabled,
  isIntentRuntimeShadowMode,
  resolveIntentRuntimeMode,
  type IntentRuntimeMode,
} from "@/lib/intent/intentRuntimeFlags";
import { resolveRuntimeProfile } from "@/lib/intent/intentRuntimeProfiles";
import {
  buildRuntimeMonitoring,
  evaluateRuntimeSafety,
  type RuntimeMonitoring,
} from "@/lib/intent/intentRuntimeSafety";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

export type IntentRuntimeAnalytics = {
  appliedVsBaselineDelta: number;
  rankingMutationAnalysis: number;
  trustImpactAnalysis: number;
  suppressionPrecisionImpact: number;
  merchantDiversityPreservation: number;
  stabilityScoring: number;
  rollbackFrequency: number;
  driftTrendAnalysis: number;
};

export type IntentRuntimeMeta = {
  version: typeof INTENT_RUNTIME_VERSION;
  runtimeActive: boolean;
  runtimeProfile: IntentRuntimeMode;
  runtimeScore: number;
  runtimeDelta: number;
  trustApplied: number;
  suppressionApplied: number;
  comparisonApplied: number;
  diversityApplied: number;
  calibrationApplied: number;
  governanceApplied: number;
  rollbackTriggered: boolean;
  runtimeWarnings: string[];
  runtimeAnomalies: string[];
  emergencyShutdown: boolean;
  analytics: IntentRuntimeAnalytics;
  monitoring: RuntimeMonitoring;
  mutationApplied: boolean;
  latencyMs: number;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function countTopDrift(preLinks: string[], postLinks: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, preLinks.length, postLinks.length); i += 1) {
    if (preLinks[i] !== postLinks[i]) drift += 1;
  }
  return drift;
}

type RuntimeComponentDeltas = {
  trustApplied: number;
  suppressionApplied: number;
  comparisonApplied: number;
  diversityApplied: number;
  calibrationApplied: number;
  governanceApplied: number;
  runtimeDelta: number;
  suppressionEvents: number;
  trustAppliedMax: number;
};

function computeRuntimeComponentDeltas(args: {
  products: QuantProduct[];
  canonicalQuery: CanonicalQueryContract;
  intent: IntentIntelligenceMeta;
  calibration: IntentCalibrationMeta;
  governance: IntentGovernanceMeta;
  profile: ReturnType<typeof resolveRuntimeProfile>;
}): RuntimeComponentDeltas {
  const { products, canonicalQuery, intent, calibration, governance, profile } = args;
  const prices = products.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b);
  const medianPrice = prices[Math.floor(prices.length / 2)] ?? 0;

  const storeCounts = new Map<string, number>();
  for (const p of products.slice(0, 8)) {
    const k = p.store.toLowerCase();
    storeCounts.set(k, (storeCounts.get(k) ?? 0) + 1);
  }
  const dominantStore = [...storeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  let trustApplied = 0;
  let suppressionApplied = 0;
  let comparisonApplied = 0;
  let diversityApplied = 0;
  let calibrationApplied = 0;
  let governanceApplied = 0;
  let suppressionEvents = 0;
  let trustAppliedMax = 0;

  const eligibility = isIntentApplyEligible({ intent, canonicalQuery, products });
  const governanceDampen = governance.blockedPolicies.length > 0 ? 0.85 : 1;

  for (const p of products.slice(0, 8)) {
    const base = computeIntentApplyDelta({ product: p, canonicalQuery, intent, medianPrice, products });
    const suppressed = intentListingHardSuppressed(p, intent, canonicalQuery);

    let trust = 0;
    if (base.dimensionsUsed.includes("trust")) {
      trust = clamp(base.delta, -profile.trustBoostCap, profile.trustBoostCap) * calibration.trustWeight;
      trustApplied += Math.abs(trust);
      trustAppliedMax = Math.max(trustAppliedMax, Math.abs(trust));
    }

    let suppression = 0;
    if (suppressed || base.suppressed) {
      suppression = -clamp(profile.suppressionCap * calibration.suppressionWeight, 0, profile.suppressionCap);
      suppressionApplied += Math.abs(suppression);
      suppressionEvents += 1;
    }

    let comparison = 0;
    if (base.dimensionsUsed.includes("comparison")) {
      comparison = clamp(base.delta, -profile.comparisonBoostCap, profile.comparisonBoostCap) * calibration.comparisonWeight;
      comparisonApplied += Math.abs(comparison);
    }

    let diversity = 0;
    if (dominantStore && p.store.toLowerCase() !== dominantStore) {
      diversity = clamp(profile.diversityRebalanceCap * 0.35 * calibration.diversityWeight, 0, profile.diversityRebalanceCap);
      diversityApplied += diversity;
    }

    const calInfluence =
      (Math.abs(trust) + Math.abs(comparison)) * calibration.confidenceWeight * 0.15;
    calibrationApplied += calInfluence;

    governanceApplied += governanceDampen < 1 ? calInfluence * (1 - governanceDampen) : 0;
  }

  const runtimeDelta = clamp(
    (trustApplied + suppressionApplied + comparisonApplied + diversityApplied) * governanceDampen / 8,
    0,
    profile.maxDelta
  );

  return {
    trustApplied: Math.round(trustApplied * 10) / 10,
    suppressionApplied: Math.round(suppressionApplied * 10) / 10,
    comparisonApplied: Math.round(comparisonApplied * 10) / 10,
    diversityApplied: Math.round(diversityApplied * 10) / 10,
    calibrationApplied: Math.round(calibrationApplied * 100) / 100,
    governanceApplied: Math.round(governanceApplied * 100) / 100,
    runtimeDelta: Math.round(runtimeDelta * 10) / 10,
    suppressionEvents,
    trustAppliedMax,
  };
}

function applyDeterministicRuntimeRanking(args: {
  products: QuantProduct[];
  canonicalQuery: CanonicalQueryContract;
  intent: IntentIntelligenceMeta;
  calibration: IntentCalibrationMeta;
  governance: IntentGovernanceMeta;
  profile: ReturnType<typeof resolveRuntimeProfile>;
}): QuantProduct[] {
  const { products, canonicalQuery, intent, calibration, governance, profile } = args;
  if (products.length <= 1) return products;

  const prices = products.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b);
  const medianPrice = prices[Math.floor(prices.length / 2)] ?? 0;
  const governanceDampen = governance.blockedPolicies.length > 0 ? 0.85 : 1;

  const storeCounts = new Map<string, number>();
  for (const p of products) {
    const k = p.store.toLowerCase();
    storeCounts.set(k, (storeCounts.get(k) ?? 0) + 1);
  }
  const maxStoreCount = Math.max(...storeCounts.values(), 1);

  const scored = products.map((p, index) => {
    const base = computeIntentApplyDelta({ product: p, canonicalQuery, intent, medianPrice, products });
    const suppressed = intentListingHardSuppressed(p, intent, canonicalQuery);

    let runtimeScore = (products.length - index) * 10;

    if (base.dimensionsUsed.includes("trust")) {
      runtimeScore +=
        clamp(base.delta, -profile.trustBoostCap, profile.trustBoostCap) *
        calibration.trustWeight *
        governanceDampen;
    }
    if (suppressed || base.suppressed) {
      runtimeScore -= profile.suppressionCap * calibration.suppressionWeight * governanceDampen;
    }
    if (base.dimensionsUsed.includes("comparison")) {
      runtimeScore +=
        clamp(base.delta, -profile.comparisonBoostCap, profile.comparisonBoostCap) *
        calibration.comparisonWeight *
        governanceDampen;
    }

    const storeShare = (storeCounts.get(p.store.toLowerCase()) ?? 0) / maxStoreCount;
    if (storeShare < 0.45) {
      runtimeScore += profile.diversityRebalanceCap * 0.25 * calibration.diversityWeight;
    }

    runtimeScore += getStoreTrustScore(p.store) * 0.01 * calibration.trustWeight;
    runtimeScore = clamp(runtimeScore, -profile.maxDelta * 10, products.length * 10 + profile.maxDelta);

    return { p, index, runtimeScore: Math.round(runtimeScore * 1000) / 1000 };
  });

  return scored
    .sort((a, b) => {
      const d = b.runtimeScore - a.runtimeScore;
      if (Math.abs(d) > 0.0001) return d;
      return a.index - b.index;
    })
    .map((x) => x.p);
}

function buildRuntimeAnalytics(args: {
  preLinks: string[];
  postLinks: string[];
  components: RuntimeComponentDeltas;
  observability: IntentObservabilityMeta;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  rollbackTriggered: boolean;
  rankingStable: boolean;
}): IntentRuntimeAnalytics {
  const { preLinks, postLinks, components, observability, governance, calibration, rollbackTriggered, rankingStable } =
    args;
  const drift = countTopDrift(preLinks, postLinks);
  return {
    appliedVsBaselineDelta: drift,
    rankingMutationAnalysis: clampScore(100 - drift * 18),
    trustImpactAnalysis: clampScore(components.trustAppliedMax * 22 + governance.trustSafety * 0.5),
    suppressionPrecisionImpact: clampScore(calibration.analytics.suppressionPrecision),
    merchantDiversityPreservation: clampScore(calibration.dimensions.merchantDiversityCalibration),
    stabilityScoring: clampScore(rankingStable ? 88 - observability.instabilityWarnings.length * 5 : 52),
    rollbackFrequency: rollbackTriggered ? 1 : 0,
    driftTrendAnalysis: clampScore(100 - (observability.driftCount / INTENT_RUNTIME_HARD_ROLLBACK_DRIFT) * 30),
  };
}

export type IntentRuntimeApplyResult = {
  products: QuantProduct[];
  meta: IntentRuntimeMeta;
};

export function applyControlledIntentRuntime(args: {
  products: QuantProduct[];
  query: string;
  canonicalQuery: CanonicalQueryContract;
  intentIntelligence: IntentIntelligenceMeta;
  intentApply: IntentApplyMeta;
  intentProductionApply: IntentProductionApplyMeta;
  intentObservability: IntentObservabilityMeta;
  intentCanary: IntentCanaryMeta;
  intentEvaluation: IntentEvaluationMeta;
  intentOptimization: IntentOptimizationMeta;
  intentGovernance: IntentGovernanceMeta;
  intentCalibration: IntentCalibrationMeta;
  preOrderLinks?: string[];
  rankingStable?: boolean;
}): IntentRuntimeApplyResult {
  const started = Date.now();
  const {
    products,
    canonicalQuery,
    intentIntelligence,
    intentObservability,
    intentEvaluation,
    intentGovernance,
    intentCalibration,
    preOrderLinks = products.map((p) => p.link || p.title),
    rankingStable = true,
  } = args;

  const mode = resolveIntentRuntimeMode();
  const profile = resolveRuntimeProfile(mode);
  const baseline = [...products];
  const preLinks = preOrderLinks.slice(0, 5);

  const emptyAnalytics: IntentRuntimeAnalytics = {
    appliedVsBaselineDelta: 0,
    rankingMutationAnalysis: 0,
    trustImpactAnalysis: 0,
    suppressionPrecisionImpact: 0,
    merchantDiversityPreservation: 0,
    stabilityScoring: 0,
    rollbackFrequency: 0,
    driftTrendAnalysis: 0,
  };

  const emptyMonitoring = buildRuntimeMonitoring({
    safety: {
      profile,
      instabilityDetected: false,
      driftOverflow: false,
      overSuppression: false,
      trustInflation: false,
      merchantDomination: false,
      shouldRollback: false,
      emergencyShutdown: false,
      blockMutation: true,
      warnings: [],
      anomalies: [],
    },
    rankingStable,
    mutationApplied: false,
    driftCount: 0,
  });

  if (!isIntentRuntimeEnabled()) {
    return {
      products: baseline,
      meta: {
        version: INTENT_RUNTIME_VERSION,
        runtimeActive: false,
        runtimeProfile: mode,
        runtimeScore: 0,
        runtimeDelta: 0,
        trustApplied: 0,
        suppressionApplied: 0,
        comparisonApplied: 0,
        diversityApplied: 0,
        calibrationApplied: 0,
        governanceApplied: 0,
        rollbackTriggered: false,
        runtimeWarnings: ["runtime_disabled"],
        runtimeAnomalies: [],
        emergencyShutdown: false,
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        latencyMs: Date.now() - started,
      },
    };
  }

  const components = computeRuntimeComponentDeltas({
    products: baseline,
    canonicalQuery,
    intent: intentIntelligence,
    calibration: intentCalibration,
    governance: intentGovernance,
    profile,
  });

  const projected = applyDeterministicRuntimeRanking({
    products: baseline,
    canonicalQuery,
    intent: intentIntelligence,
    calibration: intentCalibration,
    governance: intentGovernance,
    profile,
  });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);

  const safety = evaluateRuntimeSafety({
    mode,
    governance: intentGovernance,
    calibration: intentCalibration,
    observability: intentObservability,
    products: baseline,
    rankingStable,
    projectedDrift,
    runtimeDeltaMax: components.runtimeDelta,
    trustAppliedMax: components.trustAppliedMax,
    suppressionAppliedCount: components.suppressionEvents,
  });

  const mutationAllowed =
    isIntentRuntimeMutationEnabled(mode) &&
    profile.allowsMutation &&
    !safety.blockMutation &&
    !isIntentRuntimeShadowMode(mode);

  let output = baseline;
  let rollbackTriggered = false;
  let mutationApplied = false;

  if (mutationAllowed) {
    output = projected;
    mutationApplied = true;
    const postDrift = countTopDrift(preLinks, output.map((p) => p.link || p.title));
    if (safety.shouldRollback || postDrift > INTENT_RUNTIME_HARD_ROLLBACK_DRIFT) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  const postLinks = output.map((p) => p.link || p.title);
  const driftCount = countTopDrift(preLinks, postLinks);

  const runtimeScore = clampScore(
    intentEvaluation.qualityScore * 0.25 +
      intentGovernance.governanceScore * 0.25 +
      intentCalibration.calibrationScore * 0.2 +
      (100 - driftCount * 15) * 0.15 +
      (mutationApplied ? 12 : 4)
  );

  const analytics = buildRuntimeAnalytics({
    preLinks,
    postLinks,
    components,
    observability: intentObservability,
    governance: intentGovernance,
    calibration: intentCalibration,
    rollbackTriggered,
    rankingStable,
  });

  const monitoring = buildRuntimeMonitoring({
    safety,
    rankingStable,
    mutationApplied,
    driftCount,
  });

  const runtimeWarnings = [...safety.warnings];
  if (!isIntentRuntimeEnvironmentAllowed()) runtimeWarnings.push("production_runtime_blocked");

  return {
    products: output.map((p, i) => ({ ...p, qiRank: i })),
    meta: {
      version: INTENT_RUNTIME_VERSION,
      runtimeActive: isIntentRuntimeEnabled() && isIntentRuntimeEnvironmentAllowed(),
      runtimeProfile: mode,
      runtimeScore,
      runtimeDelta: components.runtimeDelta,
      trustApplied: components.trustApplied,
      suppressionApplied: components.suppressionApplied,
      comparisonApplied: components.comparisonApplied,
      diversityApplied: components.diversityApplied,
      calibrationApplied: components.calibrationApplied,
      governanceApplied: components.governanceApplied,
      rollbackTriggered,
      runtimeWarnings: runtimeWarnings.slice(0, 10),
      runtimeAnomalies: safety.anomalies.slice(0, 8),
      emergencyShutdown: safety.emergencyShutdown,
      analytics,
      monitoring,
      mutationApplied,
      latencyMs: Date.now() - started,
    },
  };
}

/** Deterministic replay validator — same inputs must yield identical ordering. */
export function validateDeterministicRuntimeReplay(
  runA: IntentRuntimeApplyResult,
  runB: IntentRuntimeApplyResult
): boolean {
  const linksA = runA.products.map((p) => p.link || p.title).join("|");
  const linksB = runB.products.map((p) => p.link || p.title).join("|");
  if (linksA !== linksB) return false;
  const metaA = { ...runA.meta, latencyMs: 0 };
  const metaB = { ...runB.meta, latencyMs: 0 };
  return JSON.stringify(metaA) === JSON.stringify(metaB);
}

export {
  isIntentRuntimeEnabled,
  isIntentRuntimeMutationEnabled,
  resolveIntentRuntimeMode,
  isIntentRuntimeEnvironmentAllowed,
};
