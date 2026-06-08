/**
 * Phase 31 — Decision Brief Authority.
 * Plain-language WHY explanations from existing intelligence — no new scores.
 */

import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { ProductDimensionScore } from "@/lib/ui/universalProductIntelligenceEngine";
import type { UniversalProductIntelligenceSnapshot } from "@/lib/ui/universalProductDecision";
import type { TrayVerdictAuthorityRow } from "@/lib/ui/decisionAlignmentEngine";

export type DecisionBriefAuthority = {
  decisionThesis: string;
  primaryReason: string;
  secondaryReason: string;
  purchaseReasoning: string;
};

function clipLine(text: string, max = 160): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function topDimensions(dimensions: ProductDimensionScore[], count = 2): ProductDimensionScore[] {
  return [...dimensions].sort((a, b) => b.score - a.score).slice(0, count);
}

function weakestDimension(dimensions: ProductDimensionScore[]): ProductDimensionScore | null {
  if (!dimensions.length) return null;
  return [...dimensions].sort((a, b) => a.score - b.score)[0] ?? null;
}

function strongestLabel(dimensions: ProductDimensionScore[]): string {
  const lead = topDimensions(dimensions, 2);
  if (lead.length >= 2) return `${lead[0]!.label.toLowerCase()} and ${lead[1]!.label.toLowerCase()}`;
  if (lead[0]) return lead[0].label.toLowerCase();
  return "overall product quality";
}

function weakestLabel(dimensions: ProductDimensionScore[]): string {
  const weak = weakestDimension(dimensions);
  return weak?.label.toLowerCase() ?? "supporting specifications";
}

function valuePositionPlain(
  intelligence: UniversalProductIntelligenceSnapshot,
  dimensions: ProductDimensionScore[]
): string {
  const valueDim = dimensions.find((row) => row.key === "value");
  const score = valueDim?.score ?? intelligence.valueScore;
  if (score >= 62) return "leading tray value";
  if (score >= 50) return "acceptable tray value";
  return "weak tray value";
}

function competitivePressurePlain(pressure: number): string {
  if (pressure >= 65) return "heavy competitive pressure from similar listings";
  if (pressure >= 52) return "meaningful competitor pressure in this tray";
  if (pressure >= 40) return "moderate alternative pressure";
  return "limited competitive pressure";
}

function buildDecisionThesis(
  verdict: PrimaryVerdict,
  strongest: string,
  weakest: string,
  valuePlain: string,
  pressurePlain: string,
  authority?: TrayVerdictAuthorityRow
): string {
  if (verdict === "BUY READY") {
    if (authority?.rankIndex === 0) {
      return "This product currently delivers the strongest overall value-quality balance in the tray.";
    }
    return clipLine(
      `This product leads the tray on ${strongest} with ${valuePlain}, making it the best purchase opportunity now.`
    );
  }

  if (verdict === "COMPARE") {
    return clipLine(
      "This product performs well, but competing listings deliver similar capability with better value."
    );
  }

  if (verdict === "WAIT") {
    return clipLine(
      "The current price and feature profile do not justify purchase compared with nearby alternatives."
    );
  }

  return clipLine(
    `Significant weakness in ${weakest} and seller trust outweigh ${valuePlain} despite ${pressurePlain}.`
  );
}

/** Score-free WHY language for decision brief authority. */
export function resolveDecisionBriefAuthority(
  verdict: PrimaryVerdict,
  dimensions: ProductDimensionScore[],
  store: string,
  intelligence: UniversalProductIntelligenceSnapshot,
  authority?: TrayVerdictAuthorityRow
): DecisionBriefAuthority {
  const strongest = strongestLabel(dimensions);
  const weakest = weakestLabel(dimensions);
  const valuePlain = valuePositionPlain(intelligence, dimensions);
  const pressurePlain = competitivePressurePlain(intelligence.alternativePressure);
  const decisionThesis = buildDecisionThesis(
    verdict,
    strongest,
    weakest,
    valuePlain,
    pressurePlain,
    authority
  );

  let primaryReason = "";
  let purchaseReasoning = "";

  if (verdict === "BUY READY") {
    primaryReason = clipLine(
      `${store} is the best purchase opportunity now because ${strongest} lead this tray, ${valuePlain}, and ${pressurePlain} — no nearby listing offers a better overall checkout case.`
    );
    purchaseReasoning = clipLine(
      `Purchase now — strongest ${strongest}; weakest ${weakest}; ${valuePlain}; ${pressurePlain}.`,
      140
    );
  } else if (verdict === "COMPARE") {
    primaryReason = clipLine(
      `${store} cannot reach BUY READY because ${pressurePlain} — competitors match ${strongest} while beating this listing on ${weakest} and ${valuePlain}.`
    );
    purchaseReasoning = clipLine(
      `Compare options — strongest ${strongest}; weakest ${weakest}; ${valuePlain}; ${pressurePlain}.`,
      140
    );
  } else if (verdict === "WAIT") {
    const improvement =
      intelligence.valueScore < 52
        ? "better pricing or sharper value"
        : `stronger ${weakest}`;
    primaryReason = clipLine(
      `${store} should wait because ${weakest} and ${valuePlain} are not enough against ${pressurePlain} — ${improvement} would make this purchase attractive.`
    );
    purchaseReasoning = clipLine(
      `Wait to buy — strongest ${strongest}; weakest ${weakest}; ${valuePlain}; ${pressurePlain}.`,
      140
    );
  } else {
    primaryReason = clipLine(
      `${store} should be avoided because ${weakest} and seller trust concerns create unacceptable purchase risk despite ${strongest}.`
    );
    purchaseReasoning = clipLine(
      `Avoid purchase — strongest ${strongest}; weakest ${weakest}; ${valuePlain}; ${pressurePlain}.`,
      140
    );
  }

  const secondaryReason = clipLine(
    `Why this verdict: ${purchaseReasoning}`
  );

  return {
    decisionThesis,
    primaryReason,
    secondaryReason,
    purchaseReasoning,
  };
}

/** Validation — thesis and primary reason should not require numeric scores. */
export function isScoreFreeBriefLanguage(text: string): boolean {
  if (!text.trim()) return false;
  if (/\d+\s*\/\s*100/.test(text)) return false;
  if (/\b\d{2,}\b/.test(text)) return false;
  return true;
}

export function briefCoversRequiredElements(brief: DecisionBriefAuthority): boolean {
  const blob = `${brief.purchaseReasoning} ${brief.primaryReason} ${brief.decisionThesis}`.toLowerCase();
  const hasStrongest = blob.includes("strongest");
  const hasWeakest = blob.includes("weakest");
  const hasValue = blob.includes("value") || blob.includes("tray value");
  const hasPressure =
    blob.includes("pressure") || blob.includes("competitor") || blob.includes("competitive");
  const hasPurchase =
    blob.includes("purchase") ||
    blob.includes("checkout") ||
    blob.includes("compare") ||
    blob.includes("wait") ||
    blob.includes("avoid") ||
    blob.includes("opportunity");
  return hasStrongest && hasWeakest && hasValue && hasPressure && hasPurchase;
}
