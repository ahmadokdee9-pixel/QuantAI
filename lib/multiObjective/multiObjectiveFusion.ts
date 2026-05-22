/**
 * P6.2 — Unified multi-objective commerce state synthesis.
 */

import type { AestheticObjective } from "@/lib/multiObjective/multiObjectiveAesthetics";
import type { ConversionObjective } from "@/lib/multiObjective/multiObjectiveConversion";
import type { IntentObjective } from "@/lib/multiObjective/multiObjectiveIntent";
import type { PriceObjective } from "@/lib/multiObjective/multiObjectivePrice";
import type { QualityObjective } from "@/lib/multiObjective/multiObjectiveQuality";
import type { StabilityObjective } from "@/lib/multiObjective/multiObjectiveStability";
import type { TrustObjective } from "@/lib/multiObjective/multiObjectiveTrust";
import type { ValueObjective } from "@/lib/multiObjective/multiObjectiveValue";

export type UnifiedMultiObjectiveState = {
  qualityObjective: number;
  priceObjective: number;
  trustObjective: number;
  valueObjective: number;
  intentObjective: number;
  aestheticObjective: number;
  stabilityObjective: number;
  conversionObjective: number;
  objectiveBalance: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function synthesizeUnifiedMultiObjectiveState(args: {
  quality: QualityObjective;
  price: PriceObjective;
  trust: TrustObjective;
  value: ValueObjective;
  intent: IntentObjective;
  aesthetic: AestheticObjective;
  stability: StabilityObjective;
  conversion: ConversionObjective;
}): UnifiedMultiObjectiveState {
  const objectives = [
    args.quality.qualityObjective,
    args.price.priceObjective,
    args.trust.trustObjective,
    args.value.valueObjective,
    args.intent.intentObjective,
    args.aesthetic.aestheticObjective,
    args.stability.stabilityObjective,
    args.conversion.conversionObjective,
  ];
  const mean = objectives.reduce((s, v) => s + v, 0) / objectives.length;
  const variance = objectives.reduce((s, v) => s + (v - mean) ** 2, 0) / objectives.length;
  const objectiveBalance = round3(clamp(1 - Math.sqrt(variance), 0, 1));

  return {
    qualityObjective: args.quality.qualityObjective,
    priceObjective: args.price.priceObjective,
    trustObjective: args.trust.trustObjective,
    valueObjective: args.value.valueObjective,
    intentObjective: args.intent.intentObjective,
    aestheticObjective: args.aesthetic.aestheticObjective,
    stabilityObjective: args.stability.stabilityObjective,
    conversionObjective: args.conversion.conversionObjective,
    objectiveBalance,
  };
}
