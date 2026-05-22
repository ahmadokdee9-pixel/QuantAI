/**
 * P6.1 — Intent cognition profile registry (query-derived only; no user profiling).
 */

import type { IntentCognitionMode } from "@/lib/intent/intentFlags";
import {
  INTENT_COGNITION_MAX_AESTHETIC_AMPLIFICATION,
  INTENT_COGNITION_MAX_DELTA,
  INTENT_COGNITION_MAX_READINESS_AMPLIFICATION,
  INTENT_COGNITION_MAX_TRUST_AMPLIFICATION,
} from "@/lib/intent/intentFlags";

export type IntentCognitionProfile = {
  id: IntentCognitionMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresCognitionStable: boolean;
  maxDelta: number;
  maxReadinessAmplification: number;
  maxTrustAmplification: number;
  maxAestheticAmplification: number;
};

export const INTENT_COGNITION_PROFILES: IntentCognitionProfile[] = [
  {
    id: "telemetry-only",
    description: "Intent cognition telemetry without ranking mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresCognitionStable: false,
    maxDelta: INTENT_COGNITION_MAX_DELTA,
    maxReadinessAmplification: INTENT_COGNITION_MAX_READINESS_AMPLIFICATION,
    maxTrustAmplification: INTENT_COGNITION_MAX_TRUST_AMPLIFICATION,
    maxAestheticAmplification: INTENT_COGNITION_MAX_AESTHETIC_AMPLIFICATION,
  },
  {
    id: "passive-intent",
    description: "Passive intent signals only.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresCognitionStable: false,
    maxDelta: INTENT_COGNITION_MAX_DELTA,
    maxReadinessAmplification: INTENT_COGNITION_MAX_READINESS_AMPLIFICATION,
    maxTrustAmplification: INTENT_COGNITION_MAX_TRUST_AMPLIFICATION,
    maxAestheticAmplification: INTENT_COGNITION_MAX_AESTHETIC_AMPLIFICATION,
  },
  {
    id: "shadow-intent",
    description: "Shadow intent deltas recorded; order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresCognitionStable: false,
    maxDelta: INTENT_COGNITION_MAX_DELTA,
    maxReadinessAmplification: INTENT_COGNITION_MAX_READINESS_AMPLIFICATION,
    maxTrustAmplification: INTENT_COGNITION_MAX_TRUST_AMPLIFICATION,
    maxAestheticAmplification: INTENT_COGNITION_MAX_AESTHETIC_AMPLIFICATION,
  },
  {
    id: "bounded-intent",
    description: "Bounded intent cognition ranking synthesis.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresCognitionStable: false,
    maxDelta: INTENT_COGNITION_MAX_DELTA,
    maxReadinessAmplification: INTENT_COGNITION_MAX_READINESS_AMPLIFICATION,
    maxTrustAmplification: INTENT_COGNITION_MAX_TRUST_AMPLIFICATION,
    maxAestheticAmplification: INTENT_COGNITION_MAX_AESTHETIC_AMPLIFICATION,
  },
  {
    id: "protected-intent",
    description: "Intent cognition with governance + cognition stability gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresCognitionStable: true,
    maxDelta: INTENT_COGNITION_MAX_DELTA,
    maxReadinessAmplification: INTENT_COGNITION_MAX_READINESS_AMPLIFICATION,
    maxTrustAmplification: INTENT_COGNITION_MAX_TRUST_AMPLIFICATION,
    maxAestheticAmplification: INTENT_COGNITION_MAX_AESTHETIC_AMPLIFICATION,
  },
  {
    id: "full-safe-intent",
    description: "Full intent cognition with replay integrity gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresCognitionStable: true,
    maxDelta: INTENT_COGNITION_MAX_DELTA,
    maxReadinessAmplification: INTENT_COGNITION_MAX_READINESS_AMPLIFICATION,
    maxTrustAmplification: INTENT_COGNITION_MAX_TRUST_AMPLIFICATION,
    maxAestheticAmplification: INTENT_COGNITION_MAX_AESTHETIC_AMPLIFICATION,
  },
];

export function resolveIntentCognitionProfile(mode: IntentCognitionMode): IntentCognitionProfile {
  return INTENT_COGNITION_PROFILES.find((p) => p.id === mode) ?? INTENT_COGNITION_PROFILES[0];
}
