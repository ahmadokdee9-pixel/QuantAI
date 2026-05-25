/**
 * Phase 11 — Unified reasoning kernel.
 */

import type { CommerceBrainInput } from "../types";
import { fuseCrossIntelligenceSignals } from "../fusion/crossIntelligenceSignalFusion";
import { fuseTemporalTrustTaste } from "../fusion/temporalTrustTasteFusion";
import { arbitrateIntelligence } from "../arbitration/deterministicIntelligenceArbitration";
import { buildUnifiedCommerceDecisionGraph } from "../graph/unifiedCommerceDecisionGraph";
import { prioritizeCommerceIntelligence } from "../prioritize/commerceIntelligencePrioritization";
import { synthesizeDeterministicRecommendation } from "../synthesis/deterministicRecommendationSynthesis";
import { evaluateBrainOrchestrationBoundaries } from "../governance/brainOrchestrationBoundaries";
import { buildBrainExplainability } from "../explain/brainExplainability";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export type UnifiedReasoningKernelResult = {
  fusedSignals: ReturnType<typeof fuseCrossIntelligenceSignals>;
  fusion: ReturnType<typeof fuseTemporalTrustTaste>;
  arbitration: ReturnType<typeof arbitrateIntelligence>;
  decisionGraph: ReturnType<typeof buildUnifiedCommerceDecisionGraph>;
  priorities: ReturnType<typeof prioritizeCommerceIntelligence>;
  synthesis: ReturnType<typeof synthesizeDeterministicRecommendation>;
  governance: ReturnType<typeof evaluateBrainOrchestrationBoundaries>;
  explain: ReturnType<typeof buildBrainExplainability>;
  brainConfidence01: number;
};

export function runUnifiedReasoningKernel(
  input: CommerceBrainInput,
  maxInfluence01: number
): UnifiedReasoningKernelResult {
  const fusedSignals = fuseCrossIntelligenceSignals(input);
  const fusion = fuseTemporalTrustTaste(input);
  const arbitration = arbitrateIntelligence(fusedSignals);
  const decisionGraph = buildUnifiedCommerceDecisionGraph({ signals: fusedSignals, arbitration });
  const priorities = prioritizeCommerceIntelligence(arbitration.primaryLayer, arbitration.secondaryLayer);

  const brainConfidence01 = round4(
    clamp01(
      fusion.fusedScore01 * 0.35 +
        arbitration.arbitrationScore01 * 0.35 +
        (fusedSignals.length / 12) * 0.15 +
        (input.trust?.meta.enabled ? 0.15 : 0.05)
    )
  );

  const governance = evaluateBrainOrchestrationBoundaries(input, brainConfidence01);
  const synthesis = synthesizeDeterministicRecommendation({
    input,
    arbitration,
    fusion,
    brainConfidence01,
    maxInfluence01,
    governanceAllowed: governance.allowed,
  });

  const layerTraces = fusedSignals.map((s) => `${s.layer}:${s.signalId}:${s.weight01}`);
  const explain = buildBrainExplainability({
    arbitration,
    fusion,
    priorities,
    synthesis,
    layerTraces,
  });

  return {
    fusedSignals,
    fusion,
    arbitration,
    decisionGraph,
    priorities,
    synthesis,
    governance,
    explain,
    brainConfidence01,
  };
}
