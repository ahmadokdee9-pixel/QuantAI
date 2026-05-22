/**
 * P6.1 — Intent cognition engine orchestration.
 */

import type { BehavioralCommerceMeta } from "@/lib/behavioral/behavioralTelemetry";
import type { CognitionEngineMeta } from "@/lib/cognition/cognitionTelemetry";
import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";
import {
  computeIntentBalance,
  computeIntentBlendInfluence,
  type IntentBalanceResult,
  type IntentBlendInfluence,
} from "@/lib/intent/intentBalancer";
import { buildIntentSignalBundle, computeIntentConfidence, type IntentSignalBundle } from "@/lib/intent/intentConfidence";
import { evaluateIntentComparison } from "@/lib/intent/intentComparison";
import { detectIntentContradictions, type IntentContradictionResult } from "@/lib/intent/intentContradictions";
import { evaluateIntentEmotion } from "@/lib/intent/intentEmotion";
import type { IntentCognitionProfile } from "@/lib/intent/intentProfiles";
import { evaluateIntentReadiness } from "@/lib/intent/intentReadiness";
import { evaluateIntentTaste } from "@/lib/intent/intentTaste";
import { evaluateIntentTrust } from "@/lib/intent/intentTrust";
import { evaluateIntentUnderstanding } from "@/lib/intent/intentUnderstanding";
import { evaluateIntentValue } from "@/lib/intent/intentValue";

export type IntentEngineResult = {
  signals: IntentSignalBundle;
  contradictions: IntentContradictionResult;
  balance: IntentBalanceResult;
  influence: IntentBlendInfluence;
  intentScore: number;
  anomalies: string[];
};

export function runIntentEngine(args: {
  query: string;
  canonicalQuery: CanonicalQueryContract;
  decision: DecisionIntelligenceMeta;
  strategy: StrategyIntelligenceMeta;
  behavioral: BehavioralCommerceMeta;
  cognition: CognitionEngineMeta;
  governance: IntentGovernanceMeta;
  profile: IntentCognitionProfile;
}): IntentEngineResult {
  const understanding = evaluateIntentUnderstanding({ query: args.query, canonicalQuery: args.canonicalQuery, cognition: args.cognition });
  const emotion = evaluateIntentEmotion({ query: args.query, canonicalQuery: args.canonicalQuery });
  const taste = evaluateIntentTaste({ query: args.query, canonicalQuery: args.canonicalQuery });
  const readiness = evaluateIntentReadiness({ canonicalQuery: args.canonicalQuery, behavioral: args.behavioral, cognition: args.cognition });
  const trust = evaluateIntentTrust({ query: args.query, canonicalQuery: args.canonicalQuery, strategy: args.strategy, cognition: args.cognition });
  const value = evaluateIntentValue({ canonicalQuery: args.canonicalQuery, strategy: args.strategy, decision: args.decision });
  const comparison = evaluateIntentComparison({ canonicalQuery: args.canonicalQuery, strategy: args.strategy });

  const signals = buildIntentSignalBundle({
    recommendationIntent: comparison.recommendationIntent,
    comparisonIntent: comparison.comparisonIntent,
    premiumIntent: value.premiumIntent,
    valueIntent: value.valueIntent,
    trustIntent: trust.trustIntent,
    readinessIntent: readiness.readinessIntent,
    hesitationIntent: readiness.hesitationIntent,
    emotionalIntent: emotion.emotionalIntent,
    aestheticIntent: taste.aestheticIntent,
    explorationIntent: understanding.explorationIntent,
    hiddenBuyingIntent: understanding.hiddenBuyingIntent,
    cognition: args.cognition,
  });

  const contradictions = detectIntentContradictions({
    query: args.query,
    understanding,
    value,
    comparison,
    readiness,
    trust,
    cognition: args.cognition,
  });

  let governanceDampen = 1;
  if (args.governance.anomalyDetected) governanceDampen = 0.88;

  const intentConfidence = computeIntentConfidence({ signals, cognition: args.cognition, contradictions, governanceDampen });
  const balance = computeIntentBalance({
    signals,
    intentConfidence,
    governance: args.governance,
    cognition: args.cognition,
    contradictions,
    behavioral: args.behavioral,
    strategy: args.strategy,
    profile: args.profile,
  });
  const influence = computeIntentBlendInfluence({ signals, balance, profile: args.profile });

  const anomalies: string[] = [];
  if (args.profile.requiresGovernancePass && args.governance.anomalyDetected) anomalies.push("governance_gate");
  if (args.profile.requiresCognitionStable && !balance.cognitionStable) anomalies.push("cognition_unstable");
  if (contradictions.contradictionCount >= 3) anomalies.push("contradiction_escalation");
  if (influence.intentDelta > args.profile.maxDelta) anomalies.push("delta_exceeded");
  if (intentConfidence < 0.3) anomalies.push("low_confidence");

  const intentScore = Math.min(
    100,
    Math.round(balance.balanceScore * 0.45 + intentConfidence * 35 + (100 - anomalies.length * 10) * 0.15)
  );

  return { signals, contradictions, balance, influence, intentScore, anomalies };
}
