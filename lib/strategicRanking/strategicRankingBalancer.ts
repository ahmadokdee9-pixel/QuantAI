/**
 * P6.3 — Strategic ranking balancer (routing + bounded influence).
 */

import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { StrategicRankingContradictionResult } from "@/lib/strategicRanking/strategicRankingContradictions";
import type { StrategicRankingSignalBundle } from "@/lib/strategicRanking/strategicRankingConfidence";
import type { StrategicRankingRoutingLane } from "@/lib/strategicRanking/strategicRankingFlags";
import type { AdaptiveStrategicRankingProfile } from "@/lib/strategicRanking/strategicRankingProfiles";
import type { StrategicRankingGuards } from "@/lib/strategicRanking/strategicRankingGuards";

export type StrategicRankingBalanceResult = {
  routingLane: StrategicRankingRoutingLane;
  governanceDampen: number;
  multiObjectiveStable: boolean;
  balanceScore: number;
  strategicRankingConfidence: number;
};

export type StrategicRankingBlendInfluence = {
  strategicRankingDelta: number;
  trustInfluence: number;
  valueInfluence: number;
  premiumInfluence: number;
  affordabilityInfluence: number;
  conversionInfluence: number;
  stabilityInfluence: number;
  aestheticInfluence: number;
  practicalityInfluence: number;
  continuityStrength: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function resolveStrategicRankingRoutingLane(args: {
  signals: StrategicRankingSignalBundle;
  guards: StrategicRankingGuards;
  contradictions: StrategicRankingContradictionResult;
  multiObjective: MultiObjectiveCommerceMeta;
  intent: IntentCognitionMeta;
  governance: IntentGovernanceMeta;
}): StrategicRankingRoutingLane {
  const { signals, guards, contradictions, multiObjective, intent, governance } = args;

  if (governance.anomalyDetected || multiObjective.rollbackTriggered || intent.rollbackTriggered) return "stabilize";
  if (multiObjective.routingLane === "replay-protect") return "replay-protect";
  if (guards.inflationGuardActive) return "inflation-check";
  if (guards.trustDominanceGuardActive) return "trust-check";
  if (contradictions.contradictionCount >= 2) return "contradiction-check";
  if (multiObjective.routingLane === "compare" || intent.comparisonIntent >= 0.5) return "compare";
  if (signals.conversionStabilityBalance < 0.35) return "conversion-check";
  if (multiObjective.routingLane === "reinforce") return "reinforce";
  if (multiObjective.routingLane === "strategic-balance") return "strategic-balance";
  if (signals.strategicHarmony >= 0.55 && contradictions.contradictionCount === 0) return "ranking-safe";
  return "hold";
}

export function computeStrategicRankingBalance(args: {
  signals: StrategicRankingSignalBundle;
  strategicRankingConfidence: number;
  governance: IntentGovernanceMeta;
  multiObjective: MultiObjectiveCommerceMeta;
  intent: IntentCognitionMeta;
  guards: StrategicRankingGuards;
  contradictions: StrategicRankingContradictionResult;
  profile: AdaptiveStrategicRankingProfile;
}): StrategicRankingBalanceResult {
  const { signals, strategicRankingConfidence, governance, multiObjective, intent, guards, contradictions, profile } = args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.9;
  if (guards.trustDominanceGuardActive) governanceDampen *= 0.92;
  if (guards.inflationGuardActive) governanceDampen *= 0.9;

  const multiObjectiveStable =
    !multiObjective.rollbackTriggered &&
    (multiObjective.analytics?.replayIntegrityAnalytics ?? 0) >= 50 &&
    !guards.inflationGuardActive;

  let routingLane = resolveStrategicRankingRoutingLane({
    signals,
    guards,
    contradictions,
    multiObjective,
    intent,
    governance,
  });

  if (!profile.allowsMutation && routingLane !== "replay-protect" && routingLane !== "stabilize") {
    routingLane = "hold";
  }

  const balanceScore = Math.min(
    100,
    Math.round(
      strategicRankingConfidence * 40 +
        signals.strategicHarmony * 25 +
        signals.rankingContinuity * 15 +
        (multiObjective.multiObjectiveScore ?? 0) * 0.1
    )
  );

  return {
    routingLane,
    governanceDampen,
    multiObjectiveStable,
    balanceScore,
    strategicRankingConfidence,
  };
}

export function computeStrategicRankingBlendInfluence(args: {
  signals: StrategicRankingSignalBundle;
  state: { trustObjective: number; valueObjective: number; conversionObjective: number; stabilityObjective: number };
  balance: StrategicRankingBalanceResult;
  profile: AdaptiveStrategicRankingProfile;
}): StrategicRankingBlendInfluence {
  const { signals, state, balance, profile } = args;
  const damp = balance.governanceDampen;

  const trustInfluence = clamp(state.trustObjective * profile.maxTrustAmplification * signals.trustValueBalance * damp, 0, profile.maxTrustAmplification);
  const valueInfluence = clamp(state.valueObjective * profile.maxDelta * 0.85 * damp, 0, profile.maxDelta);
  const premiumInfluence = clamp(signals.premiumAffordabilityBalance * profile.maxDelta * 0.7 * damp, 0, profile.maxDelta);
  const affordabilityInfluence = clamp((1 - signals.premiumAffordabilityBalance * 0.5) * profile.maxDelta * 0.6 * damp, 0, profile.maxDelta);
  const conversionInfluence = clamp(
    state.conversionObjective * profile.maxConversionAmplification * signals.conversionStabilityBalance * damp,
    0,
    profile.maxConversionAmplification
  );
  const stabilityInfluence = clamp(state.stabilityObjective * profile.maxDelta * 0.85 * damp, 0, profile.maxDelta);
  const aestheticInfluence = clamp(signals.aestheticPracticalityBalance * profile.maxAestheticAmplification * damp, 0, profile.maxAestheticAmplification);
  const practicalityInfluence = clamp((1 - signals.aestheticPracticalityBalance * 0.4) * profile.maxDelta * 0.5 * damp, 0, profile.maxDelta);
  const continuityStrength = clamp(signals.rankingContinuity * profile.maxDelta * 0.65, 0, profile.maxDelta);

  const laneScale =
    balance.routingLane === "reinforce" || balance.routingLane === "ranking-safe"
      ? 1.05
      : balance.routingLane === "strategic-balance"
        ? 1
        : balance.routingLane === "inflation-check" ||
            balance.routingLane === "trust-check" ||
            balance.routingLane === "contradiction-check" ||
            balance.routingLane === "conversion-check"
          ? 0.72
          : 0.94;

  const strategicRankingDelta = clamp(
    (trustInfluence +
      valueInfluence +
      premiumInfluence +
      affordabilityInfluence +
      conversionInfluence +
      stabilityInfluence +
      aestheticInfluence +
      practicalityInfluence +
      continuityStrength) *
      0.065 *
      laneScale,
    0,
    profile.maxDelta
  );

  return {
    strategicRankingDelta: round3(strategicRankingDelta),
    trustInfluence: round3(trustInfluence),
    valueInfluence: round3(valueInfluence),
    premiumInfluence: round3(premiumInfluence),
    affordabilityInfluence: round3(affordabilityInfluence),
    conversionInfluence: round3(conversionInfluence),
    stabilityInfluence: round3(stabilityInfluence),
    aestheticInfluence: round3(aestheticInfluence),
    practicalityInfluence: round3(practicalityInfluence),
    continuityStrength: round3(continuityStrength),
  };
}
