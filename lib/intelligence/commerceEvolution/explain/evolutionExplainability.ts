/**
 * Phase 10 — Evolution explainability (meta-only).
 */

import type { EvolutionExplainability } from "../types";
import type { SeasonalEvolutionProfile } from "../types";
import type { CommerceLifecycleProfile } from "../types";
import type { IntentTransitionSnapshot } from "../types";
import type { EvolvingTasteProfile } from "../types";
import type { TemporalReasoningResult } from "../temporal/temporalRecommendationReasoning";

export function buildEvolutionExplainability(args: {
  seasonal: SeasonalEvolutionProfile;
  lifecycle: CommerceLifecycleProfile;
  intentTransition: IntentTransitionSnapshot;
  tasteEvolution: EvolvingTasteProfile;
  temporal: TemporalReasoningResult;
  timingLabel: string;
}): EvolutionExplainability {
  const whySeasonalShift: string[] = [];
  const whyLifecyclePhase: string[] = [`phase_${args.lifecycle.phase}`];
  const whyIntentTransition: string[] = [
    `from_${args.intentTransition.fromIntent}_to_${args.intentTransition.toIntent}`,
  ];
  const whyReplacementCycle: string[] = [];
  const whyTasteEvolution: string[] = [];
  const whyMarketTiming: string[] = [`timing_${args.timingLabel}`];
  const whyLongHorizonAdaptation: string[] = [];

  if (args.seasonal.holidayProximity01 >= 0.4) whySeasonalShift.push("holiday_proximity");
  if (args.seasonal.launchWindow01 >= 0.4) whySeasonalShift.push("launch_window");
  if (args.lifecycle.replacementCycle01 >= 0.45) whyReplacementCycle.push("replacement_cycle_signal");
  if (args.tasteEvolution.tasteDrift01 >= 0.4) whyTasteEvolution.push("taste_drift_detected");
  for (const r of args.temporal.reasoningChain) whyLongHorizonAdaptation.push(r);

  return {
    whySeasonalShift: whySeasonalShift.slice(0, 5),
    whyLifecyclePhase: whyLifecyclePhase.slice(0, 5),
    whyIntentTransition: whyIntentTransition.slice(0, 5),
    whyReplacementCycle: whyReplacementCycle.slice(0, 5),
    whyTasteEvolution: whyTasteEvolution.slice(0, 5),
    whyMarketTiming: whyMarketTiming.slice(0, 5),
    whyLongHorizonAdaptation: whyLongHorizonAdaptation.slice(0, 6),
  };
}
