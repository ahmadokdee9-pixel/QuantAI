/**
 * Commerce mutation auditor — false-collapse + trust integrity signals.
 */

import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { QuantProduct } from "@/lib/shoppingScore";

export type CommerceMutationAudit = {
  trustIntegrityOk: boolean;
  falseCollapseRisk01: number;
  fakeDiscountAlertOk: boolean;
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function auditCommerceMutation(args: {
  products: QuantProduct[];
  trustResult?: TrustEngineResult | null;
}): CommerceMutationAudit {
  const commerceIds = new Set(
    args.products.map((p) => p.qiNormalizedCommerce?.commerceId ?? p.link)
  );
  const falseCollapseRisk01 = round4(
    args.products.length > 0 ? 1 - commerceIds.size / args.products.length : 0
  );
  const fakeAlerts = args.trustResult?.meta.fakeDiscountAlertCount ?? 0;
  const fakeDiscountAlertOk = fakeAlerts <= 3;
  const trustIntegrityOk =
    (args.trustResult?.meta.avgTrustScore ?? 50) >= 40 && fakeDiscountAlertOk;

  return { trustIntegrityOk, falseCollapseRisk01, fakeDiscountAlertOk };
}
