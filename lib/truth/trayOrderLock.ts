/**
 * Phase A — Preserve tray link order while telemetry stages enrich listings.
 * Canonical rank is the only stage allowed to change final order.
 */

import type { QuantProduct } from "@/lib/shoppingScore";

export type TrayOrderLock = {
  reset: (next: QuantProduct[]) => void;
  preserve: (processed: QuantProduct[]) => QuantProduct[];
  baseline: () => QuantProduct[];
};

export function createTrayOrderLock(initial: QuantProduct[]): TrayOrderLock {
  let baseline = initial;

  return {
    reset(next: QuantProduct[]) {
      baseline = next;
    },
    preserve(processed: QuantProduct[]) {
      const byLink = new Map(processed.map((product) => [product.link, product]));
      return baseline
        .map((product) => byLink.get(product.link))
        .filter((product): product is QuantProduct => product != null);
    },
    baseline() {
      return baseline;
    },
  };
}
