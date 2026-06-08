/**
 * Phase 27.3 — Alternative Dominance Authority.
 * Dominant alternatives suppress buy-ready calls and dampen confidence.
 */

import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { ProductDifferentiationProfile } from "@/lib/ui/productDifferentiationEngine";

export type DominanceTrayRow = {
  link: string;
  profile: ProductDifferentiationProfile;
  confidence: number;
  verdict: PrimaryVerdict;
};

export type AlternativeDominanceAdjustment = {
  dominancePenalty: number;
  suppressBuyReady: boolean;
  preferWait: boolean;
  allowCompare: boolean;
  dominantLink: string | null;
  gapFromLeader: number;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Per-product dominance relative to tray leader authority. */
export function resolveAlternativeDominance(
  rows: DominanceTrayRow[],
  selfLink: string
): AlternativeDominanceAdjustment {
  const ranked = [...rows].sort((a, b) => b.profile.buyerAuthority - a.profile.buyerAuthority);
  const leader = ranked[0];
  const self = rows.find((row) => row.link === selfLink);
  if (!leader || !self) {
    return {
      dominancePenalty: 0,
      suppressBuyReady: false,
      preferWait: false,
      allowCompare: false,
      dominantLink: null,
      gapFromLeader: 0,
    };
  }

  const gap = Math.max(0, leader.profile.buyerAuthority - self.profile.buyerAuthority);
  const confidenceGap = Math.max(0, leader.confidence - self.confidence);
  const clearlyDominates = gap >= 14 || confidenceGap >= 16;
  const genuinelyClose =
    gap < 8 &&
    confidenceGap < 10 &&
    Math.abs(self.profile.opportunityScore - leader.profile.opportunityScore) < 14;

  return {
    dominancePenalty: clampScore(gap * 0.85 + confidenceGap * 0.35),
    suppressBuyReady: clearlyDominates && self.link !== leader.link,
    preferWait: clearlyDominates && gap >= 10,
    allowCompare: genuinelyClose && self.link !== leader.link,
    dominantLink: leader.link,
    gapFromLeader: gap,
  };
}
