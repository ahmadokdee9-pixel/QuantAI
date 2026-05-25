/**
 * Emergency rollback kernel — instant restore + freeze on governance failure.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { MutationGovernanceVerdict } from "../types";
import type { RollbackSnapshot } from "../types";
import { restoreProductOrder, buildRestoreId } from "./deterministicStateRestore";
import { getCognitionFreezeState, setCognitionFreeze } from "./cognitionFreezeController";
import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export type EmergencyRollbackResult = {
  products: QuantProduct[];
  rollback: RollbackSnapshot;
  rolledBack: boolean;
};

export function runEmergencyRollbackKernel(args: {
  products: QuantProduct[];
  preMutationLinks: string[];
  governance: MutationGovernanceVerdict;
  stackFingerprint: string;
  forceRollback?: boolean;
}): EmergencyRollbackResult {
  const freeze = getCognitionFreezeState();
  const shouldRollback =
    args.forceRollback ||
    freeze.frozen ||
    (!args.governance.approved && args.governance.blockedReasons.length > 0);

  if (shouldRollback && !freeze.frozen) {
    setCognitionFreeze(true, "governance_failure_or_forced");
  }

  const rolledBack = shouldRollback;
  const products = rolledBack
    ? restoreProductOrder(args.products, args.preMutationLinks)
    : args.products;

  return {
    products,
    rolledBack,
    rollback: {
      frozen: freeze.frozen || rolledBack,
      restoreId: buildRestoreId(args.preMutationLinks),
      preMutationLinks: args.preMutationLinks.slice(0, 12),
      replayFingerprint: fnv1aHex(`${args.stackFingerprint}~${rolledBack}`),
    },
  };
}
