/**
 * Controlled activation infrastructure types (canary-only, no global APPLY).
 */

import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";
import type { RecommendationCognitionResult } from "@/lib/intelligence/recommendationCognition/types";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { QuantProduct } from "@/lib/shoppingScore";

export const CONTROLLED_ACTIVATION_VERSION = "activation.1";

export type CanaryActivationScope = {
  trafficPercent: number;
  categoryScope: string | null;
  merchantScope: string | null;
  confidenceMin01: number;
  emergencyDisabled: boolean;
};

export type ActivationDecision = {
  inCanary: boolean;
  mutationAllowed: false | "shadow_only";
  routeReason: string;
  trafficBucket: number;
};

export type MutationGovernanceVerdict = {
  approved: boolean;
  shadowOnly: true;
  blockedReasons: string[];
  checks: Record<string, boolean>;
  confidence01: number;
};

export type ShadowRecommendationMutation = {
  prepared: boolean;
  candidateCount: number;
  maxInfluence01: number;
  rankingMutation: false;
  applyContractVersion: string;
};

export type RollbackSnapshot = {
  frozen: boolean;
  restoreId: string;
  preMutationLinks: string[];
  replayFingerprint: string;
};

export type ControlledActivationMeta = {
  version: string;
  enabled: boolean;
  shadowOnly: true;
  globalApplyBlocked: true;
  inCanary: boolean;
  mutationApproved: boolean;
  governanceConfidence: number;
  emergencyDisabled: boolean;
  latencyMs: number;
};

export type ControlledActivationResult = {
  products: QuantProduct[];
  meta: ControlledActivationMeta;
  activation: ActivationDecision;
  governance: MutationGovernanceVerdict;
  shadowMutation: ShadowRecommendationMutation;
  rollback: RollbackSnapshot;
  replayFingerprint: string;
};

export type ControlledActivationInput = {
  products: QuantProduct[];
  query: string;
  sessionKey: string;
  category?: string | null;
  preMutationLinks: string[];
  trustResult?: TrustEngineResult | null;
  memoryResult?: CommerceMemoryResult | null;
  recommendationResult?: RecommendationCognitionResult | null;
  commerceOsResult?: AutonomousCommerceOsResult | null;
  latencyBudgetOk?: boolean;
};
