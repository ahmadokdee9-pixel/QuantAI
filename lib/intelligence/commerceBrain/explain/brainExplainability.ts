/**
 * Phase 11 — Multi-layer brain explainability.
 */

import type { BrainExplainability } from "../types";
import type { BrainArbitrationVerdict } from "../types";
import type { TemporalTrustTasteFusion } from "../fusion/temporalTrustTasteFusion";
import type { LayerPriorityRank } from "../prioritize/commerceIntelligencePrioritization";
import type { SynthesizedRecommendation } from "../types";

export function buildBrainExplainability(args: {
  arbitration: BrainArbitrationVerdict;
  fusion: TemporalTrustTasteFusion;
  priorities: LayerPriorityRank[];
  synthesis: SynthesizedRecommendation;
  layerTraces: string[];
}): BrainExplainability {
  return {
    whyPrimaryLayer: [`primary_${args.arbitration.primaryLayer}`, `secondary_${args.arbitration.secondaryLayer}`],
    whyArbitration: [`score_${Math.round(args.arbitration.arbitrationScore01 * 100)}`],
    whyFusion: [args.fusion.fusionLabel],
    whyTrustWeight: [`trust_${Math.round(args.fusion.trustWeight01 * 100)}`],
    whyTasteWeight: [`taste_${Math.round(args.fusion.tasteWeight01 * 100)}`],
    whyTemporalWeight: [`temporal_${Math.round(args.fusion.temporalWeight01 * 100)}`],
    whySynthesis: [
      `syn_${args.synthesis.synthesisId}`,
      `influence_${Math.round(args.synthesis.maxInfluence01 * 100)}`,
    ],
    layerTraces: args.layerTraces.slice(0, 10),
  };
}
