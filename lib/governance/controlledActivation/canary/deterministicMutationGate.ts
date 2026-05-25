/**
 * Deterministic mutation gate — hard-block global APPLY and emergency disable.
 */

import type { ControlledActivationFlags } from "../flags";
import { resolveGlobalMutationPolicy } from "@/lib/governance/applyMutationGuard";

export type MutationGateVerdict = {
  gateOpen: boolean;
  shadowOnly: true;
  globalApplyBlocked: boolean;
  reason: string;
};

export function evaluateDeterministicMutationGate(
  flags: ControlledActivationFlags,
  env: NodeJS.ProcessEnv = process.env
): MutationGateVerdict {
  const policy = resolveGlobalMutationPolicy(env);

  if (flags.emergencyDisable) {
    return {
      gateOpen: false,
      shadowOnly: true,
      globalApplyBlocked: true,
      reason: "emergency_disable",
    };
  }

  if (policy.controlledStackMutationBlocked || policy.normalizationApplyBlocked) {
    return {
      gateOpen: false,
      shadowOnly: true,
      globalApplyBlocked: true,
      reason: policy.reason,
    };
  }

  if (flags.canaryPercent <= 0) {
    return {
      gateOpen: false,
      shadowOnly: true,
      globalApplyBlocked: true,
      reason: "canary_percent_zero",
    };
  }

  return {
    gateOpen: true,
    shadowOnly: true,
    globalApplyBlocked: true,
    reason: "canary_shadow_only",
  };
}
