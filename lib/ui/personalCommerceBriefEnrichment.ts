/**
 * Phase 35 — Personal Commerce Brief Enrichment.
 * Enriches existing decision brief slots — no card redesign.
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { PersonalBuyerIdentity } from "@/lib/intelligence/personalBuyerIdentityEngine";
import type { PersonalTasteProfile } from "@/lib/intelligence/personalTasteIntelligenceEngine";

export type PersonalCommerceBriefFields = {
  detectedBuyer: string;
  detectedTaste: string;
  buyerMatchPct: number;
  tasteMatchPct: number;
};

export function buildPersonalCommerceBriefFields(args: {
  buyer: PersonalBuyerIdentity;
  taste: PersonalTasteProfile;
  buyerMatchPct: number;
  tasteMatchPct: number;
}): PersonalCommerceBriefFields {
  return {
    detectedBuyer: args.buyer.buyerIdentity,
    detectedTaste: args.taste.detectedTaste,
    buyerMatchPct: Math.round(args.buyerMatchPct),
    tasteMatchPct: Math.round(args.tasteMatchPct),
  };
}

export function enrichDecisionBriefWithPersonalCommerce(
  brief: DecisionBriefDTO | null,
  fields: PersonalCommerceBriefFields
): DecisionBriefDTO | null {
  if (!brief) return null;

  const personalLines = [
    `Detected Buyer: ${fields.detectedBuyer}`,
    `Detected Taste: ${fields.detectedTaste}`,
    `Buyer Match: ${fields.buyerMatchPct}%`,
    `Taste Match: ${fields.tasteMatchPct}%`,
  ];

  return {
    ...brief,
    personalCommerce: fields,
    topSignals: [...personalLines, ...(brief.topSignals ?? brief.keyReasons ?? [])].slice(0, 6),
    explanation: brief.explanation
      ? `${brief.explanation} ${personalLines.join(" · ")}`
      : personalLines.join(" · "),
  };
}

export function personalCommerceBriefLines(fields: PersonalCommerceBriefFields): string[] {
  return [
    `Detected Buyer: ${fields.detectedBuyer}`,
    `Detected Taste: ${fields.detectedTaste}`,
    `Buyer Match: ${fields.buyerMatchPct}%`,
    `Taste Match: ${fields.tasteMatchPct}%`,
  ];
}
