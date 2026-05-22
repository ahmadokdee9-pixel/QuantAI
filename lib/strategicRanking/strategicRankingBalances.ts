/**
 * P6.3 — Strategic balance pairs (trust/value, premium/affordability, conversion/stability, aesthetic/practicality).
 */

import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";

export type StrategicBalancePairs = {
  trustValueBalance: number;
  premiumAffordabilityBalance: number;
  conversionStabilityBalance: number;
  aestheticPracticalityBalance: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function pairBalance(a: number, b: number): number {
  return round3(clamp(1 - Math.abs(a - b), 0, 1));
}

export function computeStrategicBalancePairs(args: {
  multiObjective: MultiObjectiveCommerceMeta;
  intent: IntentCognitionMeta;
}): StrategicBalancePairs {
  const { multiObjective, intent } = args;
  const trust = multiObjective.trustObjective ?? 0;
  const value = multiObjective.valueObjective ?? 0;
  const price = multiObjective.priceObjective ?? 0;
  const premium = intent.premiumIntent ?? 0;
  const conversion = multiObjective.conversionObjective ?? 0;
  const stability = multiObjective.stabilityObjective ?? 0;
  const aesthetic = multiObjective.aestheticObjective ?? 0;
  const practicality = clamp(
    (multiObjective.qualityObjective ?? 0) * 0.45 + value * 0.35 + (1 - aesthetic) * 0.2,
    0,
    1
  );

  return {
    trustValueBalance: pairBalance(trust, value),
    premiumAffordabilityBalance: pairBalance(premium, price),
    conversionStabilityBalance: pairBalance(conversion, stability),
    aestheticPracticalityBalance: pairBalance(aesthetic, practicality),
  };
}
