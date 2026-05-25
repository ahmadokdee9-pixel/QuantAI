/**
 * Bounded mutation router — category / merchant / confidence scoped canary.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { ControlledActivationFlags } from "../flags";
import { allocateTrafficBucket, isInCanaryBucket } from "./activationTrafficAllocator";
import type { MutationGateVerdict } from "./deterministicMutationGate";

export type BoundedMutationRoute = {
  inCanary: boolean;
  trafficBucket: number;
  routeReason: string;
  categoryMatch: boolean;
  merchantMatch: boolean;
  confidenceOk: boolean;
};

export function routeBoundedMutation(args: {
  flags: ControlledActivationFlags;
  sessionKey: string;
  query: string;
  category: string | null;
  products: QuantProduct[];
  cognitionConfidence01: number;
  gate: MutationGateVerdict;
}): BoundedMutationRoute {
  const bucket = allocateTrafficBucket(args.sessionKey);
  const inBucket = isInCanaryBucket(bucket, args.flags.canaryPercent);

  const categoryMatch =
    !args.flags.categoryScope ||
    (args.category ?? "general").toLowerCase() === args.flags.categoryScope.toLowerCase();

  const merchantScope = args.flags.merchantScope?.toLowerCase();
  const merchantMatch =
    !merchantScope ||
    args.products.some((p) => p.store.trim().toLowerCase().includes(merchantScope));

  const confidenceOk = args.cognitionConfidence01 >= args.flags.confidenceMin01;

  let inCanary =
    args.gate.gateOpen && inBucket && categoryMatch && merchantMatch && confidenceOk;

  let routeReason = "not_in_canary";
  if (!args.gate.gateOpen) routeReason = args.gate.reason;
  else if (!inBucket) routeReason = "traffic_bucket_excluded";
  else if (!categoryMatch) routeReason = "category_scope_mismatch";
  else if (!merchantMatch) routeReason = "merchant_scope_mismatch";
  else if (!confidenceOk) routeReason = "confidence_below_threshold";
  else {
    routeReason = "canary_eligible_shadow_only";
    inCanary = true;
  }

  return {
    inCanary,
    trafficBucket: bucket,
    routeReason,
    categoryMatch,
    merchantMatch,
    confidenceOk,
  };
}
