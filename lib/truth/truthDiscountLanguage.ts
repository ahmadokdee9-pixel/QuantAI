/**
 * Phase 1D.5 — Qualified discount language (Phase 1A-safe display strings).
 */

import type { DiscountVerificationState } from "@/lib/truth/priceHistoryTypes";

export type TruthDiscountDisplayLabel =
  | "Evidence-backed discount signal"
  | "Possible discount signal"
  | "Unverified discount signal"
  | "No discount signal observed";

const STATE_TO_LABEL: Record<DiscountVerificationState, TruthDiscountDisplayLabel> = {
  VERIFIED_DISCOUNT: "Evidence-backed discount signal",
  POSSIBLE_DISCOUNT: "Possible discount signal",
  UNVERIFIED_DISCOUNT: "Unverified discount signal",
  NO_DISCOUNT: "No discount signal observed",
};

/** Map internal discount verification state to Phase 1A-safe user-facing label. */
export function mapDiscountVerificationStateToLabel(
  state: DiscountVerificationState | null | undefined
): TruthDiscountDisplayLabel {
  if (!state) return "No discount signal observed";
  return STATE_TO_LABEL[state];
}

/** Short evidence line for confidenceReason / reasoning (sanitized downstream). */
export function discountEvidenceLine(state: DiscountVerificationState | null | undefined): string {
  switch (state) {
    case "VERIFIED_DISCOUNT":
      return "Discount signal is supported by observed canonical SKU price history.";
    case "POSSIBLE_DISCOUNT":
      return "Possible discount versus recent observed reference — limited history.";
    case "UNVERIFIED_DISCOUNT":
      return "Marketing discount claim is not corroborated by observed price history.";
    case "NO_DISCOUNT":
    default:
      return "No material discount versus observed historical reference.";
  }
}
