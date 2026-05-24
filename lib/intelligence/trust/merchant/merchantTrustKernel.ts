/**
 * Phase 5 — Merchant trust kernel (authoritative merchant truth layer).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { MerchantTrustProfile } from "../types";
import { buildMerchantReputationGraph } from "./merchantReputationGraph";

export type MerchantTrustKernelResult = {
  profiles: Record<string, MerchantTrustProfile>;
  graph: ReturnType<typeof buildMerchantReputationGraph>;
};

export function runMerchantTrustKernel(products: QuantProduct[]): MerchantTrustKernelResult {
  const graph = buildMerchantReputationGraph(products);
  const profiles: Record<string, MerchantTrustProfile> = {};
  for (const node of graph.nodes) {
    profiles[node.storeKey] = node;
  }
  return { profiles, graph };
}
