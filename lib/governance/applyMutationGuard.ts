/**
 * Phase 3 — Global production ranking mutation hard-block (shadow-safe discipline).
 */

import { readNormalizationFlags } from "@/lib/intelligence/normalization/flags";
import { countRankingTopDrift, linksFromProducts } from "@/lib/governance/replayKernel";
import type { QuantProduct } from "@/lib/shoppingScore";

export type GlobalMutationPolicy = {
  production: boolean;
  controlledStackMutationBlocked: boolean;
  normalizationApplyBlocked: boolean;
  reason: string;
};

function parseAllow(raw: string | undefined): boolean {
  if (raw == null) return false;
  const v = raw.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

/** Resolve whether production may mutate ranking (default: never). */
export function resolveGlobalMutationPolicy(
  env: NodeJS.ProcessEnv = process.env
): GlobalMutationPolicy {
  const production = env.NODE_ENV === "production";
  const explicitAllow = parseAllow(env.QUANTAI_GOVERNANCE_PRODUCTION_MUTATION_ALLOW);
  const normFlags = readNormalizationFlags(env);
  const normApplyBlocked =
    production &&
    (normFlags.apply || parseAllow(env.QUANTAI_NORMALIZATION_APPLY)) &&
    !parseAllow(env.QUANTAI_NORMALIZATION_APPLY_PRODUCTION_CONFIRMED);

  if (!production) {
    return {
      production: false,
      controlledStackMutationBlocked: false,
      normalizationApplyBlocked: false,
      reason: "non_production",
    };
  }

  if (explicitAllow) {
    return {
      production: true,
      controlledStackMutationBlocked: false,
      normalizationApplyBlocked: normApplyBlocked,
      reason: "production_mutation_explicitly_allowed",
    };
  }

  return {
    production: true,
    controlledStackMutationBlocked: true,
    normalizationApplyBlocked: true,
    reason: "production_hard_block",
  };
}

/** Assert normalization cannot APPLY in production without double-confirm. */
export function assertNormalizationApplyBlocked(env: NodeJS.ProcessEnv = process.env): void {
  const policy = resolveGlobalMutationPolicy(env);
  const flags = readNormalizationFlags(env);
  if (policy.production && flags.apply && policy.normalizationApplyBlocked) {
    flags.apply = false;
  }
}

/**
 * Kernel-level invariant: rollback tray order if production hard-block sees drift.
 */
export function enforceControlledLayerRankingInvariant(args: {
  layerId: string;
  baseline: QuantProduct[];
  candidate: QuantProduct[];
  policy?: GlobalMutationPolicy;
}): { products: QuantProduct[]; rolledBack: boolean; drift: number; reason?: string } {
  const policy = args.policy ?? resolveGlobalMutationPolicy();
  if (!policy.controlledStackMutationBlocked) {
    return { products: args.candidate, rolledBack: false, drift: 0 };
  }

  const pre = linksFromProducts(args.baseline);
  const post = linksFromProducts(args.candidate);
  const drift = countRankingTopDrift(pre, post);
  if (drift > 0) {
    return {
      products: args.baseline,
      rolledBack: true,
      drift,
      reason: `production_mutation_hard_block:${args.layerId}`,
    };
  }
  return { products: args.candidate, rolledBack: false, drift: 0 };
}
