/**
 * Phase 40 — Opportunity Score Interpretation.
 * Converts numeric scores into human meaning.
 */

export type OpportunityLabelBand =
  | "Poor Opportunity"
  | "Weak Opportunity"
  | "Fair Opportunity"
  | "Strong Opportunity"
  | "Exceptional Opportunity";

export type OpportunityLabel = {
  version: 1;
  score: number;
  band: OpportunityLabelBand;
  displayLine: string;
  shortLine: string;
};

function bandForScore(score: number): OpportunityLabelBand {
  if (score >= 81) return "Exceptional Opportunity";
  if (score >= 61) return "Strong Opportunity";
  if (score >= 41) return "Fair Opportunity";
  if (score >= 21) return "Weak Opportunity";
  return "Poor Opportunity";
}

/** Convert opportunity score to labeled human meaning. */
export function interpretOpportunityScore(score: number): OpportunityLabel {
  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  const band = bandForScore(normalized);

  return {
    version: 1,
    score: normalized,
    band,
    displayLine: `Opportunity Score ${normalized} / 100 — ${band}`,
    shortLine: `${normalized} / 100 · ${band}`,
  };
}

export function isStrongOpportunity(label: OpportunityLabel): boolean {
  return label.score >= 61;
}

export function isWeakOpportunity(label: OpportunityLabel): boolean {
  return label.score <= 40;
}
