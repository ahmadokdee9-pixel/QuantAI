/**
 * Phase 35 — Memory-Ready Preference Layer.
 * Architecture-only interfaces — no persistence, no user accounts.
 */

import type { PersonalBuyerIdentity } from "@/lib/intelligence/personalBuyerIdentityEngine";
import type { PersonalTasteProfile } from "@/lib/intelligence/personalTasteIntelligenceEngine";

export type PreferenceVector = {
  version: 0;
  brandAffinity: Record<string, number>;
  budgetMin: number | null;
  budgetMax: number | null;
  styleAxes: Record<string, number>;
  buyerTypeWeights: Record<string, number>;
};

export type PreferenceSignal = {
  kind: "click" | "save" | "dismiss" | "query" | "verdict_accept";
  query: string;
  productLink?: string;
  buyerIdentity?: string;
  taste?: string;
  timestamp?: number;
};

export type PreferenceProfile = {
  version: 0;
  vector: PreferenceVector;
  inferredBuyerLean: string | null;
  inferredTasteLean: string | null;
  signalCount: number;
};

/** Capture session preference signal — stub, no persistence. */
export function capturePreferenceSignal(signal: PreferenceSignal): void {
  void signal;
}

/** Infer preference profile from accumulated signals — stub returns neutral profile. */
export function inferPreferenceProfile(_signals: PreferenceSignal[] = []): PreferenceProfile {
  return {
    version: 0,
    vector: {
      version: 0,
      brandAffinity: {},
      budgetMin: null,
      budgetMax: null,
      styleAxes: {},
      buyerTypeWeights: {},
    },
    inferredBuyerLean: null,
    inferredTasteLean: null,
    signalCount: 0,
  };
}

/** Update in-memory preference vector — stub, no persistence. */
export function updatePreferenceVector(
  vector: PreferenceVector,
  signal: PreferenceSignal
): PreferenceVector {
  const next = { ...vector, brandAffinity: { ...vector.brandAffinity }, styleAxes: { ...vector.styleAxes } };
  if (signal.taste) {
    next.styleAxes[signal.taste] = (next.styleAxes[signal.taste] ?? 0) + 0.1;
  }
  if (signal.buyerIdentity) {
    next.buyerTypeWeights[signal.buyerIdentity] = (next.buyerTypeWeights[signal.buyerIdentity] ?? 0) + 0.1;
  }
  return next;
}

/** Merge inferred preference profile with live query signals — no persistence. */
export function mergePreferenceWithQuery(args: {
  profile: PreferenceProfile;
  buyer: PersonalBuyerIdentity;
  taste: PersonalTasteProfile;
}): { buyer: PersonalBuyerIdentity; taste: PersonalTasteProfile } {
  return { buyer: args.buyer, taste: args.taste };
}
