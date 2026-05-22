/**
 * P6.3 — Adaptive strategic ranking profile registry.
 */

import type { AdaptiveStrategicRankingMode } from "@/lib/strategicRanking/strategicRankingFlags";
import {
  STRATEGIC_RANKING_MAX_AESTHETIC_AMPLIFICATION,
  STRATEGIC_RANKING_MAX_CONVERSION_AMPLIFICATION,
  STRATEGIC_RANKING_MAX_DELTA,
  STRATEGIC_RANKING_MAX_TRUST_AMPLIFICATION,
} from "@/lib/strategicRanking/strategicRankingFlags";

export type AdaptiveStrategicRankingProfile = {
  id: AdaptiveStrategicRankingMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresMultiObjectiveStable: boolean;
  maxDelta: number;
  maxTrustAmplification: number;
  maxConversionAmplification: number;
  maxAestheticAmplification: number;
};

export const ADAPTIVE_STRATEGIC_RANKING_PROFILES: AdaptiveStrategicRankingProfile[] = [
  {
    id: "telemetry-only",
    description: "Strategic ranking telemetry without order mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresMultiObjectiveStable: false,
    maxDelta: STRATEGIC_RANKING_MAX_DELTA,
    maxTrustAmplification: STRATEGIC_RANKING_MAX_TRUST_AMPLIFICATION,
    maxConversionAmplification: STRATEGIC_RANKING_MAX_CONVERSION_AMPLIFICATION,
    maxAestheticAmplification: STRATEGIC_RANKING_MAX_AESTHETIC_AMPLIFICATION,
  },
  {
    id: "passive-strategic",
    description: "Passive strategic balance signals only.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresMultiObjectiveStable: false,
    maxDelta: STRATEGIC_RANKING_MAX_DELTA,
    maxTrustAmplification: STRATEGIC_RANKING_MAX_TRUST_AMPLIFICATION,
    maxConversionAmplification: STRATEGIC_RANKING_MAX_CONVERSION_AMPLIFICATION,
    maxAestheticAmplification: STRATEGIC_RANKING_MAX_AESTHETIC_AMPLIFICATION,
  },
  {
    id: "shadow-strategic",
    description: "Shadow strategic deltas recorded; order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresMultiObjectiveStable: false,
    maxDelta: STRATEGIC_RANKING_MAX_DELTA,
    maxTrustAmplification: STRATEGIC_RANKING_MAX_TRUST_AMPLIFICATION,
    maxConversionAmplification: STRATEGIC_RANKING_MAX_CONVERSION_AMPLIFICATION,
    maxAestheticAmplification: STRATEGIC_RANKING_MAX_AESTHETIC_AMPLIFICATION,
  },
  {
    id: "bounded-strategic",
    description: "Bounded adaptive strategic ranking synthesis.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresMultiObjectiveStable: false,
    maxDelta: STRATEGIC_RANKING_MAX_DELTA,
    maxTrustAmplification: STRATEGIC_RANKING_MAX_TRUST_AMPLIFICATION,
    maxConversionAmplification: STRATEGIC_RANKING_MAX_CONVERSION_AMPLIFICATION,
    maxAestheticAmplification: STRATEGIC_RANKING_MAX_AESTHETIC_AMPLIFICATION,
  },
  {
    id: "protected-strategic",
    description: "Strategic ranking with governance + multi-objective stability gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresMultiObjectiveStable: true,
    maxDelta: STRATEGIC_RANKING_MAX_DELTA,
    maxTrustAmplification: STRATEGIC_RANKING_MAX_TRUST_AMPLIFICATION,
    maxConversionAmplification: STRATEGIC_RANKING_MAX_CONVERSION_AMPLIFICATION,
    maxAestheticAmplification: STRATEGIC_RANKING_MAX_AESTHETIC_AMPLIFICATION,
  },
  {
    id: "full-safe-strategic",
    description: "Full strategic ranking with replay integrity gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresMultiObjectiveStable: true,
    maxDelta: STRATEGIC_RANKING_MAX_DELTA,
    maxTrustAmplification: STRATEGIC_RANKING_MAX_TRUST_AMPLIFICATION,
    maxConversionAmplification: STRATEGIC_RANKING_MAX_CONVERSION_AMPLIFICATION,
    maxAestheticAmplification: STRATEGIC_RANKING_MAX_AESTHETIC_AMPLIFICATION,
  },
];

export function resolveAdaptiveStrategicRankingProfile(mode: AdaptiveStrategicRankingMode): AdaptiveStrategicRankingProfile {
  return ADAPTIVE_STRATEGIC_RANKING_PROFILES.find((p) => p.id === mode) ?? ADAPTIVE_STRATEGIC_RANKING_PROFILES[0];
}
