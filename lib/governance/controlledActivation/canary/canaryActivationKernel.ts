/**
 * Canary activation kernel — orchestrates gate + router.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { ControlledActivationFlags } from "../flags";
import type { ActivationDecision } from "../types";
import { evaluateDeterministicMutationGate } from "./deterministicMutationGate";
import { routeBoundedMutation } from "./boundedMutationRouter";

export function runCanaryActivationKernel(args: {
  flags: ControlledActivationFlags;
  sessionKey: string;
  query: string;
  category: string | null;
  products: QuantProduct[];
  cognitionConfidence01: number;
}): ActivationDecision {
  const gate = evaluateDeterministicMutationGate(args.flags);
  const route = routeBoundedMutation({
    flags: args.flags,
    sessionKey: args.sessionKey,
    query: args.query,
    category: args.category,
    products: args.products,
    cognitionConfidence01: args.cognitionConfidence01,
    gate,
  });

  return {
    inCanary: route.inCanary,
    mutationAllowed: route.inCanary ? "shadow_only" : false,
    routeReason: route.routeReason,
    trafficBucket: route.trafficBucket,
  };
}
