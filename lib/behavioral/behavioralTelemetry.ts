/**
 * P5.9 — Behavioral commerce telemetry (analytics + monitoring).
 */

import type { BehavioralBalanceResult, BehavioralBlendInfluence } from "@/lib/behavioral/behavioralBalancer";
import type { BehavioralCommerceMode, BehavioralRoutingLane } from "@/lib/behavioral/behavioralFlags";
import type { BehavioralProfile } from "@/lib/behavioral/behavioralProfiles";
import type { BehavioralSignalBundle } from "@/lib/behavioral/behavioralSignals";

export type BehavioralCommerceAnalytics = {
  frictionAnalytics: number;
  hesitationAnalytics: number;
  fatigueAnalytics: number;
  trustMomentumAnalytics: number;
  readinessAnalytics: number;
  aggregateAnalytics: number;
  rankingContinuityAnalytics: number;
  replayIntegrityAnalytics: number;
  topDriftCount: number;
};

export type BehavioralMonitoring = {
  behavioralInstability: boolean;
  frictionInflation: boolean;
  hesitationInflation: boolean;
  comparisonFatigueRisk: boolean;
  replayIntegrityValid: boolean;
  rankingContinuityValid: boolean;
  readinessAmplificationValid: boolean;
  trustMomentumValid: boolean;
};

export type BehavioralCommerceMeta = {
  version: "behavioral-commerce-v1";
  behavioralActive: boolean;
  behavioralProfile: BehavioralCommerceMode;
  behavioralScore: number;
  behavioralDelta: number;
  behavioralConfidence: number;
  buyingFriction: number;
  decisionHesitation: number;
  comparisonFatigue: number;
  trustMomentum: number;
  conversionReadiness: number;
  routingLane: BehavioralRoutingLane | string;
  rollbackTriggered: boolean;
  behavioralWarnings: string[];
  behavioralAnomalies: string[];
  analytics: BehavioralCommerceAnalytics;
  monitoring: BehavioralMonitoring;
  mutationApplied: boolean;
  signalHash: string;
  graphExecutionHash: string;
  latencyMs: number;
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function buildBehavioralAnalytics(args: {
  signals: BehavioralSignalBundle;
  influence: BehavioralBlendInfluence;
  replayIntegrity: number;
  topDrift: number;
}): BehavioralCommerceAnalytics {
  const { signals, influence, replayIntegrity, topDrift } = args;
  return {
    frictionAnalytics: clampScore(signals.buyingFriction * 100),
    hesitationAnalytics: clampScore(signals.decisionHesitation * 100),
    fatigueAnalytics: clampScore(signals.comparisonFatigue * 100),
    trustMomentumAnalytics: clampScore(signals.trustMomentum * 100 + influence.trustMomentum * 15),
    readinessAnalytics: clampScore(signals.conversionReadiness * 100 + influence.readinessAmplification * 20),
    aggregateAnalytics: clampScore(signals.behavioralAggregate * 100),
    rankingContinuityAnalytics: clampScore(influence.continuityStrength * 100),
    replayIntegrityAnalytics: replayIntegrity,
    topDriftCount: topDrift,
  };
}

export function buildBehavioralMonitoring(args: {
  influence: BehavioralBlendInfluence;
  replayIntegrity: number;
  rollbackTriggered: boolean;
  balance: BehavioralBalanceResult;
  signals: BehavioralSignalBundle;
  topDrift: number;
  profile: BehavioralProfile;
}): BehavioralMonitoring {
  const { influence, replayIntegrity, rollbackTriggered, balance, signals, topDrift, profile } = args;
  return {
    behavioralInstability: rollbackTriggered || !balance.marketStable || !balance.strategyStable,
    frictionInflation: influence.frictionAmplification > profile.maxFrictionAmplification * 0.8,
    hesitationInflation: influence.hesitationAmplification > profile.maxHesitationAmplification * 0.8,
    comparisonFatigueRisk: signals.comparisonFatigue >= 0.55,
    replayIntegrityValid: replayIntegrity >= 70,
    rankingContinuityValid: influence.continuityStrength <= profile.maxDelta,
    readinessAmplificationValid: influence.readinessAmplification <= profile.maxReadinessAmplification,
    trustMomentumValid: influence.trustMomentum <= profile.maxReadinessAmplification,
  };
}
